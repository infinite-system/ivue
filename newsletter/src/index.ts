// ivue newsletter Worker.
//
// The whole design is one invariant: at most one email per (subscriber,
// post), ever. The D1 `sends` table IS the invariant; the daily cron and
// the ad-hoc /broadcast endpoint are just two writers of the same ledger,
// so neither can repeat what the other already delivered.
//
// D1 is the audience layer (subscribers + unsubscribes + ledger);
// Postmark is delivery only — broadcast message stream, batch API.
//
//   POST /subscribe     {name, email, turnstileToken} — site form → D1
//   GET  /unsubscribe   ?email=&token=        — HMAC-signed one-click out
//   POST /broadcast     {slug}  (Bearer ADMIN_SECRET) — send a post NOW
//   POST /drip          (Bearer ADMIN_SECRET) — run a drip pass on demand
//   cron daily                                — each due subscriber gets
//                                               their oldest unsent post

const POSTMARK_BATCH = 'https://api.postmarkapp.com/email/batch';
const TURNSTILE_SITEVERIFY =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ACTION = 'newsletter';

// Postmark accepts up to 500 messages per batch call; batching keeps
// subrequests far under the Workers free-plan cap (50/invocation).
const SEND_BATCH = 500;

interface Post {
  slug: string;
  title: string;
  description: string;
  url: string;
  date: string | null;
  timestamp: number;
}

interface Subscriber {
  email: string;
  name: string;
}

interface PostmarkOutcome {
  ErrorCode: number;
  Message: string;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS')
      return withCors(new Response(null, { status: 204 }), env);
    try {
      if (url.pathname === '/subscribe' && request.method === 'POST')
        return withCors(await subscribe(request, env), env);
      if (url.pathname === '/unsubscribe' && request.method === 'GET')
        return unsubscribe(url, env);
      if (url.pathname === '/broadcast' && request.method === 'POST')
        return broadcast(request, env);
      if (url.pathname === '/drip' && request.method === 'POST')
        return drip(request, env);
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'unhandled_error',
          path: url.pathname,
          error: String(error),
        }),
      );
      return withCors(
        json({ error: 'Something went wrong — try again in a minute.' }, 500),
        env,
      );
    }
  },

  async scheduled(_event, env, context): Promise<void> {
    context.waitUntil(runDrip(env));
  },
} satisfies ExportedHandler<Env>;

// ---------------------------------------------------------------- subscribe

async function subscribe(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    turnstileToken?: string;
  };
  const address = String(body.email ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
    return json({ error: 'That email address does not look right.' }, 400);

  // Bot gate — enforced as soon as TURNSTILE_SECRET is set; the form
  // sends the widget token as turnstileToken. Fails closed.
  if (env.TURNSTILE_SECRET) {
    const human = await verifyTurnstile(
      body.turnstileToken,
      request.headers.get('CF-Connecting-IP'),
      env,
    );
    if (!human) return json({ error: 'Verification failed — try again.' }, 403);
  }

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO subscribers (email, name, subscribed_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(email) DO UPDATE SET name = excluded.name',
    ).bind(address, String(body.name ?? '').trim().slice(0, 80), nowSeconds()),
    // a returning subscriber cancels any previous unsubscribe
    env.DB.prepare('DELETE FROM unsubscribes WHERE email = ?').bind(address),
  ]);
  return json({ ok: true });
}

async function verifyTurnstile(
  token: string | undefined,
  clientIp: string | null,
  env: Env,
): Promise<boolean> {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048)
    return false;
  const expectedHostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );
  if (expectedHostnames.size === 0) return false;
  try {
    const response = await fetch(TURNSTILE_SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        // trim: a stray newline from `secret put` malforms the request
        secret: (env.TURNSTILE_SECRET ?? '').trim(),
        response: token.trim(),
        ...(clientIp ? { remoteip: clientIp } : {}),
      }),
    });
    if (!response.ok)
      throw new Error(
        `siteverify ${response.status}: ${(await response.text()).slice(0, 300)}`,
      );
    const result = (await response.json()) as {
      success: boolean;
      action?: string;
      hostname?: string;
      'error-codes'?: string[];
    };
    const verdict =
      result.success &&
      result.action === TURNSTILE_ACTION &&
      expectedHostnames.has(result.hostname ?? '');
    if (!verdict) {
      console.error(
        JSON.stringify({
          event: 'turnstile_rejected',
          success: result.success,
          errorCodes: result['error-codes'] ?? [],
          action: result.action ?? null,
          hostname: result.hostname ?? null,
        }),
      );
    }
    return verdict;
  } catch (error) {
    console.error(
      JSON.stringify({ event: 'turnstile_verify_failed', error: String(error) }),
    );
    return false; // fail closed
  }
}

