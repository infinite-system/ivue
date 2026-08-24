-- Threaded comments, two levels deep. A top-level comment has
-- parent_id NULL and root_id = its own id; every reply carries the
-- root it belongs to, so a thread is one indexed read. Replying to a
-- reply keeps root_id (depth stays 2) and points parent_id at the
-- reply being answered — that parent is who gets notified, and the
-- body carries an @mention so the addressing is visible.
ALTER TABLE comments ADD COLUMN parent_id INTEGER;
ALTER TABLE comments ADD COLUMN root_id INTEGER;
-- locked lives on the ROOT row: a locked thread accepts no new replies
ALTER TABLE comments ADD COLUMN locked INTEGER NOT NULL DEFAULT 0;
-- avatar_seed: HMAC of the address, stamped at submit time. The same
-- person gets the same identicon everywhere, and the email itself is
-- never derivable from what the public projection serves.
ALTER TABLE comments ADD COLUMN avatar_seed TEXT NOT NULL DEFAULT '';

-- existing rows are all top-level: their thread is themselves
UPDATE comments SET root_id = id WHERE root_id IS NULL;

CREATE INDEX IF NOT EXISTS comments_root ON comments (root_id, submitted_at);

-- Reply subscriptions are per (thread, address) — insert on opt-in,
-- delete on unsubscribe. Notification never reads the comments table
-- for consent, only this one.
CREATE TABLE IF NOT EXISTS comment_subscriptions (
  root_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (root_id, email)
);
