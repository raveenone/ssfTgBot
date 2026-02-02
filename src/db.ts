import Database from 'better-sqlite3'

export const db = new Database('sessions.db')

// simple key-value store
db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  userId TEXT PRIMARY KEY,
  data TEXT NOT NULL
)
`)
