import type { Context, Direction, Game, Intent, RawInput } from './model'
import { updateAlienIntents } from './ai'
import { tick } from './entity'
import { tickSurfaces } from './world'

const DIR_ACTIONS = ['up', 'down', 'left', 'right'] as const

const rawInputToIntent = (raw: RawInput): Intent => {
  for (const action of DIR_ACTIONS) {
    if (raw.held.has(action)) {
      return { kind: 'move', dir: action as Direction }
    }
  }
  if (raw.held.has('dig')) return { kind: 'dig' }
  if (raw.held.has('fill')) return { kind: 'fill' }
  return { kind: 'idle' }
}

export const makeGame = (context: Context): Game => {
  return {
    update() {
      const input = context.inputHandler.poll()
      const player = context.state.entities.get(context.state.playerId)
      if (player) player.intent = rawInputToIntent(input)

      tickSurfaces(context.state)
      updateAlienIntents(context.state)
      tick(context.state)
    },
    render(_alpha: number) {
      const snapshot = context.animator.snapshot(context.state)
      context.renderer.render(snapshot)
    }
  }
}
