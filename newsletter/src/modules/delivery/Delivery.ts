import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Security } from '../platform/Security';
import { Ledger } from '../audience/Ledger';
import { Posts } from '../content/Posts';
import { Audience } from '../audience/Audience';
import type { Post } from '../content/Posts';
import type { Subscriber } from '../audience/Audience';

// Postmark delivery — batch API on the broadcast message stream. Only an
// accepted message (ErrorCode 0) is written to the sends ledger, so a
// failed batch or a rejected recipient retries on the next pass instead
// of being falsely marked sent.
class $Delivery {
  static get POSTMARK_BATCH_URL() {
    return 'https://api.postmarkapp.com/email/batch';
  }

  static get POSTMARK_EMAIL_URL() {
    return 'https://api.postmarkapp.com/email';
  }

  // operator notifications are TRANSACTIONAL mail — Postmark's default
  // stream, never the broadcast newsletter stream
  static get NOTIFICATION_STREAM() {
    return 'outbound';
  }

  // Postmark accepts up to 500 messages per batch call; batching keeps
  // subrequests far under the Workers free-plan cap (50/invocation).
  static get SEND_BATCH_SIZE() {
    return 500;
  }

  // The welcome email's ledger slug. Not a blog post: it never appears
  // in the catalog, so the drip skips it as content — but its ledger row
  // sets lastSentAt, which makes the FIRST dripped post wait one full
  // cadence after signup instead of arriving the same day.
  static get WELCOME_SLUG() {
    return 'welcome';
  }

