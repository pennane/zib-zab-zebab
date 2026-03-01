import type { InputHandler } from './model'

export const makeInputHandler = (): InputHandler => {
  const held = new Set<string>()

  window.addEventListener('keydown', (e) => held.add(e.code))
  window.addEventListener('keyup', (e) => held.delete(e.code))

  return {
    poll() {
      return { held }
    },
    toIntent(raw) {}
  }
}
