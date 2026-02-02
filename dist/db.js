"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbGet = dbGet;
exports.dbAll = dbAll;
exports.dbRun = dbRun;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const db = new better_sqlite3_1.default('sessions.db'); // NOT exported
db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  userId TEXT PRIMARY KEY,
  data TEXT NOT NULL
)
`);
// ---------------------------------
// Safe wrappers
// ---------------------------------
function dbGet(sql, ...params) {
    return db.prepare(sql).get(...params);
}
function dbAll(sql, ...params) {
    return db.prepare(sql).all(...params);
}
function dbRun(sql, ...params) {
    return db.prepare(sql).run(...params);
}
//# sourceMappingURL=db.js.map