import { Keypair, Connection, PublicKey } from '@solana/web3.js';
export declare const connection: Connection;
export declare const USDC_MINT: PublicKey;
export declare const USDT_MINT: PublicKey;
export declare function deriveUserKeypair(telegramId: number): Keypair;
export declare function getUserATAs(userPubkey: PublicKey): {
    usdc: PublicKey;
    usdt: PublicKey;
};
export declare function getTokenBalance(connection: Connection, ata: PublicKey): Promise<number>;
export declare const treasuryKeypair: Keypair;
export declare const SSF_MINT: PublicKey;
export declare function sendSSF(toOwner: PublicKey, amountSSF: number): Promise<string>;
export declare function sweepToTreasury(ownerKeypair: Keypair, mint: PublicKey, decimals: number): Promise<void>;
export declare function getTreasuryBalances(): Promise<{
    usdc: number;
    usdt: number;
    ssf: number;
}>;
//# sourceMappingURL=solana.d.ts.map