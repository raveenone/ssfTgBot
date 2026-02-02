import { Connection, PublicKey } from '@solana/web3.js'
import { getSession } from './state'
import { deriveUserKeypair, getUserATAs, getTokenBalance, sendSSF, sweepToTreasury, USDC_MINT, USDT_MINT } from './solana'
import { getAllSessions, saveSession  } from './state'

const PRICE_PER_SSF = 0.25

export function startWatcher(connection: Connection) {
  console.log('👀 Starting on-chain deposit watcher')

  async function check() {
    console.log('sessions loaded:', getAllSessions().length)

    for (const [userId, session] of getAllSessions()) {
      if (session.step !== 'awaiting_payment') continue
      if (session.credited) continue
      if (!session.tokenType) continue

      const userKeypair = deriveUserKeypair(userId)
      const atas = getUserATAs(userKeypair.publicKey)

      const ata =
        session.tokenType === 'USDC' ? atas.usdc : atas.usdt

      const balance = await getTokenBalance(connection, ata)
      const last = session.lastCheckedBalance ?? 0

      if (balance > last) {
        const delta = balance - last
        const ssfAmount = delta / PRICE_PER_SSF

        console.log(
          `💰 Deposit detected for user ${userId}: ${delta} ${session.tokenType}`
        )

        await sendSSF(new PublicKey(session.payoutAddress!), ssfAmount)

        await sweepToTreasury(
          userKeypair,
          session.tokenType === 'USDC' ? USDC_MINT : USDT_MINT,
          6
        )

        session.credited = true
        session.step = 'idle'
        saveSession(userId, session)
      }

      session.lastCheckedBalance = balance
      saveSession(userId, session)
    }
  }

  check() // 🔥 immediate run
  setInterval(check, 15_000)
}
