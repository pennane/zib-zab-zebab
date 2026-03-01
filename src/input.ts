import type { Action, RawInput } from './model'

export const makeInputHandler = () => {
  const held = new Set<Action>()
  const justPressed = new Set<Action>()
  const justReleased = new Set<Action>()

  return {
    press(action: Action) {
      if (!held.has(action)) justPressed.add(action)
      held.add(action)
    },

    release(action: Action) {
      held.delete(action)
      justReleased.add(action)
    },

    poll(): RawInput {
      const raw: RawInput = {
        held: new Set(held),
        pressed: new Set(justPressed),
        released: new Set(justReleased)
      }
      justPressed.clear()
      justReleased.clear()
      return raw
    }
  }
}
