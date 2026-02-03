import { dbGet, dbAll, dbRun } from './db'

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

  lastCheckedBalance?: number   // required for delta logic
}

// ----------------------------------------
// DB helpers
// ----------------------------------------

export function getSession(userId: number): Session {
  const row = dbGet(
    'SELECT data FROM sessions WHERE userId=?',
    String(userId)
  ) as { data: string } | undefined

  if (row) {
    return JSON.parse(row.data)
  }

  const session: Session = { step: 'idle' }
  saveSession(userId, session)
  return session
}

export function saveSession(userId: number, session: Session) {
  dbRun(
    'INSERT OR REPLACE INTO sessions (userId, data) VALUES (?, ?)',
    String(userId),
    JSON.stringify(session)
  )
}

export function deleteSession(userId: number) {
  dbRun(
    'DELETE FROM sessions WHERE userId=?',
    String(userId)
  )
}

export function getAllSessions(): [number, Session][] {
  const rows = dbAll(
    'SELECT userId, data FROM sessions'
  ) as { userId: string; data: string }[]

  return rows.map(r => [Number(r.userId), JSON.parse(r.data)])
}
