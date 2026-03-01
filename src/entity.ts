import { addPos, dirOffset } from './lib'
import type { Entity, EntityState, GameEvent, WorldState } from './model'
import { getCell, moveTo, passableInto } from './world'

const WALK_SPEED = 0.1
const DIG_SPEED = 0.05
const FILL_SPEED = 0.05
const FALL_SPEED = 0.15

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
    if (!cell || !passableInto(cell, entity.kind) || cell.occupants.size > 0) return false
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
      entity.intent = { kind: 'idle' }

      events.push({ kind: 'entity_moved', entityId: entity.id, from, to, dir })

      const cell = getCell(state.grid, to)
      if (
        cell &&
        cell.surface.kind === 'floor' &&
        cell.surface.dig.kind === 'open' &&
        entity.kind === 'alien'
      ) {
        entity.state = { kind: 'falling', progress: 0 }
      } else {
        entity.state = { kind: 'idle' }
      }
    }
  }
}

const digging: StateHandler & {
  enter(entity: Entity, state: WorldState): boolean
} = {
  enter(entity, state) {
    if (entity.kind !== 'player') return false
    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)
    if (
      !cell ||
      cell.surface.kind !== 'floor' ||
      cell.surface.dig.kind !== 'intact'
    )
      return false
    entity.state = { kind: 'digging', dir: entity.facing, progress: 0 }
    cell.surface.dig = { kind: 'digging', progress: 0 }
    return true
  },

  tick(entity, state, _events) {
    if (entity.state.kind !== 'digging') return

    entity.state.progress += DIG_SPEED

    const target = addPos(entity.tilePos, dirOffset(entity.state.dir))
    const cell = getCell(state.grid, target)

    if (cell && cell.surface.kind === 'floor') {
      if (cell.surface.dig.kind === 'digging') {
        cell.surface.dig.progress = entity.state.progress
      }

      if (entity.state.progress >= 1) {
        cell.surface.dig = { kind: 'open', progress: 0 }
        entity.state = { kind: 'idle' }
        entity.intent = { kind: 'idle' }
      }
    }
  }
}

const filling: StateHandler & {
  enter(entity: Entity, state: WorldState): boolean
} = {
  enter(entity, state) {
    if (entity.kind !== 'player') return false
    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)
    if (
      !cell ||
      cell.surface.kind !== 'floor' ||
      cell.surface.dig.kind !== 'open'
    )
      return false
    entity.state = { kind: 'filling', progress: 0 }
    cell.surface.dig = { kind: 'filling', progress: 0 }
    return true
  },

  tick(entity, state, _events) {
    if (entity.state.kind !== 'filling') return

    entity.state.progress += FILL_SPEED

    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)

    if (cell && cell.surface.kind === 'floor') {
      if (cell.surface.dig.kind === 'filling') {
        cell.surface.dig.progress = entity.state.progress
      }

      if (entity.state.progress >= 1) {
        cell.surface.dig = { kind: 'intact' }
        entity.state = { kind: 'idle' }
        entity.intent = { kind: 'idle' }

        // Remove any trapped aliens on the filled cell
        for (const occupantId of cell.occupants) {
          const occupant = state.entities.get(occupantId)
          if (
            occupant &&
            occupant.kind === 'alien' &&
            occupant.state.kind === 'trapped'
          ) {
            cell.occupants.delete(occupantId)
            state.entities.delete(occupantId)
          }
        }
      }
    }
  }
}

const falling: StateHandler = {
  tick(entity, _state, _events) {
    if (entity.state.kind !== 'falling') return

    entity.state.progress += FALL_SPEED

    if (entity.state.progress >= 1) {
      entity.state = { kind: 'trapped' }
    }
  }
}

const trapped: StateHandler = {
  tick(_entity, _state, _events) {
    // stuck until hole is filled
  }
}

const dead: StateHandler = {
  tick(_entity, _state, _events) {
    // no-op
  }
}

const idle: StateHandler = {
  tick(entity, state, _events) {
    switch (entity.intent.kind) {
      case 'move':
        walking.enter(entity, state)
        break
      case 'dig':
        digging.enter(entity, state)
        break
      case 'fill':
        filling.enter(entity, state)
        break
    }
  }
}

const handlers: Record<EntityState['kind'], StateHandler> = {
  idle,
  walking,
  digging,
  filling,
  falling,
  trapped,
  dead
}

export const tick = (state: WorldState): GameEvent[] => {
  const events: GameEvent[] = []
  for (const entity of state.entities.values()) {
    handlers[entity.state.kind].tick(entity, state, events)
  }
  return events
}
