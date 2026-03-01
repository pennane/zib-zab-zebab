import { DIRS, addPos, dirOffset } from './lib'
import type { Entity, Intent, WorldState } from './model'
import { getCell, passableInto } from './world'

const decideAlienIntent = (entity: Entity, state: WorldState): Intent => {
  if (entity.state.kind !== 'idle') return entity.intent
  const preferred = entity.facing
  const candidates = [preferred, ...DIRS.filter((d) => d !== preferred)]

  for (const dir of candidates) {
    const target = addPos(entity.tilePos, dirOffset(dir))
    const cell = getCell(state.grid, target)
    if (cell && passableInto(cell) && cell.occupants.size === 0)
      return { kind: 'move', dir }
  }

  return { kind: 'idle' }
}

export const updateAlienIntents = (state: WorldState): void => {
  for (const entity of state.entities.values()) {
    if (entity.kind === 'alien') {
      entity.intent = decideAlienIntent(entity, state)
    }
  }
}
