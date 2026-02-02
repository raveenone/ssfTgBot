let paused = false

export function isPaused() {
  return paused
}

export function pause() {
  paused = true
}

export function resume() {
  paused = false
}