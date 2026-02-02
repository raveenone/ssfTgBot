import { db } from './db'

export type TokenType = 'USDC' | 'USDT'

export type SessionStep =
  | 'idle'
  | 'select_token'
  | 'enter_amount'
  | 'enter_payout'
  | 'awaiting_payment'

export type Session = {
  step: SessionStep

  depositAddress?: string
  tokenType?: TokenType
  amountUSD?: number
  payoutAddress?: string

  credited?: boolean
  lastCheckedBalance?: number
}

// ----------------------------------------
// DB helpers
// ----------------------------------------

export function getSession(userId: number): Session {
  const row = db
    .prepare('SELECT data FROM sessions WHERE userId=?')
    .get(String(userId)) as { data: string } | undefined

  if (row) {
    return JSON.parse(row.data)
  }

  const session: Session = { step: 'idle' }
  saveSession(userId, session)
  return session
}

export function saveSession(userId: number, session: Session) {
  db.prepare(`
    INSERT OR REPLACE INTO sessions (userId, data)
    VALUES (?, ?)
  `).run(String(userId), JSON.stringify(session))
}

export function deleteSession(userId: number) {
  db.prepare('DELETE FROM sessions WHERE userId=?')
    .run(String(userId))
}

export function getAllSessions(): [number, Session][] {
  const rows = db
    .prepare('SELECT userId, data FROM sessions')
    .all() as { userId: string; data: string }[]

  return rows.map(r => [Number(r.userId), JSON.parse(r.data)])
}
