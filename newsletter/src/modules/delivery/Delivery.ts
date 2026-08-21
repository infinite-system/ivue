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
