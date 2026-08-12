// ivue newsletter Worker.
//
// The whole design is one invariant: at most one email per (subscriber,
// post), ever. The D1 `sends` table IS that invariant; the daily cron and
// the ad-hoc /broadcast endpoint are just two writers of the same ledger,
// so neither can repeat what the other already delivered.
//
// D1 is the audience layer (subscribers + unsubscribes + ledger);
// Postmark is delivery only — broadcast message stream, batch API.
//
//   POST /subscribe     {name, email}         — site form → D1
//   GET  /unsubscribe   ?email=&token=        — HMAC-signed one-click out
//   POST /broadcast     {slug}  (Bearer ADMIN_SECRET) — send a post NOW
//   cron daily                                — each due subscriber gets
//                                               their oldest unsent post

const POSTMARK_BATCH = 'https://api.postmarkapp.com/email/batch';

// Postmark accepts up to 500 messages per batch call; batching keeps
// subrequests far under the Workers free-plan cap (50/invocation).
const SEND_BATCH = 500;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), env);
    try {
      if (url.pathname === '/subscribe' && request.method === 'POST')
        return withCors(await subscribe(request, env), env);
      if (url.pathname === '/unsubscribe' && request.method === 'GET')
        return unsubscribe(url, env);
      if (url.pathname === '/broadcast' && request.method === 'POST')
        return broadcast(request, env);
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error(error);
      return withCors(json({ error: 'Something went wrong — try again in a minute.' }, 500), env);
    }
  },

  async scheduled(_event, env, context) {
    context.waitUntil(runDrip(env));
  },
};

// ---------------------------------------------------------------- subscribe

async function subscribe(request, env) {
  const { name = '', email = '' } = await request.json().catch(() => ({}));
  const address = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
    return json({ error: 'That email address does not look right.' }, 400);

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO subscribers (email, name, subscribed_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(email) DO UPDATE SET name = excluded.name',
    ).bind(address, String(name).trim().slice(0, 80), nowSeconds()),
    // a returning subscriber cancels any previous unsubscribe
    env.DB.prepare('DELETE FROM unsubscribes WHERE email = ?').bind(address),
  ]);
  return json({ ok: true });
}

// -------------------------------------------------------------- unsubscribe

