-- The list registry. Lists were implicit (whatever appeared in
-- subscribers.list); the registry makes them first-class so an empty
-- list can exist before its first member, and management (create,
-- rename, delete) has a real row to act on. Seeded from the lists
-- already in use.
CREATE TABLE IF NOT EXISTS lists (
  name TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO lists (name, created_at)
  SELECT DISTINCT list, strftime('%s', 'now') FROM subscribers;