// -------------------------------------------------------------- unsubscribe

async function unsubscribe(url: URL, env: Env): Promise<Response> {
  const address = (url.searchParams.get('email') ?? '').toLowerCase();
  const token = url.searchParams.get('token') ?? '';
  const expected = address ? await unsubscribeToken(address, env) : '';
  if (!address || !(await timingSafeEqualStrings(token, expected)))
    return new Response('Invalid unsubscribe link.', { status: 400 });

  await env.DB.prepare(
    'INSERT OR REPLACE INTO unsubscribes (email, unsubscribed_at) VALUES (?, ?)',
  )
    .bind(address, nowSeconds())
    .run();

  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Unsubscribed</title>
     <body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#1c2432">
     <h1 style="font-size:1.4rem">You're unsubscribed.</h1>
     <p>No more emails from the ivue newsletter. Changed your mind?
     Sign up again any time at <a href="${env.SITE_ORIGIN}">ivue.dev</a>.</p>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

// ---------------------------------------------------------------- broadcast

async function broadcast(request: Request, env: Env): Promise<Response> {
  const authorization = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${env.ADMIN_SECRET}`;
  if (!(await timingSafeEqualStrings(authorization, expected)))
    return json({ error: 'Unauthorized' }, 401);

  const { slug = '' } = (await request.json().catch(() => ({}))) as {
    slug?: string;
  };
  const posts = await loadPosts(env);
  const post = posts.find((candidate) => candidate.slug === slug);
  if (!post) return json({ error: `Unknown post slug: ${slug}` }, 400);

  const recipients = await activeSubscribers(env);
  const alreadySent = await sentSetForSlug(env, post.slug);
  const due = recipients.filter(
    (recipient) => !alreadySent.has(recipient.email),
  );

  const delivered = await sendPost(env, post, due);
  return json({
    ok: true,
    slug: post.slug,
    recipients: delivered,
    skippedAsRepeat: recipients.length - due.length,
  });
}

// The cron's exact pass, runnable on demand — same auth as /broadcast.
async function drip(request: Request, env: Env): Promise<Response> {
  const authorization = request.headers.get('authorization') ?? '';
  if (!(await timingSafeEqualStrings(authorization, `Bearer ${env.ADMIN_SECRET}`)))
    return json({ error: 'Unauthorized' }, 401);
  const delivered = await runDrip(env);
  return json({ ok: true, delivered });
}

// -------------------------------------------------------------------- cron

async function runDrip(env: Env): Promise<number> {
  const posts = await loadPosts(env); // oldest first
  const recipients = await activeSubscribers(env);
  if (!posts.length || !recipients.length) return 0;

  const cadenceSeconds = Number(env.CADENCE_HOURS) * 3600;
  const now = nowSeconds();

  // one query: every (email, slug) already sent + each subscriber's last send
  const { results } = await env.DB.prepare(
    'SELECT email, slug, sent_at FROM sends',
  ).all<{ email: string; slug: string; sent_at: number }>();
  const sentByEmail = new Map<string, Set<string>>();
  const lastSentByEmail = new Map<string, number>();
  for (const row of results) {
    let sentSet = sentByEmail.get(row.email);
    if (!sentSet) {
      sentSet = new Set();
      sentByEmail.set(row.email, sentSet);
    }
    sentSet.add(row.slug);
    lastSentByEmail.set(
      row.email,
      Math.max(lastSentByEmail.get(row.email) ?? 0, row.sent_at),
    );
  }

  // group due subscribers by the post they are owed — one batched send per slug
  const queueBySlug = new Map<string, Subscriber[]>();
  for (const recipient of recipients) {
    if (now - (lastSentByEmail.get(recipient.email) ?? 0) < cadenceSeconds)
      continue;
    const sent = sentByEmail.get(recipient.email) ?? new Set();
    const nextPost = posts.find((candidate) => !sent.has(candidate.slug));
    if (!nextPost) continue; // fully caught up
    let queue = queueBySlug.get(nextPost.slug);
    if (!queue) {
      queue = [];
      queueBySlug.set(nextPost.slug, queue);
    }
    queue.push(recipient);
  }

  let delivered = 0;
  for (const [slug, group] of queueBySlug) {
    const post = posts.find((candidate) => candidate.slug === slug);
    if (post) delivered += await sendPost(env, post, group);
  }
  return delivered;
}

// ----------------------------------------------------------------- sending

async function sendPost(
  env: Env,
  post: Post,
  recipients: Subscriber[],
): Promise<number> {
  let delivered = 0;
  for (let start = 0; start < recipients.length; start += SEND_BATCH) {
    const batch = recipients.slice(start, start + SEND_BATCH);
    const messages = [];
    for (const recipient of batch) {
      const unsubscribe = await unsubscribeUrl(recipient.email, env);
      messages.push({
        From: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
        ReplyTo: env.REPLY_TO,
        To: recipient.email,
        Subject: post.title,
        HtmlBody: renderEmail(post, unsubscribe),
        MessageStream: env.POSTMARK_STREAM,
        Headers: [
          { Name: 'List-Unsubscribe', Value: `<${unsubscribe}>` },
          { Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' },
        ],
      });
    }
    const response = await fetch(POSTMARK_BATCH, {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      console.error(
        JSON.stringify({
          event: 'postmark_batch_failed',
          status: response.status,
          body: await response.text(),
        }),
      );
      continue; // ledger stays unwritten — this batch retries next run
    }
    // per-message results: ErrorCode 0 = accepted; anything else (e.g.
    // 406 inactive recipient) is logged and NOT written to the ledger
    const outcomes = (await response.json()) as PostmarkOutcome[];
    const timestamp = nowSeconds();
    const statements = [];
    for (const [index, outcome] of outcomes.entries()) {
      if (outcome.ErrorCode === 0) {
        statements.push(
          env.DB.prepare(
            'INSERT OR IGNORE INTO sends (email, slug, sent_at) VALUES (?, ?, ?)',
          ).bind(batch[index].email, post.slug, timestamp),
        );
        delivered++;
      } else {
        console.error(
          JSON.stringify({
            event: 'postmark_message_rejected',
            recipient: batch[index].email,
            code: outcome.ErrorCode,
            message: outcome.Message,
          }),
        );
      }
    }
    if (statements.length) await env.DB.batch(statements);
  }
  return delivered;
}

function renderEmail(post: Post, unsubscribe: string): string {
  const dateLine = post.date
    ? new Date(post.date + 'T00:00:00Z').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : '';
  return `<!doctype html>
<html><body style="margin:0;background:#f4f6fb;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:36px 20px">
    <p style="margin:0 0 22px;font-size:12px;letter-spacing:.14em;color:#6b7a99">IVUE NEWSLETTER</p>
    <div style="background:#ffffff;border:1px solid #e3e8f2;border-radius:12px;padding:30px 32px">
      <h1 style="margin:0 0 8px;font-size:23px;line-height:1.3;color:#101828">${escapeHtml(post.title)}</h1>
      ${dateLine ? `<p style="margin:0 0 18px;font-size:12.5px;color:#8a94a8">${dateLine}</p>` : ''}
      <p style="margin:0 0 26px;font-size:15.5px;line-height:1.65;color:#3a4459">${escapeHtml(post.description)}</p>
      <a href="${post.url}" style="display:inline-block;background:#4f6af0;color:#ffffff;text-decoration:none;font-size:14.5px;font-weight:600;padding:11px 22px;border-radius:8px">Read the post &rarr;</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8a94a8">
      You're receiving the ivue newsletter — every post from the archive,
      one at a time. <a href="${unsubscribe}" style="color:#6b7a99">Unsubscribe</a>
    </p>
  </div>
</body></html>`;
}

// ------------------------------------------------------------------ shared

async function loadPosts(env: Env): Promise<Post[]> {
  const response = await fetch(`${env.SITE_ORIGIN}/blog-index.json`);
  if (!response.ok) throw new Error(`blog-index.json ${response.status}`);
  return response.json(); // sorted oldest-first by the generator
}

async function activeSubscribers(env: Env): Promise<Subscriber[]> {
  const { results } = await env.DB.prepare(
    'SELECT email, name FROM subscribers WHERE email NOT IN (SELECT email FROM unsubscribes)',
  ).all<Subscriber>();
  return results;
}

async function sentSetForSlug(env: Env, slug: string): Promise<Set<string>> {
  const { results } = await env.DB.prepare(
    'SELECT email FROM sends WHERE slug = ?',
  )
    .bind(slug)
    .all<{ email: string }>();
  return new Set(results.map((row) => row.email));
}

// Compare secrets without a timing side-channel: hash both to fixed size
// (no length leak), then constant-time compare.
async function timingSafeEqualStrings(
  provided: string,
  expected: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

async function unsubscribeToken(address: string, env: Env): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.ADMIN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(address),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function unsubscribeUrl(address: string, env: Env): Promise<string> {
  const token = await unsubscribeToken(address, env);
  return `${env.WORKER_ORIGIN}/unsubscribe?email=${encodeURIComponent(address)}&token=${token}`;
}

function withCors(response: Response, env: Env): Response {
  response.headers.set('access-control-allow-origin', env.SITE_ORIGIN);
  response.headers.set('access-control-allow-methods', 'POST, OPTIONS');
  response.headers.set('access-control-allow-headers', 'content-type');
  return response;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function escapeHtml(text: string): string {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
