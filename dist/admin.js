"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPaused = isPaused;
exports.pause = pause;
exports.resume = resume;
let paused = false;
function isPaused() {
    return paused;
}
function pause() {
    paused = true;
}
function resume() {
    paused = false;
}
//# sourceMappingURL=admin.js.map