async function unsubscribe(url, env) {
  const address = (url.searchParams.get('email') ?? '').toLowerCase();
  const token = url.searchParams.get('token') ?? '';
  if (!address || token !== (await unsubscribeToken(address, env)))
    return new Response('Invalid unsubscribe link.', { status: 400 });

  await env.DB.prepare(
    'INSERT OR REPLACE INTO unsubscribes (email, unsubscribed_at) VALUES (?, ?)',
  ).bind(address, nowSeconds()).run();

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

async function broadcast(request, env) {
  const authorization = request.headers.get('authorization') ?? '';
  if (authorization !== `Bearer ${env.ADMIN_SECRET}`)
    return json({ error: 'Unauthorized' }, 401);

  const { slug = '' } = await request.json().catch(() => ({}));
  const posts = await loadPosts(env);
  const post = posts.find((candidate) => candidate.slug === slug);
  if (!post) return json({ error: `Unknown post slug: ${slug}` }, 400);

  const recipients = await activeSubscribers(env);
  const alreadySent = await sentSetForSlug(env, post.slug);
  const due = recipients.filter((recipient) => !alreadySent.has(recipient.email));

  const delivered = await sendPost(env, post, due);
  return json({ ok: true, slug: post.slug, recipients: delivered, skippedAsRepeat: recipients.length - due.length });
}

// -------------------------------------------------------------------- cron

async function runDrip(env) {
  const posts = await loadPosts(env); // oldest first
  const recipients = await activeSubscribers(env);
  if (!posts.length || !recipients.length) return;

  const cadenceSeconds = Number(env.CADENCE_HOURS) * 3600;
  const now = nowSeconds();

  // one query: every (email, slug) already sent + each subscriber's last send
  const { results } = await env.DB.prepare('SELECT email, slug, sent_at FROM sends').all();
  const sentByEmail = new Map();
  const lastSentByEmail = new Map();
  for (const row of results) {
    if (!sentByEmail.has(row.email)) sentByEmail.set(row.email, new Set());
    sentByEmail.get(row.email).add(row.slug);
    lastSentByEmail.set(row.email, Math.max(lastSentByEmail.get(row.email) ?? 0, row.sent_at));
  }

  // group due subscribers by the post they are owed — one batched send per slug
  const queueBySlug = new Map();
  for (const recipient of recipients) {
    if (now - (lastSentByEmail.get(recipient.email) ?? 0) < cadenceSeconds) continue;
    const sent = sentByEmail.get(recipient.email) ?? new Set();
    const nextPost = posts.find((candidate) => !sent.has(candidate.slug));
    if (!nextPost) continue; // fully caught up
    if (!queueBySlug.has(nextPost.slug)) queueBySlug.set(nextPost.slug, []);
    queueBySlug.get(nextPost.slug).push(recipient);
  }

  for (const [slug, group] of queueBySlug) {
    const post = posts.find((candidate) => candidate.slug === slug);
    await sendPost(env, post, group);
  }
}

// ----------------------------------------------------------------- sending

async function sendPost(env, post, recipients) {
  let delivered = 0;
  for (let start = 0; start < recipients.length; start += SEND_BATCH) {
    const batch = recipients.slice(start, start + SEND_BATCH);
    const messages = [];
    for (const recipient of batch) {
      const unsubscribe = await unsubscribeUrl(recipient.email, env);
      messages.push({
        From: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
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
      console.error('postmark batch', response.status, await response.text());
      continue; // ledger stays unwritten — this batch retries next run
    }
    // per-message results: ErrorCode 0 = accepted; anything else (e.g.
    // 406 inactive recipient) is logged and NOT written to the ledger
    const outcomes = await response.json();
    const timestamp = nowSeconds();
    const statements = [];
    outcomes.forEach((outcome, index) => {
      if (outcome.ErrorCode === 0) {
        statements.push(
          env.DB.prepare('INSERT OR IGNORE INTO sends (email, slug, sent_at) VALUES (?, ?, ?)')
            .bind(batch[index].email, post.slug, timestamp),
        );
        delivered++;
      } else {
        console.error('postmark message', batch[index].email, outcome.ErrorCode, outcome.Message);
      }
    });
    if (statements.length) await env.DB.batch(statements);
  }
  return delivered;
}

function renderEmail(post, unsubscribe) {
  const dateLine = post.date
    ? new Date(post.date + 'T00:00:00Z').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
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

async function loadPosts(env) {
  const response = await fetch(`${env.SITE_ORIGIN}/blog-index.json`);
  if (!response.ok) throw new Error(`blog-index.json ${response.status}`);
  return response.json(); // sorted oldest-first by the generator
}

async function activeSubscribers(env) {
  const { results } = await env.DB.prepare(
    'SELECT email, name FROM subscribers WHERE email NOT IN (SELECT email FROM unsubscribes)',
  ).all();
  return results;
}

async function sentSetForSlug(env, slug) {
  const { results } = await env.DB.prepare('SELECT email FROM sends WHERE slug = ?')
    .bind(slug).all();
  return new Set(results.map((row) => row.email));
}

async function unsubscribeToken(address, env) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.ADMIN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(address));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function unsubscribeUrl(address, env) {
  const token = await unsubscribeToken(address, env);
  return `${env.WORKER_ORIGIN}/unsubscribe?email=${encodeURIComponent(address)}&token=${token}`;
}

function withCors(response, env) {
  response.headers.set('access-control-allow-origin', env.SITE_ORIGIN);
  response.headers.set('access-control-allow-methods', 'POST, OPTIONS');
  response.headers.set('access-control-allow-headers', 'content-type');
  return response;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}
