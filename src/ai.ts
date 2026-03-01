import { DIRS, addPos, dirOffset } from './lib'
import type { Entity, Intent, WorldState } from './model'
import { entityBehaviors } from './entity'
import { getCell, passableInto } from './world'

const decideAlienIntent = (entity: Entity, state: WorldState): Intent => {
  if (entity.state.kind !== 'idle') return entity.intent
  const preferred = entity.facing
  const rest = DIRS.filter((d) => d !== preferred)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  const candidates = [preferred, ...rest]

  for (const dir of candidates) {
    const target = addPos(entity.tilePos, dirOffset(dir))
    const cell = getCell(state.grid, target)
    if (!cell || !passableInto(cell, entity.kind)) continue
    // Aliens can walk into the player's cell (to kill them), but not into other aliens
    const blockedByAlien = cell.occupants.values().some((id) => {
      const occ = state.entities.get(id)
      return occ && entityBehaviors[occ.kind].isEnemy
    })
    if (!blockedByAlien) return { kind: 'move', dir }
  }

  return { kind: 'idle' }
}

export const updateAlienIntents = (state: WorldState): void => {
  for (const entity of state.entities.values()) {
    if (entityBehaviors[entity.kind].hasAI) {
      entity.intent = decideAlienIntent(entity, state)
    }
  }
}
