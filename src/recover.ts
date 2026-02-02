import dotenv from 'dotenv'
dotenv.config()

import { Keypair, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token'

import { deriveUserKeypair, treasuryKeypair } from './solana'

const connection = new Connection(process.env.SOLANA_RPC!, 'confirmed')

// 👇 CHANGE THESE
const telegramUserId = 6811113433
const destination = new PublicKey('447inyyXs3Fy4UgxiTyzTi4JqiPNETwHamEwQ1voJcdS')

// mints
const USDC = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const SSF  = new PublicKey(process.env.SSF_MINT!)

async function sweep(mint: PublicKey, decimals: number) {
  const userKeypair = deriveUserKeypair(telegramUserId)

  const fromATA = getAssociatedTokenAddressSync(mint, userKeypair.publicKey)
  const toATA   = getAssociatedTokenAddressSync(mint, destination)

  const bal = await connection.getTokenAccountBalance(fromATA)
  if (!bal.value.uiAmount) return

  const raw = BigInt(Math.floor(bal.value.uiAmount * 10 ** decimals))

  const tx = new Transaction()

  const info = await connection.getAccountInfo(toATA)
  if (!info) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        treasuryKeypair.publicKey, // payer
        toATA,
        destination,
        mint
      )
    )
  }

  tx.add(
    createTransferInstruction(
      fromATA,
      toATA,
      userKeypair.publicKey, // authority
      raw
    )
  )

  await sendAndConfirmTransaction(
    connection,
    tx,
    [treasuryKeypair, userKeypair] // BOTH sign
  )
}

async function main() {
  await sweep(USDC, 6)
  await sweep(SSF, 6)
}

main()
