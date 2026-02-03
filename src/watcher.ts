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
        // allow deposits anytime after payout address is known
        if (!session.tokenType) continue
        if (!session.payoutAddress) continue

        const userKeypair = deriveUserKeypair(userId)
        const atas = getUserATAs(userKeypair.publicKey)

        const ata =
        session.tokenType === 'USDC' ? atas.usdc : atas.usdt

        const balance = await getTokenBalance(connection, ata)

        // ⭐ total paid by user
        const totalPaid = balance

        // ⭐ total SSF they SHOULD have
        const expectedSSF = totalPaid / PRICE_PER_SSF

        // ⭐ already credited
        const alreadySent = session.creditedSSF ?? 0

        // ⭐ what we still owe
        const deltaSSF = expectedSSF - alreadySent

        if (deltaSSF > 0.000001) {
        console.log(
            `💰 Paying ${deltaSSF} SSF to user ${userId}`
        )

        await sendSSF(
            new PublicKey(session.payoutAddress),
            deltaSSF
        )

        // sweep funds to treasury
        await sweepToTreasury(
            userKeypair,
            session.tokenType === 'USDC' ? USDC_MINT : USDT_MINT,
            6
        )

        session.creditedSSF = expectedSSF
        session.step = 'idle'

        saveSession(userId, session)
        }
    }
  }

  check() // 🔥 immediate run
  setInterval(check, 15_000)
}
