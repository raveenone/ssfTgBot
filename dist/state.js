"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = getSession;
exports.saveSession = saveSession;
exports.deleteSession = deleteSession;
exports.getAllSessions = getAllSessions;
const db_1 = require("./db");
// ----------------------------------------
// DB helpers
// ----------------------------------------
function getSession(userId) {
    const row = (0, db_1.dbGet)('SELECT data FROM sessions WHERE userId=?', String(userId));
    if (row) {
        return JSON.parse(row.data);
    }
    const session = { step: 'idle' };
    saveSession(userId, session);
    return session;
}
function saveSession(userId, session) {
    (0, db_1.dbRun)('INSERT OR REPLACE INTO sessions (userId, data) VALUES (?, ?)', String(userId), JSON.stringify(session));
}
function deleteSession(userId) {
    (0, db_1.dbRun)('DELETE FROM sessions WHERE userId=?', String(userId));
}
function getAllSessions() {
    const rows = (0, db_1.dbAll)('SELECT userId, data FROM sessions');
    return rows.map(r => [Number(r.userId), JSON.parse(r.data)]);
}
//# sourceMappingURL=state.js.map