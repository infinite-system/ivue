-- The reply-subscription opt-in is recorded on the comment at submit
-- time, but the subscription ROW is created only when the comment is
-- approved (closing gap G2 in COMMENTS.md: a comment that is deleted or
-- never approved leaves no subscription behind). Existing rows default
-- to 1, matching the pre-checked form they came from.
ALTER TABLE comments ADD COLUMN subscribe_replies INTEGER NOT NULL DEFAULT 1;
