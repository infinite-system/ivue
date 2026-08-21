-- Migration 0005 — the scheduling queue. One row per future action
-- (newsletter broadcast or X post); the 5-minute cron claims due rows
-- and executes them, recording the outcome in place — executed rows ARE
-- the history.
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT    NOT NULL, -- 'broadcast' | 'tweet'
  payload     TEXT    NOT NULL, -- JSON, shape per kind
  due_at      INTEGER NOT NULL, -- unix seconds
  created_at  INTEGER NOT NULL,
  executed_at INTEGER,          -- NULL = still pending
  result      TEXT              -- JSON {ok:...} or {error:...}
);
CREATE INDEX IF NOT EXISTS scheduled_jobs_due
  ON scheduled_jobs (executed_at, due_at);
