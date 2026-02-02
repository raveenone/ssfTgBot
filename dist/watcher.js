"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWatcher = startWatcher;
const web3_js_1 = require("@solana/web3.js");
const solana_1 = require("./solana");
const state_1 = require("./state");
const PRICE_PER_SSF = 0.25;
function startWatcher(connection) {
    console.log('👀 Starting on-chain deposit watcher');
    async function check() {
        console.log('sessions loaded:', (0, state_1.getAllSessions)().length);
        for (const [userId, session] of (0, state_1.getAllSessions)()) {
            if (session.step !== 'awaiting_payment')
                continue;
            if (session.credited)
                continue;
            if (!session.tokenType)
                continue;
            const userKeypair = (0, solana_1.deriveUserKeypair)(userId);
            const atas = (0, solana_1.getUserATAs)(userKeypair.publicKey);
            const ata = session.tokenType === 'USDC' ? atas.usdc : atas.usdt;
            const balance = await (0, solana_1.getTokenBalance)(connection, ata);
            const last = session.lastCheckedBalance ?? 0;
            if (balance > last) {
                const delta = balance - last;
                const ssfAmount = delta / PRICE_PER_SSF;
                console.log(`💰 Deposit detected for user ${userId}: ${delta} ${session.tokenType}`);
                await (0, solana_1.sendSSF)(new web3_js_1.PublicKey(session.payoutAddress), ssfAmount);
                await (0, solana_1.sweepToTreasury)(userKeypair, session.tokenType === 'USDC' ? solana_1.USDC_MINT : solana_1.USDT_MINT, 6);
                session.credited = true;
                session.step = 'idle';
                (0, state_1.saveSession)(userId, session);
            }
            session.lastCheckedBalance = balance;
            (0, state_1.saveSession)(userId, session);
        }
    }
    check(); // 🔥 immediate run
    setInterval(check, 15000);
}
//# sourceMappingURL=watcher.js.map