-- Migration 0003 — operator settings. One row per key; the Worker falls
-- back to its env vars when a key is absent, so an empty table changes
-- nothing. First key: cadence_hours (the drip's minimum gap), editable
-- from the dashboard.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
