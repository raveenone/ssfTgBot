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

export const sessions = new Map<number, Session>()

export function getSession(userId: number): Session {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: 'idle' })
  }
  return sessions.get(userId)!
}

export function resetSession(userId: number) {
  sessions.delete(userId)
}
