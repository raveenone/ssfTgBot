import Database from 'better-sqlite3'

const db = new Database('/data/sessions.db') // NOT exported

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  userId TEXT PRIMARY KEY,
  data TEXT NOT NULL
)
`)

// ---------------------------------
// Safe wrappers
// ---------------------------------

export function dbGet(sql: string, ...params: any[]) {
  return db.prepare(sql).get(...params)
}

export function dbAll(sql: string, ...params: any[]) {
  return db.prepare(sql).all(...params)
}

export function dbRun(sql: string, ...params: any[]) {
  return db.prepare(sql).run(...params)
}