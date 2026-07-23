export const SCHEMA_VERSION = 1

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS habits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL DEFAULT 1,
  name        TEXT NOT NULL,
  target_desc TEXT,
  color       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reason_tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL DEFAULT 1,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL DEFAULT 1,
  habit_id      INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date          TEXT NOT NULL,
  status        TEXT NOT NULL,
  reason_tag_id INTEGER REFERENCES reason_tags(id),
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_habit ON entries(habit_id);
`

export const DEFAULT_REASON_TAGS = [
  'Yorgundum',
  'Seyahatteydim',
  'Hastaydım',
  'Sosyal bir şey çıktı',
  'Unuttum',
  'Zaman yoktu',
]
