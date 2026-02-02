import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { getSession, saveSession } from './state';
import { deriveUserKeypair, getUserATAs, connection, getTreasuryBalances } from './solana'

import { startWatcher } from './watcher'

import { PublicKey } from '@solana/web3.js'

import { isPaused, pause, resume } from './admin'

dotenv.config();

const ADMIN_ID = Number(process.env.ADMIN_ID)

function isAdmin(userId: number) {
  return userId === ADMIN_ID
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN');
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

console.log('🤖 SSF Telegram bot started');

startWatcher(connection)

// /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from!.id

  const keypair = deriveUserKeypair(userId)
  const atas = getUserATAs(keypair.publicKey)

  const session = getSession(userId)
  session.depositAddress = keypair.publicKey.toBase58()
  session.step = 'awaiting_payment'
  saveSession(userId, session)

  await bot.sendMessage(
  chatId,
  `👋 Welcome to SSF Presale!

💳 Your personal deposit address:
\`${session.depositAddress}\`

💰 Price: $0.25 / SSF
📉 Minimum: 1 USDC / USDT

Choose how you want to proceed 👇`,
  {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Buy SSF', callback_data: 'BUY_SSF' }],
      ],
    },
  }
)
});

bot.onText(/\/pause/, async (msg) => {
  if (!msg.from || !isAdmin(msg.from.id)) return

  pause()
  await bot.sendMessage(msg.chat.id, '⛔ Presale PAUSED')
});

bot.onText(/\/resume/, async (msg) => {
  if (!msg.from || !isAdmin(msg.from.id)) return

  resume()
  await bot.sendMessage(msg.chat.id, '✅ Presale RESUMED')
});

bot.onText(/\/status/, async (msg) => {
  if (!msg.from || !isAdmin(msg.from.id)) return

  await bot.sendMessage(
    msg.chat.id,
    `Status: ${isPaused() ? '⛔ PAUSED' : '✅ LIVE'}`
  )
});

bot.onText(/\/balance/, async (msg) => {
    if (!msg.from || !isAdmin(msg.from.id)) return

    const bal = await getTreasuryBalances()

    await bot.sendMessage(
        msg.chat.id,
    `💰 Treasury
    USDC: ${bal.usdc}
    USDT: ${bal.usdt}
    SSF: ${bal.ssf}`
    )
});


// Button handler
bot.on('callback_query', async (query) => {
  if (!query.message || !query.from) return;

  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const session = getSession(userId);

  if (query.data === 'BUY_SSF') {

    if (isPaused()) {
        await bot.sendMessage(
        chatId,
        '⛔ Presale is temporarily paused. Please try again later.'
        )
        return
    }

    session.step = 'select_token';

    await bot.sendMessage(
      chatId,
      'Select payment token:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'USDC (Solana)', callback_data: 'TOKEN_USDC' }],
            [{ text: 'USDT (Solana)', callback_data: 'TOKEN_USDT' }],
          ],
        },
      }
    );
  }
});

// Token selection
bot.on('callback_query', async (query) => {
  if (!query.message || !query.from) return;

  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const session = getSession(userId);

  if (query.data === 'TOKEN_USDC' || query.data === 'TOKEN_USDT') {
    session.tokenType = query.data === 'TOKEN_USDC' ? 'USDC' : 'USDT';
    session.step = 'enter_amount';
    saveSession(userId, session)

    await bot.sendMessage(
      chatId,
      `Enter amount in USD (minimum $1):`
    );
  }
});

// Amount input
bot.on('message', async (msg) => {
  if (!msg.text || !msg.from) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = getSession(userId);

  // -----------------------------
  // ENTER AMOUNT
  // -----------------------------
  if (session.step === 'enter_amount') {
    const amount = Number(msg.text);

    if (isNaN(amount) || amount < 1) {
      await bot.sendMessage(chatId, '❌ Please enter a valid amount (minimum $1).');
      return;
    }

    session.amountUSD = amount;
    session.step = 'enter_payout';
    saveSession(userId, session)

    await bot.sendMessage(
      chatId,
      `🔐 Please paste your *Solana wallet address* where you want to receive SSF tokens:`,
      { parse_mode: 'Markdown' }
    );

    return;
  }

  // -----------------------------
  // ENTER PAYOUT ADDRESS
  // -----------------------------
  if (session.step === 'enter_payout') {
    try {
      new PublicKey(msg.text);
    } catch {
      await bot.sendMessage(chatId, '❌ Invalid Solana address. Please try again.');
      return;
    }

    session.payoutAddress = msg.text;
    session.step = 'awaiting_payment';
    saveSession(userId, session)

    const ssfAmount = session.amountUSD! / 0.25;

    await bot.sendMessage(
      chatId,
      `✅ *Order Summary*

💵 Amount: *${session.amountUSD} ${session.tokenType}*
🎯 You will receive: *${ssfAmount} SSF*

Send funds to:
\`${session.depositAddress}\`

SSF will be sent automatically to:
\`${session.payoutAddress}\``,
      { parse_mode: 'Markdown' }
    );

    return;
  }
});
