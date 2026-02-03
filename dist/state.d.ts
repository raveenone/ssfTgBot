export type TokenType = 'USDC' | 'USDT';
export type SessionStep = 'idle' | 'select_token' | 'enter_amount' | 'enter_payout' | 'awaiting_payment';
export type Session = {
    step: SessionStep;
    depositAddress?: string;
    tokenType?: TokenType;
    amountUSD?: number;
    payoutAddress?: string;
    creditedSSF?: number;
};
export declare function getSession(userId: number): Session;
export declare function saveSession(userId: number, session: Session): void;
export declare function deleteSession(userId: number): void;
export declare function getAllSessions(): [number, Session][];
//# sourceMappingURL=state.d.ts.map