-- ivue newsletter ledger. One row per (subscriber, post) ever sent — the
-- drip picks each subscriber's oldest unsent post, so a broadcast that
-- jumps the queue is structurally impossible to re-send later.
--   apply: npx wrangler@4.120.1 d1 execute ivue-newsletter --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS sends (
  email   TEXT    NOT NULL,
  slug    TEXT    NOT NULL,
  sent_at INTEGER NOT NULL, -- unix seconds
  PRIMARY KEY (email, slug)
);
CREATE INDEX IF NOT EXISTS sends_by_email ON sends (email, sent_at);

-- Local suppression, written the moment someone clicks unsubscribe. Brevo's
-- list is also updated, but sends always check THIS table first, so an
-- unsubscribe holds even if the Brevo call ever fails.
CREATE TABLE IF NOT EXISTS unsubscribes (
  email            TEXT    PRIMARY KEY,
  unsubscribed_at  INTEGER NOT NULL
);
