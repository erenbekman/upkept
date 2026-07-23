CREATE TABLE IF NOT EXISTS sync_docs (
  code       TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  mutated_at INTEGER NOT NULL,
  rev        INTEGER NOT NULL DEFAULT 1
);
