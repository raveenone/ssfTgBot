"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv_1 = __importDefault(require("dotenv"));
const state_1 = require("./state");
const solana_1 = require("./solana");
const watcher_1 = require("./watcher");
const web3_js_1 = require("@solana/web3.js");
const admin_1 = require("./admin");
dotenv_1.default.config();
const ADMINS = new Set([
    6811113433, // ← your telegram id
]);
const ADMIN_ID = Number(process.env.ADMIN_ID);
function isAdmin(userId) {
    return userId === ADMIN_ID;
}
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
}
const bot = new node_telegram_bot_api_1.default(process.env.TELEGRAM_BOT_TOKEN, {
    polling: true,
});
console.log('🤖 SSF Telegram bot started');
(0, watcher_1.startWatcher)(solana_1.connection);
// /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const keypair = (0, solana_1.deriveUserKeypair)(userId);
    const atas = (0, solana_1.getUserATAs)(keypair.publicKey);
    const session = (0, state_1.getSession)(userId);
    session.depositAddress = keypair.publicKey.toBase58();
    session.step = 'awaiting_payment';
    (0, state_1.saveSession)(userId, session);
    await bot.sendMessage(chatId, `👋 Welcome to SSF Presale!

💳 Your personal deposit address:
\`${session.depositAddress}\`

💰 Price: $0.25 / SSF
📉 Minimum: 1 USDC / USDT

Choose how you want to proceed 👇`, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Buy SSF', callback_data: 'BUY_SSF' }],
            ],
        },
    });
});
bot.onText(/\/pause/, async (msg) => {
    if (!msg.from || !isAdmin(msg.from.id))
        return;
    (0, admin_1.pause)();
    await bot.sendMessage(msg.chat.id, '⛔ Presale PAUSED');
});
bot.onText(/\/resume/, async (msg) => {
    if (!msg.from || !isAdmin(msg.from.id))
        return;
    (0, admin_1.resume)();
    await bot.sendMessage(msg.chat.id, '✅ Presale RESUMED');
});
bot.onText(/\/status/, async (msg) => {
    if (!msg.from || !isAdmin(msg.from.id))
        return;
    await bot.sendMessage(msg.chat.id, `Status: ${(0, admin_1.isPaused)() ? '⛔ PAUSED' : '✅ LIVE'}`);
});
bot.onText(/\/balance/, async (msg) => {
    if (!msg.from || !isAdmin(msg.from.id))
        return;
    const bal = await (0, solana_1.getTreasuryBalances)();
    await bot.sendMessage(msg.chat.id, `💰 Treasury
    USDC: ${bal.usdc}
    USDT: ${bal.usdt}
    SSF: ${bal.ssf}`);
});
bot.onText(/\/audit (.+)/, async (msg, match) => {
    if (!msg.from)
        return;
    const adminId = msg.from.id;
    const chatId = msg.chat.id;
    if (!ADMINS.has(adminId)) {
        await bot.sendMessage(chatId, '❌ Not authorized');
        return;
    }
    const targetId = Number(match?.[1]);
    if (!targetId) {
        await bot.sendMessage(chatId, 'Usage: /audit <telegramUserId>');
        return;
    }
    const session = (0, state_1.getSession)(targetId);
    if (!session.depositAddress || !session.tokenType) {
        await bot.sendMessage(chatId, '❌ No active session found');
        return;
    }
    const depositPubkey = new web3_js_1.PublicKey(session.depositAddress);
    const mint = session.tokenType === 'USDC' ? solana_1.USDC_MINT : solana_1.USDT_MINT;
    const { getAssociatedTokenAddressSync } = await Promise.resolve().then(() => __importStar(require('@solana/spl-token')));
    const ata = getAssociatedTokenAddressSync(mint, depositPubkey);
    const balance = await (0, solana_1.getTokenBalance)(solana_1.connection, ata);
    const last = session.lastCheckedBalance ?? 0;
    const deltaPaid = balance - last;
    const ssfDue = deltaPaid > 0 ? deltaPaid / 0.25 : 0;
    await bot.sendMessage(chatId, `📊 *Audit Report*

👤 User: ${targetId}
💳 Deposit: \`${session.depositAddress}\`
🪙 Token: ${session.tokenType}

💰 Current deposit balance: ${balance}
🧾 Last processed balance: ${last}
⚠️ Pending payout: ${ssfDue} SSF

📍 Step: ${session.step}
`, { parse_mode: 'Markdown' });
});
// Button handler
bot.on('callback_query', async (query) => {
    if (!query.message || !query.from)
        return;
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const session = (0, state_1.getSession)(userId);
    if (query.data === 'BUY_SSF') {
        if ((0, admin_1.isPaused)()) {
            await bot.sendMessage(chatId, '⛔ Presale is temporarily paused. Please try again later.');
            return;
        }
        session.step = 'select_token';
        await bot.sendMessage(chatId, 'Select payment token:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'USDC (Solana)', callback_data: 'TOKEN_USDC' }],
                    [{ text: 'USDT (Solana)', callback_data: 'TOKEN_USDT' }],
                ],
            },
        });
    }
});
// Token selection
bot.on('callback_query', async (query) => {
    if (!query.message || !query.from)
        return;
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const session = (0, state_1.getSession)(userId);
    if (query.data === 'TOKEN_USDC' || query.data === 'TOKEN_USDT') {
        session.tokenType = query.data === 'TOKEN_USDC' ? 'USDC' : 'USDT';
        session.step = 'enter_amount';
        (0, state_1.saveSession)(userId, session);
        await bot.sendMessage(chatId, `Enter amount in USD (minimum $1):`);
    }
});
// Amount input
bot.on('message', async (msg) => {
    if (!msg.text || !msg.from)
        return;
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const session = (0, state_1.getSession)(userId);
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
        (0, state_1.saveSession)(userId, session);
        await bot.sendMessage(chatId, `🔐 Please paste your *Solana wallet address* where you want to receive SSF tokens:`, { parse_mode: 'Markdown' });
        return;
    }
    // -----------------------------
    // ENTER PAYOUT ADDRESS
    // -----------------------------
    if (session.step === 'enter_payout') {
        try {
            new web3_js_1.PublicKey(msg.text);
        }
        catch {
            await bot.sendMessage(chatId, '❌ Invalid Solana address. Please try again.');
            return;
        }
        session.payoutAddress = msg.text;
        session.step = 'awaiting_payment';
        (0, state_1.saveSession)(userId, session);
        const ssfAmount = session.amountUSD / 0.25;
        await bot.sendMessage(chatId, `✅ *Order Summary*

💵 Amount: *${session.amountUSD} ${session.tokenType}*
🎯 You will receive: *${ssfAmount} SSF*

Send funds to:
\`${session.depositAddress}\`

SSF will be sent automatically to:
\`${session.payoutAddress}\``, { parse_mode: 'Markdown' });
        return;
    }
});
//# sourceMappingURL=bot.js.map