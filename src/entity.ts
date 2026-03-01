import { addPos, dirOffset } from './lib'
import type { Cell, Entity, EntityKind, EntityState, GameEvent, Intent, WorldState } from './model'
import { getCell, moveTo, passableInto, surfaceBehaviors } from './world'

const WALK_SPEED = 0.07
const DIG_SPEED = 0.012
const FILL_SPEED = 0.015
const FALL_SPEED = 0.15

type EntityBehavior = {
  canDig: boolean
  canFill: boolean
  canEnterOccupied: (cell: Cell, state: WorldState) => boolean
  onWalkArrival: (entity: Entity, state: WorldState, events: GameEvent[]) => void
  isEnemy: boolean
  hasAI: boolean
  canWalkOnHoles: boolean
}

export const entityBehaviors: Record<EntityKind, EntityBehavior> = {
  player: {
    canDig: true,
    canFill: true,
    canEnterOccupied: () => false,
    onWalkArrival() {},
    isEnemy: false,
    hasAI: false,
    canWalkOnHoles: false
  },
  alien: {
    canDig: false,
    canFill: false,
    canEnterOccupied: (cell, state) => {
      return !cell.occupants.values().some((id) => {
        const occ = state.entities.get(id)
        return occ && entityBehaviors[occ.kind].isEnemy
      })
    },
    onWalkArrival(entity, state, events) {
      const player = state.entities.get(state.playerId)
      if (player && player.tilePos.x === entity.tilePos.x && player.tilePos.y === entity.tilePos.y) {
        events.push({ kind: 'player_died', entityId: state.playerId, cause: 'caught_by_alien' })
      }
    },
    isEnemy: true,
    hasAI: true,
    canWalkOnHoles: true
  }
}

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
    if (!cell || !passableInto(cell, entity.kind)) return false
    if (cell.occupants.size > 0 && !entityBehaviors[entity.kind].canEnterOccupied(cell, state)) return false
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

      entityBehaviors[entity.kind].onWalkArrival(entity, state, events)

      const cell = getCell(state.grid, to)
      entity.state = cell
        ? surfaceBehaviors[cell.surface.kind].onEntityArrival(cell)
        : { kind: 'idle' }
    }
  }
}

const digging: StateHandler & {
  enter(entity: Entity, state: WorldState): boolean
} = {
  enter(entity, state) {
    if (!entityBehaviors[entity.kind].canDig) return false
    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)
    if (!cell || cell.surface.kind !== 'floor') return false
    const dig = cell.surface.dig
    if (dig.kind === 'digging') {
      // Resume from cell's current progress
      entity.state = { kind: 'digging', dir: entity.facing, progress: dig.progress }
      return true
    }
    if (dig.kind === 'filling') {
      // Revoke partial fill — convert back to digging at matching progress
      const startProgress = 1 - dig.progress
      entity.state = { kind: 'digging', dir: entity.facing, progress: startProgress }
      cell.surface.dig = { kind: 'digging', progress: startProgress }
      return true
    }
    if (dig.kind === 'intact' || dig.kind === 'closing') {
      entity.state = { kind: 'digging', dir: entity.facing, progress: 0 }
      cell.surface.dig = { kind: 'digging', progress: 0 }
      return true
    }
    return false
  },

  tick(entity, state, _events) {
    if (entity.state.kind !== 'digging') return

    // Player released dig — go idle, leave hole as-is
    if (entity.intent.kind !== 'dig') {
      entity.state = { kind: 'idle' }
      return
    }

    const target = addPos(entity.tilePos, dirOffset(entity.state.dir))
    const cell = getCell(state.grid, target)

    // Cell was destroyed (e.g. alien walked over it) — stop digging
    if (!cell || cell.surface.kind !== 'floor' || cell.surface.dig.kind !== 'digging') {
      entity.state = { kind: 'idle' }
      return
    }

    entity.state.progress += DIG_SPEED
    cell.surface.dig.progress = entity.state.progress

    if (entity.state.progress >= 1) {
      cell.surface.dig = { kind: 'open', progress: 0 }
      entity.state = { kind: 'idle' }
      entity.intent = { kind: 'idle' }
    }
  }
}

const filling: StateHandler & {
  enter(entity: Entity, state: WorldState): boolean
} = {
  enter(entity, state) {
    if (!entityBehaviors[entity.kind].canFill) return false
    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)
    if (!cell || cell.surface.kind !== 'floor') return false
    const dig = cell.surface.dig
    if (dig.kind === 'filling') {
      // Resume from cell's current progress
      entity.state = { kind: 'filling', progress: dig.progress }
      return true
    }
    if (dig.kind === 'open' || dig.kind === 'closing' || dig.kind === 'digging') {
      // Start fill progress to match current visual state
      let startProgress = 0
      if (dig.kind === 'closing') startProgress = dig.progress
      else if (dig.kind === 'digging') startProgress = 1 - dig.progress
      entity.state = { kind: 'filling', progress: startProgress }
      cell.surface.dig = { kind: 'filling', progress: startProgress }
      return true
    }
    return false
  },

  tick(entity, state, _events) {
    if (entity.state.kind !== 'filling') return

    // Player released fill — go idle, leave hole as-is
    if (entity.intent.kind !== 'fill') {
      entity.state = { kind: 'idle' }
      return
    }

    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)

    // Cell state changed externally — stop filling
    if (!cell || cell.surface.kind !== 'floor' || cell.surface.dig.kind !== 'filling') {
      entity.state = { kind: 'idle' }
      return
    }

    entity.state.progress += FILL_SPEED
    cell.surface.dig.progress = entity.state.progress

    if (entity.state.progress >= 1) {
      cell.surface.dig = { kind: 'intact' }
      entity.state = { kind: 'idle' }
      entity.intent = { kind: 'idle' }

      // Remove any trapped aliens on the filled cell
      for (const occupantId of cell.occupants) {
        const occupant = state.entities.get(occupantId)
        if (
          occupant &&
          entityBehaviors[occupant.kind].isEnemy &&
          occupant.state.kind === 'trapped'
        ) {
          cell.occupants.delete(occupantId)
          state.entities.delete(occupantId)
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

const intentHandlers: Record<Intent['kind'], { enter(entity: Entity, state: WorldState): void }> = {
  idle: { enter() {} },
  move: { enter(entity, state) { walking.enter(entity, state) } },
  dig: { enter(entity, state) { digging.enter(entity, state) } },
  fill: { enter(entity, state) { filling.enter(entity, state) } }
}

const idle: StateHandler = {
  tick(entity, state, _events) {
    intentHandlers[entity.intent.kind].enter(entity, state)
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

  // Swap collision check BEFORE processing — entities are still mid-walk
  const player = state.entities.get(state.playerId)
  if (player && player.state.kind === 'walking') {
    const playerFrom = player.tilePos
    const playerTarget = addPos(playerFrom, dirOffset(player.state.dir))
    for (const entity of state.entities.values()) {
      if (!entityBehaviors[entity.kind].isEnemy || entity.state.kind !== 'walking') continue
      const alienFrom = entity.tilePos
      const alienTarget = addPos(alienFrom, dirOffset(entity.state.dir))
      if (
        alienTarget.x === playerFrom.x && alienTarget.y === playerFrom.y &&
        playerTarget.x === alienFrom.x && playerTarget.y === alienFrom.y
      ) {
        events.push({ kind: 'player_died', entityId: state.playerId, cause: 'caught_by_alien' })
        break
      }
    }
  }

  for (const entity of state.entities.values()) {
    handlers[entity.state.kind].tick(entity, state, events)
  }

  return events
}
