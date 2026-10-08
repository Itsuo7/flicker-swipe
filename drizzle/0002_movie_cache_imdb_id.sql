ALTER TABLE movie_cache ADD COLUMN IF NOT EXISTS imdb_id text;

CREATE UNIQUE INDEX IF NOT EXISTS movie_cache_imdb_id_unique
  ON movie_cache (imdb_id);
