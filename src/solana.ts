import dotenv from 'dotenv'
dotenv.config()

import { Keypair, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID } from '@solana/spl-token'
import crypto from 'crypto'

const RPC_URL = 'https://api.mainnet-beta.solana.com'

if (!process.env.SOLANA_RPC) {
  throw new Error('SOLANA_RPC missing in .env')
}

export const connection = new Connection(process.env.SOLANA_RPC, 'confirmed')

// ⚠️ Store this securely later (env / vault)
const MASTER_SEED = process.env.MASTER_SEED || 'ssf-super-secret-seed'

// Solana mints
export const USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
)
export const USDT_MINT = new PublicKey(
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
)

// Deterministic keypair per Telegram user
export function deriveUserKeypair(telegramId: number): Keypair {
  const hash = crypto
    .createHash('sha256')
    .update(`${MASTER_SEED}:${telegramId}`)
    .digest()

  return Keypair.fromSeed(hash.slice(0, 32))
}

// Get token accounts
export function getUserATAs(userPubkey: PublicKey) {
  return {
    usdc: getAssociatedTokenAddressSync(USDC_MINT, userPubkey),
    usdt: getAssociatedTokenAddressSync(USDT_MINT, userPubkey),
  }
}

export async function getTokenBalance(
  connection: Connection,
  ata: PublicKey
): Promise<number> {
  try {
    const balance = await connection.getTokenAccountBalance(ata)
    return balance.value.uiAmount ?? 0
  } catch {
    return 0
  }
}

// ===== Treasury setup =====
if (!process.env.TREASURY_PRIVATE_KEY) {
  throw new Error('TREASURY_PRIVATE_KEY missing in .env')
}

const treasurySecret = JSON.parse(process.env.TREASURY_PRIVATE_KEY)

export const treasuryKeypair = Keypair.fromSecretKey(
  Uint8Array.from(treasurySecret)
)

// Your SSF mint
if (!process.env.SSF_MINT) {
  throw new Error('SSF_MINT missing in .env')
}

export const SSF_MINT = new PublicKey(process.env.SSF_MINT)

export async function sendSSF(
  toOwner: PublicKey,
  amountSSF: number
): Promise<string> {
  const connection = exports.connection

  const treasuryATA = getAssociatedTokenAddressSync(
    SSF_MINT,
    treasuryKeypair.publicKey
  )

  const userATA = getAssociatedTokenAddressSync(
    SSF_MINT,
    toOwner
  )

  const tx = new Transaction()

  // create ATA if user doesn't have one
  const info = await connection.getAccountInfo(userATA)
  if (!info) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        treasuryKeypair.publicKey,
        userATA,
        toOwner,
        SSF_MINT
      )
    )
  }

  const decimals = 6 // ← change if your SSF uses 9

  const rawAmount = BigInt(
    Math.floor(amountSSF * 10 ** decimals)
  )

  tx.add(
    createTransferInstruction(
      treasuryATA,
      userATA,
      treasuryKeypair.publicKey,
      rawAmount,
      [],
      TOKEN_PROGRAM_ID
    )
  )

  const sig = await sendAndConfirmTransaction(
    connection,
    tx,
    [treasuryKeypair]
  )

  console.log(`✅ Sent ${amountSSF} SSF → ${toOwner.toBase58()}`)

  return sig
}

export async function sweepToTreasury(
  ownerKeypair: Keypair,
  mint: PublicKey,
  decimals: number
) {
  const fromATA = getAssociatedTokenAddressSync(mint, ownerKeypair.publicKey)

  const treasuryATA = getAssociatedTokenAddressSync(
    mint,
    treasuryKeypair.publicKey
  )

  const bal = await connection.getTokenAccountBalance(fromATA)
  if (!bal.value.uiAmount || bal.value.uiAmount === 0) return

  const raw = BigInt(Math.floor(bal.value.uiAmount * 10 ** decimals))

  const tx = new Transaction().add(
    createTransferInstruction(
      fromATA,
      treasuryATA,
      ownerKeypair.publicKey,
      raw
    )
  )

  await sendAndConfirmTransaction(connection, tx, [
    treasuryKeypair, // pays gas
    ownerKeypair     // authority
  ])

  console.log(`🏦 Swept ${bal.value.uiAmount} to treasury`)
}