-- Migration 0002 — audience lists. A subscriber row belongs to exactly one
-- list; the same email may join several lists (PRIMARY KEY email+list).
-- Every existing subscriber is the 'newsletter' list. The sends ledger
-- stays keyed (email, slug) — one email per person per post EVER holds
-- across lists — and unsubscribes stay global per email (matching
-- Postmark's per-address suppression).
CREATE TABLE subscribers_with_lists (
  email         TEXT    NOT NULL,
  list          TEXT    NOT NULL DEFAULT 'newsletter',
  name          TEXT    NOT NULL DEFAULT '',
  subscribed_at INTEGER NOT NULL, -- unix seconds
  PRIMARY KEY (email, list)
);
INSERT INTO subscribers_with_lists (email, list, name, subscribed_at)
  SELECT email, 'newsletter', name, subscribed_at FROM subscribers;
DROP TABLE subscribers;
ALTER TABLE subscribers_with_lists RENAME TO subscribers;
