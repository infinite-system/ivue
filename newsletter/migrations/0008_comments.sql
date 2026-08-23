-- Blog comments — pending-by-default moderation. Nothing renders on
-- the site until the operator approves it, so spam has zero payoff.
-- Emails are stored for the operator (and the optional newsletter
-- opt-in) and are NEVER served by any public endpoint.
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  body TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS comments_slug_status ON comments (slug, status);
