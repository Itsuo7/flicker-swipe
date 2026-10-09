-- Deduplicate swipe_history and enforce one row per (user_id, movie_id).
-- Run BEFORE `drizzle-kit push`, which would otherwise fail on existing duplicates.
-- Safe to re-run.

BEGIN;

-- Block concurrent writes while we dedupe and index.
LOCK TABLE swipe_history IN SHARE ROW EXCLUSIVE MODE;

-- Keep only the most recent row per user/movie (id breaks created_at ties).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, movie_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM swipe_history
)
DELETE FROM swipe_history
USING ranked
WHERE swipe_history.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS swipe_history_user_movie_unique
  ON swipe_history (user_id, movie_id);

COMMIT;
