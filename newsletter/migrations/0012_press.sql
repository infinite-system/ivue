-- Migration 0012 — the press: pieces (the argument), their expressions
-- (one per platform projection, segments nested under threads and card
-- sets), the posting ledger (when and where each projection went out),
-- and two revision histories (the base's, and every authored body's).
-- Copy lives HERE, never in the public repo; see tasks/press-system-plan.md.

CREATE TABLE IF NOT EXISTS piece (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE,            -- blog slug when the piece is an article; NULL for a bare post
  title       TEXT    NOT NULL,
  claim       TEXT    NOT NULL DEFAULT '',
  links       TEXT    NOT NULL DEFAULT '[]', -- JSON [{label,url}]
  banner      TEXT,                   -- /blog/<slug>.png or NULL
  base        TEXT    NOT NULL DEFAULT '', -- the one text derived expressions regenerate from; `---` rules mark thread breaks
  wave        INTEGER NOT NULL DEFAULT 1,
  notes       TEXT    NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS expression (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  piece_id     INTEGER NOT NULL REFERENCES piece(id),
  kind         TEXT    NOT NULL,      -- x-thread | x-segment | x-post | x-long | x-article | x-cards | x-card | linkedin | linkedin-article | reddit | devto | hn | bluesky | mastodon | threads | email | note
  mode         TEXT    NOT NULL DEFAULT 'authored', -- derived (regenerated from piece.base) | authored
  parent_id    INTEGER REFERENCES expression(id),   -- segment → its thread / card set
  position     INTEGER NOT NULL DEFAULT 0,
  label        TEXT    NOT NULL DEFAULT '',
  venue        TEXT    NOT NULL DEFAULT '', -- what makes two rows of one kind distinct: "JavaScript Weekly", "r/typescript"
  body         TEXT    NOT NULL DEFAULT '',
  meta         TEXT    NOT NULL DEFAULT '{}', -- JSON per kind
  mirrors      TEXT    NOT NULL DEFAULT '[]', -- JSON [{platform, sentAt, url}]
  status       TEXT    NOT NULL DEFAULT 'draft', -- draft | approved | scheduled | due | sent | archived
  skipped      INTEGER NOT NULL DEFAULT 0,       -- segments only
  calendar_id  TEXT,                  -- release-calendar entry id, when placed
  approved_at  INTEGER,
  scheduled_at INTEGER,
  sent_at      INTEGER,
  sent_url     TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS expression_piece ON expression (piece_id, kind, position);
CREATE INDEX IF NOT EXISTS expression_parent ON expression (parent_id, position);

CREATE TABLE IF NOT EXISTS posting (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  expression_id INTEGER NOT NULL REFERENCES expression(id),
  platform      TEXT    NOT NULL,     -- x | bluesky | mastodon | threads | linkedin | reddit | devto | hn | email | other
  venue         TEXT    NOT NULL DEFAULT '',
  url           TEXT,
  remote_ids    TEXT    NOT NULL DEFAULT '[]', -- JSON: tweet ids per segment, a reddit post id
  posted_at     INTEGER NOT NULL,
  posted_by     TEXT    NOT NULL,     -- api | manual
  calendar_id   TEXT
);
CREATE INDEX IF NOT EXISTS posting_expression ON posting (expression_id, posted_at);

CREATE TABLE IF NOT EXISTS base_revision (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  piece_id  INTEGER NOT NULL REFERENCES piece(id),
  base      TEXT    NOT NULL,         -- the base BEFORE the save
  author    TEXT    NOT NULL,         -- user | agent
  saved_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS base_revision_piece ON base_revision (piece_id, saved_at);

CREATE TABLE IF NOT EXISTS post_revision (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  expression_id INTEGER NOT NULL REFERENCES expression(id),
  body          TEXT    NOT NULL,     -- the body BEFORE the save
  meta          TEXT    NOT NULL DEFAULT '{}',
  author        TEXT    NOT NULL,     -- user | agent
  saved_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS post_revision_expression ON post_revision (expression_id, saved_at);
