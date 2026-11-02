export const SCHEMA_VERSION = 1
export const DATA_VERSION = 2

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
  icon        TEXT,
  days        INTEGER CHECK (days BETWEEN 1 AND 126),
  goal REAL CHECK (goal > 0),
  unit TEXT CHECK (length(unit) <= 16),
  kind TEXT NOT NULL DEFAULT 'build' CHECK (kind IN ('build', 'quit')),
  group_name TEXT CHECK (length(group_name) BETWEEN 1 AND 40),
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
  amount REAL CHECK (amount >= 0),
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_habit ON entries(habit_id);
`

// Additive-only migrations for databases created before a column existed.
// CREATE TABLE IF NOT EXISTS never alters an existing table, so a new column has
// to be added explicitly. Each runs on every boot and is expected to fail with
// "duplicate column name" once applied — that failure is the success case.
export const ALTERS = [
  'ALTER TABLE habits ADD COLUMN icon TEXT',
  'ALTER TABLE habits ADD COLUMN days INTEGER CHECK (days BETWEEN 1 AND 126)',
  "ALTER TABLE habits ADD COLUMN goal REAL CHECK (goal > 0)",
  "ALTER TABLE habits ADD COLUMN unit TEXT CHECK (length(unit) <= 16)",
  "ALTER TABLE habits ADD COLUMN kind TEXT NOT NULL DEFAULT 'build' CHECK (kind IN ('build', 'quit'))",
  "ALTER TABLE habits ADD COLUMN group_name TEXT CHECK (length(group_name) BETWEEN 1 AND 40)",
  "ALTER TABLE entries ADD COLUMN amount REAL CHECK (amount >= 0)",
]
