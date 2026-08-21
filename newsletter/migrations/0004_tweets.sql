-- Migration 0004 — the tweets ledger. Same philosophy as sends: every
-- post to X is recorded (id, text, optional source slug), so the admin
-- panel can show what went out and when.
CREATE TABLE IF NOT EXISTS tweets (
  tweet_id  TEXT    PRIMARY KEY,
  text      TEXT    NOT NULL,
  slug      TEXT,
  posted_at INTEGER NOT NULL -- unix seconds
);
