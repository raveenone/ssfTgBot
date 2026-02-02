"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const solana_1 = require("./solana");
const connection = new web3_js_1.Connection(process.env.SOLANA_RPC, 'confirmed');
// 👇 CHANGE THESE
const telegramUserId = 6811113433;
const destination = new web3_js_1.PublicKey('447inyyXs3Fy4UgxiTyzTi4JqiPNETwHamEwQ1voJcdS');
// mints
const USDC = new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const SSF = new web3_js_1.PublicKey(process.env.SSF_MINT);
async function sweep(mint, decimals) {
    const userKeypair = (0, solana_1.deriveUserKeypair)(telegramUserId);
    const fromATA = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, userKeypair.publicKey);
    const toATA = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, destination);
    const bal = await connection.getTokenAccountBalance(fromATA);
    if (!bal.value.uiAmount)
        return;
    const raw = BigInt(Math.floor(bal.value.uiAmount * 10 ** decimals));
    const tx = new web3_js_1.Transaction();
    const info = await connection.getAccountInfo(toATA);
    if (!info) {
        tx.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(solana_1.treasuryKeypair.publicKey, // payer
        toATA, destination, mint));
    }
    tx.add((0, spl_token_1.createTransferInstruction)(fromATA, toATA, userKeypair.publicKey, // authority
    raw));
    await (0, web3_js_1.sendAndConfirmTransaction)(connection, tx, [solana_1.treasuryKeypair, userKeypair] // BOTH sign
    );
}
async function main() {
    await sweep(USDC, 6);
    await sweep(SSF, 6);
}
main();
//# sourceMappingURL=recover.js.map