-- ivue newsletter ledger + audience. One send row per (subscriber, post)
-- ever — the drip picks each subscriber's oldest unsent post, so a
-- broadcast that jumps the queue is structurally impossible to re-send.
--   apply: npx wrangler@4.120.1 d1 execute ivue-newsletter --remote --file=schema.sql

-- The audience lives HERE (Postmark has no contact-list product — by
-- design; the Worker is the audience layer).
CREATE TABLE IF NOT EXISTS subscribers (
  email         TEXT    PRIMARY KEY,
  name          TEXT    NOT NULL DEFAULT '',
  subscribed_at INTEGER NOT NULL -- unix seconds
);

CREATE TABLE IF NOT EXISTS sends (
  email   TEXT    NOT NULL,
  slug    TEXT    NOT NULL,
  sent_at INTEGER NOT NULL, -- unix seconds
  PRIMARY KEY (email, slug)
);
CREATE INDEX IF NOT EXISTS sends_by_email ON sends (email, sent_at);

-- Local suppression, written the moment someone clicks unsubscribe.
-- Sends always check this table; Postmark's own suppression list (hard
-- bounces, spam complaints) additionally blocks on their side.
CREATE TABLE IF NOT EXISTS unsubscribes (
  email            TEXT    PRIMARY KEY,
  unsubscribed_at  INTEGER NOT NULL
);
