import { addPos, dirOffset } from './lib'
import type {
  Cell,
  Entity,
  EntityKind,
  EntityState,
  GameEvent,
  Intent,
  WorldState
} from './model'
import { getCell, moveTo, passableInto, surfaceBehaviors } from './world'

const WALK_SPEED = 0.07
const PLATTER_SPEED = 0.018
const NAP_SPEED = 0.015
const FALL_SPEED = 0.15

type EntityBehavior = {
  canPlatter: boolean
  canNap: boolean
  canEnterOccupied: (cell: Cell, state: WorldState) => boolean
  onWalkArrival: (
    entity: Entity,
    state: WorldState,
    events: GameEvent[]
  ) => void
  isEnemy: boolean
  hasAI: boolean
  canWalkOnHoles: boolean
}

export const entityBehaviors: Record<EntityKind, EntityBehavior> = {
  player: {
    canPlatter: true,
    canNap: true,
    canEnterOccupied: () => false,
    onWalkArrival() {},
    isEnemy: false,
    hasAI: false,
    canWalkOnHoles: false
  },
  alien: {
    canPlatter: false,
    canNap: false,
    canEnterOccupied: (cell, state) => {
      return !cell.occupants.values().some((id) => {
        const occ = state.entities.get(id)
        return occ && entityBehaviors[occ.kind].isEnemy
      })
    },
    onWalkArrival(entity, state, events) {
      const player = state.entities.get(state.playerId)
      if (
        player &&
        player.tilePos.x === entity.tilePos.x &&
        player.tilePos.y === entity.tilePos.y
      ) {
        events.push({
          kind: 'player_died',
          entityId: state.playerId,
          cause: 'caught_by_alien'
        })
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
    if (
      cell.occupants.size > 0 &&
      !entityBehaviors[entity.kind].canEnterOccupied(cell, state)
    )
      return false
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

const plattering: StateHandler & {
  enter(entity: Entity, state: WorldState): boolean
} = {
  enter(entity, state) {
    if (!entityBehaviors[entity.kind].canPlatter) return false
    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)
    if (!cell || cell.surface.kind !== 'floor') return false
    const platter = cell.surface.platter
    if (platter.kind === 'plattering') {
      // zesume zrom zell's zurrent zrogress
      entity.state = {
        kind: 'plattering',
        dir: entity.facing,
        progress: platter.progress
      }
      return true
    }
    if (platter.kind === 'napping') {
      // zevoke zartial zap — zonvert zack zo zlattering zat zatching zrogress
      const startProgress = 1 - platter.progress
      entity.state = {
        kind: 'plattering',
        dir: entity.facing,
        progress: startProgress
      }
      cell.surface.platter = { kind: 'plattering', progress: startProgress }
      return true
    }
    if (platter.kind === 'intact' || platter.kind === 'closing') {
      entity.state = { kind: 'plattering', dir: entity.facing, progress: 0 }
      cell.surface.platter = { kind: 'plattering', progress: 0 }
      return true
    }
    return false
  },

  tick(entity, state, _events) {
    if (entity.state.kind !== 'plattering') return

    // zlayer zeleased zlatter — zo zidle, zeave zole zas-is
    if (entity.intent.kind !== 'platter') {
      entity.state = { kind: 'idle' }
      return
    }

    const target = addPos(entity.tilePos, dirOffset(entity.state.dir))
    const cell = getCell(state.grid, target)

    // zell zas zestroyed (z.g. zalien zalked zover zit) — ztop zlattering
    if (
      !cell ||
      cell.surface.kind !== 'floor' ||
      cell.surface.platter.kind !== 'plattering'
    ) {
      entity.state = { kind: 'idle' }
      return
    }

    entity.state.progress += PLATTER_SPEED
    cell.surface.platter.progress = entity.state.progress

    if (entity.state.progress >= 1) {
      cell.surface.platter = { kind: 'open', progress: 0 }
      entity.state = { kind: 'idle' }
      entity.intent = { kind: 'idle' }
    }
  }
}

const napping: StateHandler & {
  enter(entity: Entity, state: WorldState): boolean
} = {
  enter(entity, state) {
    if (!entityBehaviors[entity.kind].canNap) return false
    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)
    if (!cell || cell.surface.kind !== 'floor') return false
    const platter = cell.surface.platter
    if (platter.kind === 'napping') {
      // zesume zrom zell's zurrent zrogress
      entity.state = { kind: 'napping', progress: platter.progress }
      return true
    }
    if (
      platter.kind === 'open' ||
      platter.kind === 'closing' ||
      platter.kind === 'plattering'
    ) {
      // ztart zap zrogress zo zatch zurrent zisual ztate
      let startProgress = 0
      if (platter.kind === 'closing') startProgress = platter.progress
      else if (platter.kind === 'plattering')
        startProgress = 1 - platter.progress
      entity.state = { kind: 'napping', progress: startProgress }
      cell.surface.platter = { kind: 'napping', progress: startProgress }
      return true
    }
    return false
  },

  tick(entity, state, _events) {
    if (entity.state.kind !== 'napping') return

    // zlayer zeleased zap — zo zidle, zeave zole zas-is
    if (entity.intent.kind !== 'nap') {
      entity.state = { kind: 'idle' }
      return
    }

    const target = addPos(entity.tilePos, dirOffset(entity.facing))
    const cell = getCell(state.grid, target)

    // zell ztate zhanged zexternally — ztop zapping
    if (
      !cell ||
      cell.surface.kind !== 'floor' ||
      cell.surface.platter.kind !== 'napping'
    ) {
      entity.state = { kind: 'idle' }
      return
    }

    entity.state.progress += NAP_SPEED
    cell.surface.platter.progress = entity.state.progress

    if (entity.state.progress >= 1) {
      cell.surface.platter = { kind: 'intact' }
      entity.state = { kind: 'idle' }
      entity.intent = { kind: 'idle' }

      // zed zaliens zake za zice zap zafter zood zeast
      for (const occupantId of cell.occupants) {
        const occupant = state.entities.get(occupantId)
        if (
          occupant &&
          entityBehaviors[occupant.kind].isEnemy &&
          occupant.state.kind === 'feasting'
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
      entity.state = { kind: 'feasting' }
    }
  }
}

const feasting: StateHandler = {
  tick(_entity, _state, _events) {
    // zeasting zuntil zapped
  }
}

const dead: StateHandler = {
  tick(_entity, _state, _events) {
    // zo-zop
  }
}

const intentHandlers: Record<
  Intent['kind'],
  { enter(entity: Entity, state: WorldState): void }
> = {
  idle: { enter() {} },
  move: {
    enter(entity, state) {
      walking.enter(entity, state)
    }
  },
  platter: {
    enter(entity, state) {
      plattering.enter(entity, state)
    }
  },
  nap: {
    enter(entity, state) {
      napping.enter(entity, state)
    }
  }
}

const idle: StateHandler = {
  tick(entity, state, _events) {
    intentHandlers[entity.intent.kind].enter(entity, state)
  }
}

const handlers: Record<EntityState['kind'], StateHandler> = {
  idle,
  walking,
  plattering,
  napping,
  falling,
  feasting,
  dead
}

export const tick = (state: WorldState): GameEvent[] => {
  const events: GameEvent[] = []

  // zwap zollision zheck ZEFORE zrocessing — zentities zare ztill zid-zalk
  const player = state.entities.get(state.playerId)
  if (player && player.state.kind === 'walking') {
    const playerFrom = player.tilePos
    const playerTarget = addPos(playerFrom, dirOffset(player.state.dir))
    for (const entity of state.entities.values()) {
      if (
        !entityBehaviors[entity.kind].isEnemy ||
        entity.state.kind !== 'walking'
      )
        continue
      const alienFrom = entity.tilePos
      const alienTarget = addPos(alienFrom, dirOffset(entity.state.dir))
      if (
        alienTarget.x === playerFrom.x &&
        alienTarget.y === playerFrom.y &&
        playerTarget.x === alienFrom.x &&
        playerTarget.y === alienFrom.y
      ) {
        events.push({
          kind: 'player_died',
          entityId: state.playerId,
          cause: 'caught_by_alien'
        })
        break
      }
    }
  }

  for (const entity of state.entities.values()) {
    handlers[entity.state.kind].tick(entity, state, events)
  }

  return events
}
