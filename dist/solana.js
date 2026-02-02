"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSF_MINT = exports.treasuryKeypair = exports.USDT_MINT = exports.USDC_MINT = exports.connection = void 0;
exports.deriveUserKeypair = deriveUserKeypair;
exports.getUserATAs = getUserATAs;
exports.getTokenBalance = getTokenBalance;
exports.sendSSF = sendSSF;
exports.sweepToTreasury = sweepToTreasury;
exports.getTreasuryBalances = getTreasuryBalances;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const crypto_1 = __importDefault(require("crypto"));
const RPC_URL = 'https://api.mainnet-beta.solana.com';
if (!process.env.SOLANA_RPC) {
    throw new Error('SOLANA_RPC missing in .env');
}
exports.connection = new web3_js_1.Connection(process.env.SOLANA_RPC, 'confirmed');
// ⚠️ Store this securely later (env / vault)
const MASTER_SEED = process.env.MASTER_SEED || 'ssf-super-secret-seed';
// Solana mints
exports.USDC_MINT = new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
exports.USDT_MINT = new web3_js_1.PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
// Deterministic keypair per Telegram user
function deriveUserKeypair(telegramId) {
    const hash = crypto_1.default
        .createHash('sha256')
        .update(`${MASTER_SEED}:${telegramId}`)
        .digest();
    return web3_js_1.Keypair.fromSeed(hash.slice(0, 32));
}
// Get token accounts
function getUserATAs(userPubkey) {
    return {
        usdc: (0, spl_token_1.getAssociatedTokenAddressSync)(exports.USDC_MINT, userPubkey),
        usdt: (0, spl_token_1.getAssociatedTokenAddressSync)(exports.USDT_MINT, userPubkey),
    };
}
async function getTokenBalance(connection, ata) {
    try {
        const balance = await connection.getTokenAccountBalance(ata);
        return balance.value.uiAmount ?? 0;
    }
    catch {
        return 0;
    }
}
// ===== Treasury setup =====
if (!process.env.TREASURY_PRIVATE_KEY) {
    throw new Error('TREASURY_PRIVATE_KEY missing in .env');
}
const treasurySecret = JSON.parse(process.env.TREASURY_PRIVATE_KEY);
exports.treasuryKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(treasurySecret));
// Your SSF mint
if (!process.env.SSF_MINT) {
    throw new Error('SSF_MINT missing in .env');
}
exports.SSF_MINT = new web3_js_1.PublicKey(process.env.SSF_MINT);
async function sendSSF(toOwner, amountSSF) {
    const connection = exports.connection;
    const treasuryATA = (0, spl_token_1.getAssociatedTokenAddressSync)(exports.SSF_MINT, exports.treasuryKeypair.publicKey);
    const userATA = (0, spl_token_1.getAssociatedTokenAddressSync)(exports.SSF_MINT, toOwner);
    const tx = new web3_js_1.Transaction();
    // create ATA if user doesn't have one
    const info = await connection.getAccountInfo(userATA);
    if (!info) {
        tx.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(exports.treasuryKeypair.publicKey, userATA, toOwner, exports.SSF_MINT));
    }
    const decimals = 6; // ← change if your SSF uses 9
    const rawAmount = BigInt(Math.floor(amountSSF * 10 ** decimals));
    tx.add((0, spl_token_1.createTransferInstruction)(treasuryATA, userATA, exports.treasuryKeypair.publicKey, rawAmount, [], spl_token_1.TOKEN_PROGRAM_ID));
    const sig = await (0, web3_js_1.sendAndConfirmTransaction)(connection, tx, [exports.treasuryKeypair]);
    console.log(`✅ Sent ${amountSSF} SSF → ${toOwner.toBase58()}`);
    return sig;
}
async function sweepToTreasury(ownerKeypair, mint, decimals) {
    const fromATA = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, ownerKeypair.publicKey);
    const treasuryATA = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, exports.treasuryKeypair.publicKey);
    const bal = await exports.connection.getTokenAccountBalance(fromATA);
    if (!bal.value.uiAmount || bal.value.uiAmount === 0)
        return;
    const raw = BigInt(Math.floor(bal.value.uiAmount * 10 ** decimals));
    const tx = new web3_js_1.Transaction().add((0, spl_token_1.createTransferInstruction)(fromATA, treasuryATA, ownerKeypair.publicKey, raw));
    await (0, web3_js_1.sendAndConfirmTransaction)(exports.connection, tx, [
        exports.treasuryKeypair, // pays gas
        ownerKeypair // authority
    ]);
    console.log(`🏦 Swept ${bal.value.uiAmount} to treasury`);
}
async function getTreasuryBalances() {
    const usdcATA = (0, spl_token_1.getAssociatedTokenAddressSync)(exports.USDC_MINT, exports.treasuryKeypair.publicKey);
    const usdtATA = (0, spl_token_1.getAssociatedTokenAddressSync)(exports.USDT_MINT, exports.treasuryKeypair.publicKey);
    const ssfATA = (0, spl_token_1.getAssociatedTokenAddressSync)(exports.SSF_MINT, exports.treasuryKeypair.publicKey);
    const [usdc, usdt, ssf] = await Promise.all([
        getTokenBalance(exports.connection, usdcATA),
        getTokenBalance(exports.connection, usdtATA),
        getTokenBalance(exports.connection, ssfATA),
    ]);
    return { usdc, usdt, ssf };
}
//# sourceMappingURL=solana.js.map