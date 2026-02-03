import { Connection, PublicKey } from '@solana/web3.js'
import { deriveUserKeypair, getUserATAs, getTokenBalance, sendSSF, sweepToTreasury, USDC_MINT, USDT_MINT } from './solana'
import { getAllSessions, saveSession } from './state'

const PRICE_PER_SSF = 0.25

export function startWatcher(connection: Connection) {
  console.log('👀 Starting on-chain deposit watcher')

  async function check() {
    console.log('sessions loaded:', getAllSessions().length)

    for (const [userId, session] of getAllSessions()) {
      if (!session.tokenType) continue
      if (!session.payoutAddress) continue

      const userKeypair = deriveUserKeypair(userId)
      const atas = getUserATAs(userKeypair.publicKey)

      const ata =
        session.tokenType === 'USDC' ? atas.usdc : atas.usdt

      const balance = await getTokenBalance(connection, ata)

      // ✅ DELTA LOGIC (correct with sweeping)
      const last = session.lastCheckedBalance ?? 0
      const deltaUSD = balance - last

      if (deltaUSD <= 0) {
        session.lastCheckedBalance = balance
        saveSession(userId, session)
        continue
      }

      const deltaSSF = deltaUSD / PRICE_PER_SSF

      console.log(
        `💰 Deposit ${deltaUSD} ${session.tokenType} → sending ${deltaSSF} SSF to user ${userId}`
      )

      await sendSSF(
        new PublicKey(session.payoutAddress),
        deltaSSF
      )

      await sweepToTreasury(
        userKeypair,
        session.tokenType === 'USDC' ? USDC_MINT : USDT_MINT,
        6
      )

      session.lastCheckedBalance = balance
      session.step = 'idle'

      saveSession(userId, session)
    }
  }

  check()
  setInterval(check, 15_000)
}