  // The signup welcome email — content rendered at SITE build time
  // (blog-email-renderer.mjs → /welcome-email.html), fetched here and
  // personalized with the unsubscribe link only. Sent once per address,
  // ever: the ledger row is the guard, so a returning subscriber
  // resumes silently. Best-effort (rides waitUntil like the operator
  // ping) — a failure logs and the signup stands.
  static async sendWelcome(env: Env, subscriber: Subscriber): Promise<void> {
    try {
      if (await Ledger.Class.hasSend(env, subscriber.email, this.WELCOME_SLUG))
        return;
      const response = await fetch(`${env.SITE_ORIGIN}/welcome-email.html`);
      if (!response.ok)
        throw new Error(`welcome-email.html ${response.status}`);
      const template = await response.text();
      const unsubscribe = await Security.Class.unsubscribeUrl(
        subscriber.email,
        env,
      );
      const send = await fetch(this.POSTMARK_EMAIL_URL, {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          From: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
          ReplyTo: env.REPLY_TO,
          To: subscriber.email,
          Subject: 'Welcome to the ivue newsletter',
          HtmlBody: template.replaceAll('{{UNSUBSCRIBE_URL}}', unsubscribe),
          MessageStream: env.POSTMARK_STREAM,
          Headers: [
            { Name: 'List-Unsubscribe', Value: `<${unsubscribe}>` },
            {
              Name: 'List-Unsubscribe-Post',
              Value: 'List-Unsubscribe=One-Click',
            },
          ],
        }),
      });
      const outcome = (await send.json()) as PostmarkOutcome;
      if (!send.ok || outcome.ErrorCode !== 0)
        throw new Error(
          `Postmark ${send.status}: ${outcome.Message ?? 'welcome rejected'}`,
        );
      await Ledger.Class.record(env, [
        {
          email: subscriber.email,
          slug: this.WELCOME_SLUG,
          sentAt: Http.Class.nowSeconds(),
        },
      ]);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'welcome_send_failed',
          recipient: subscriber.email,
          error: String(error),
        }),
      );
    }
  }

  // A reply landed in a thread someone subscribed to. Sent when the
  // reply is APPROVED (never on submission — unmoderated text must not
  // reach a reader's inbox). One mail per recipient, each carrying its
  // own thread-scoped unsubscribe link.
  static async notifyReply(
    env: Env,
    reply: { id: number; slug: string; name: string; body: string },
    rootId: number,
    recipients: { email: string; name: string }[],
  ): Promise<void> {
    for (const recipient of recipients) {
      try {
        const token = await Security.Class.threadToken(
          rootId,
          recipient.email,
          env,
        );
        const query =
          `?thread=${rootId}&sub=${encodeURIComponent(recipient.email)}` +
          `&t=${token}#comment-${reply.id}`;
        const threadUrl = `${env.SITE_ORIGIN}/blog/${reply.slug}${query}`;
        const stopUrl =
          `${env.WORKER_ORIGIN}/comment-unsubscribe?thread=${rootId}` +
          `&email=${encodeURIComponent(recipient.email)}&token=${token}`;
        const excerpt =
          reply.body.length > 600 ? `${reply.body.slice(0, 600)}…` : reply.body;
        const response = await fetch(this.POSTMARK_EMAIL_URL, {
          method: 'POST',
          headers: {
            'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            From: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
            To: recipient.email,
            Subject: `${reply.name} replied to you on ivue.dev`,
            MessageStream: this.NOTIFICATION_STREAM,
            TextBody:
              `${reply.name} replied in a comment thread you follow:\n\n` +
              `${excerpt}\n\n` +
              `Read and reply: ${threadUrl}\n\n` +
              `— \nYou get this because you asked for replies on that ` +
              `thread.\nStop following it: ${stopUrl}\n`,
          }),
        });
        if (!response.ok) {
          console.error(
            JSON.stringify({
              event: 'reply_notify_failed',
              status: response.status,
              body: (await response.text()).slice(0, 300),
            }),
          );
        }
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'reply_notify_failed',
            error: String(error),
          }),
        );
      }
    }
  }

  // One line to the operator for every comment awaiting moderation.
  // Best-effort like the signup ping — a failure logs and the comment
  // itself already committed.
  static async notifyComment(
    env: Env,
    comment: { slug: string; name: string; email: string; body: string },
  ): Promise<void> {
    try {
      const response = await fetch(this.POSTMARK_EMAIL_URL, {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          From: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
          To: env.NOTIFY_EMAIL,
          Subject: `New comment on ${comment.slug} (pending approval)`,
          MessageStream: this.NOTIFICATION_STREAM,
          TextBody:
            `${comment.name} <${comment.email}> commented on ` +
            `${env.SITE_ORIGIN}/blog/${comment.slug}:\n\n${comment.body}\n\n` +
            `Approve or delete: ${env.WORKER_ORIGIN}/newsletter/comments`,
        }),
      });
      if (!response.ok) {
        console.error(
          JSON.stringify({
            event: 'comment_notify_failed',
            status: response.status,
            body: (await response.text()).slice(0, 300),
          }),
        );
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'comment_notify_failed',
          error: String(error),
        }),
      );
    }
  }

  // One line to the operator for every signup. Best-effort by design:
  // a notification failure is logged and never surfaces to the
  // subscriber — the signup itself already committed.
  static async notifySignup(
    env: Env,
    subscriber: Subscriber,
    list: string,
  ): Promise<void> {
    try {
      const audienceSize = await env.DB.prepare(
        'SELECT COUNT(DISTINCT email) AS total FROM subscribers ' +
          'WHERE email NOT IN (SELECT email FROM unsubscribes)',
      ).first<{ total: number }>();
      const response = await fetch(this.POSTMARK_EMAIL_URL, {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          From: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
          To: env.NOTIFY_EMAIL,
          Subject: `New subscriber: ${subscriber.email}`,
          MessageStream: this.NOTIFICATION_STREAM,
          TextBody:
            `${subscriber.email}${subscriber.name ? ` (${subscriber.name})` : ''} ` +
            `joined the "${list}" list.\n\n` +
            `Active audience: ${audienceSize?.total ?? '?'} subscribers.\n` +
            `Dashboard: ${env.WORKER_ORIGIN}/`,
        }),
      });
      if (!response.ok) {
        console.error(
          JSON.stringify({
            event: 'signup_notify_failed',
            status: response.status,
            body: (await response.text()).slice(0, 300),
          }),
        );
      }
    } catch (error) {
      console.error(
        JSON.stringify({ event: 'signup_notify_failed', error: String(error) }),
      );
    }
  }

  // A whole-list broadcast of one post — the ledger-filtered core shared
  // by POST /broadcast and the scheduler.
  static async broadcastPost(
    env: Env,
    slug: string,
    list: string,
  ): Promise<{ slug: string; delivered: number; skippedAsRepeat: number }> {
    const posts = await Posts.Class.load(env);
    const post = Posts.Class.find(posts, slug);
    if (!post) throw new Error(`Unknown post slug: ${slug}`);
    const recipients = await Audience.Class.active(env, list);
    const alreadySent = await Ledger.Class.sentSetForSlug(env, post.slug);
    const due = recipients.filter(
      (recipient) => !alreadySent.has(recipient.email),
    );
    const report = await this.sendPost(env, post, due);
    return {
      slug: post.slug,
      delivered: report.delivered,
      skippedAsRepeat: recipients.length - due.length,
    };
  }

  static async sendPost(
    env: Env,
    post: Post,
    recipients: Subscriber[],
  ): Promise<DeliveryReport> {
    let delivered = 0;
    const outcomes: RecipientOutcome[] = [];
    for (
      let start = 0;
      start < recipients.length;
      start += this.SEND_BATCH_SIZE
    ) {
      const batch = recipients.slice(start, start + this.SEND_BATCH_SIZE);
      const messages = [];
      for (const recipient of batch) {
        const unsubscribe = await Security.Class.unsubscribeUrl(
          recipient.email,
          env,
        );
        messages.push({
          From: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
          ReplyTo: env.REPLY_TO,
          To: recipient.email,
          Subject: post.title,
          HtmlBody: post.emailHtml.replaceAll(
            '{{UNSUBSCRIBE_URL}}',
            unsubscribe,
          ),
          MessageStream: env.POSTMARK_STREAM,
          Headers: [
            { Name: 'List-Unsubscribe', Value: `<${unsubscribe}>` },
            {
              Name: 'List-Unsubscribe-Post',
              Value: 'List-Unsubscribe=One-Click',
            },
          ],
        });
      }
      const response = await fetch(this.POSTMARK_BATCH_URL, {
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
        for (const recipient of batch)
          outcomes.push({
            email: recipient.email,
            errorCode: response.status,
            message: 'Postmark batch call failed — will retry next run',
          });
        continue; // ledger stays unwritten — this batch retries next run
      }
      // per-message results: ErrorCode 0 = accepted; anything else (e.g.
      // 406 inactive recipient) is logged and NOT written to the ledger
      const results = (await response.json()) as PostmarkOutcome[];
      const timestamp = Http.Class.nowSeconds();
      const ledgerEntries = [];
      for (const [index, outcome] of results.entries()) {
        outcomes.push({
          email: batch[index].email,
          errorCode: outcome.ErrorCode,
          message: outcome.Message,
        });
        if (outcome.ErrorCode === 0) {
          ledgerEntries.push({
            email: batch[index].email,
            slug: post.slug,
            sentAt: timestamp,
          });
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
      await Ledger.Class.record(env, ledgerEntries);
    }
    return { delivered, outcomes };
  }
}

export namespace Delivery {
  export const $Class = Static($Delivery);
  export let Class = $Class;
}

export interface PostmarkOutcome {
  ErrorCode: number;
  Message: string;
}

export interface RecipientOutcome {
  email: string;
  errorCode: number;
  message: string;
}

export interface DeliveryReport {
  delivered: number;
  outcomes: RecipientOutcome[];
}
