import { addPos, dirOffset } from './lib'
import type { Entity, EntityState, GameEvent, WorldState } from './model'
import { getCell, moveTo, passableInto } from './world'

const WALK_SPEED = 0.1

type StateHandler = {
  tick(entity: Entity, state: WorldState, events: GameEvent[]): void
}

const walking: StateHandler & {
  enter(entity: Entity, state: WorldState): boolean
} = {
  enter(entity, state) {
    if (entity.intent.kind !== 'move') return false
    const dir = entity.intent.dir
    entity.facing = dir
    const target = addPos(entity.tilePos, dirOffset(dir))
    const cell = getCell(state.grid, target)
    if (!cell || !passableInto(cell) || cell.occupants.size > 0) return false
    entity.state = { kind: 'walking', dir, progress: 0 }
    return true
  },

  tick(entity, state, events) {
    if (entity.state.kind !== 'walking') return

    entity.state.progress += WALK_SPEED

    if (entity.state.progress >= 1) {
      const dir = entity.state.dir
      const from = entity.tilePos
      const to = addPos(from, dirOffset(dir))

      moveTo(state, entity.id, from, to)

      entity.tilePos = to
      entity.state = { kind: 'idle' }
      entity.intent = { kind: 'idle' }

      events.push({ kind: 'entity_moved', entityId: entity.id, from, to, dir })
    }
  }
}

const idle: StateHandler = {
  tick(entity, state, _events) {
    if (entity.intent.kind === 'move') walking.enter(entity, state)
  }
}

const handlers: Record<EntityState['kind'], StateHandler> = { idle, walking }

export const tick = (state: WorldState): GameEvent[] => {
  const events: GameEvent[] = []
  for (const entity of state.entities.values()) {
    handlers[entity.state.kind].tick(entity, state, events)
  }
  return events
}
