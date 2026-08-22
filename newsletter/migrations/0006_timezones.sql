-- Per-subscriber IANA timezone, captured from the signup form
-- (Intl.DateTimeFormat().resolvedOptions().timeZone). NULL means
-- unknown — the drip falls back to the default_timezone setting.
ALTER TABLE subscribers ADD COLUMN timezone TEXT;
