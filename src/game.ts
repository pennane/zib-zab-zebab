import type { Context, Direction, Game, Intent, RawInput } from './model'
import { updateAlienIntents } from './ai'
import { tick } from './entity'

const DIR_ACTIONS = ['up', 'down', 'left', 'right'] as const

const rawInputToIntent = (raw: RawInput): Intent => {
  for (const action of DIR_ACTIONS) {
    if (raw.held.has(action)) {
      return { kind: 'move', dir: action as Direction }
    }
  }
  return { kind: 'idle' }
}

export const makeGame = (context: Context): Game => {
  return {
    update() {
      const input = context.inputHandler.poll()
      const player = context.state.entities.get(context.state.playerId)
      if (player) player.intent = rawInputToIntent(input)

      updateAlienIntents(context.state)
      tick(context.state)
    },
    render(_alpha: number) {
      context.renderer.render(context.state)
    }
  }
}
