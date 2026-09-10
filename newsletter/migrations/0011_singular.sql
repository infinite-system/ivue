-- Migration 0011 — every table to its singular name. A table is named for
-- what one row IS (`subscriber`, `send`, `comment`); the plural named the
-- container and read wrong in every query. Renames keep data, constraints
-- and foreign keys; indexes are re-created so their names follow the
-- table. The Worker's SQL changes in the same commit (CONVENTIONS.md).
ALTER TABLE subscribers RENAME TO subscriber;

ALTER TABLE sends RENAME TO send;
DROP INDEX IF EXISTS sends_by_email;
CREATE INDEX IF NOT EXISTS send_by_email ON send (email, sent_at);

ALTER TABLE unsubscribes RENAME TO unsubscribe;

ALTER TABLE tweets RENAME TO tweet;

ALTER TABLE scheduled_jobs RENAME TO scheduled_job;
DROP INDEX IF EXISTS scheduled_jobs_due;
CREATE INDEX IF NOT EXISTS scheduled_job_due ON scheduled_job (executed_at, due_at);

ALTER TABLE lists RENAME TO list;

ALTER TABLE comments RENAME TO comment;
DROP INDEX IF EXISTS comments_slug_status;
CREATE INDEX IF NOT EXISTS comment_slug_status ON comment (slug, status);
DROP INDEX IF EXISTS comments_root;
CREATE INDEX IF NOT EXISTS comment_root ON comment (root_id, submitted_at);

ALTER TABLE comment_subscriptions RENAME TO comment_subscription;

ALTER TABLE settings RENAME TO setting;
