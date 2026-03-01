import type {
  Cell,
  EntityId,
  EntitySpawn,
  Entity,
  Level,
  TilePos,
  WorldState
} from './model'

const makeId = (() => {
  let i = 0
  return () => '' + i++
})()

const makeEntity = (spawn: EntitySpawn): Entity => {
  return {
    id: makeId(),
    state: { kind: 'idle' },
    kind: spawn.kind,
    tilePos: spawn.pos,
    facing: 'right',
    intent: { kind: 'idle' }
  }
}

export const makeWorldState = (level: Level): WorldState => {
  const grid: Cell[][] = Array.from({ length: level.width }).map((_, x) =>
    Array.from({ length: level.height }).map((_, y): Cell => {
      return {
        pos: { x, y },
        surface: { kind: 'floor', dig: { kind: 'intact' } },
        occupants: new Set()
      }
    })
  )

  const entities = new Map(
    level.entities
      .map((spawn) => makeEntity(spawn))
      .map((entity) => [entity.id, entity])
  )

  for (const surface of level.surfaces) {
    grid[surface.pos.x][surface.pos.y].surface = surface
  }

  for (const entity of entities.values()) {
    grid[entity.tilePos.x][entity.tilePos.y].occupants.add(entity.id)
  }

  const player = entities.values().find((e) => e.kind === 'player')

  if (!player) {
    alert('Zlorb! No player in level >:/')
    throw new Error('AA')
  }

  return {
    playerId: player.id,
    grid,
    entities
  }
}

export const getCell = (grid: Cell[][], pos: TilePos): Cell | undefined =>
  grid[pos.x]?.[pos.y]

export const passableInto = (cell: Cell, kind: 'player' | 'alien'): boolean => {
  if (cell.surface.kind === 'obstacle') return false
  if (cell.surface.kind === 'shield' && cell.surface.shield.kind === 'closed')
    return false
  if (kind === 'player' && cell.surface.kind === 'floor') {
    const dig = cell.surface.dig.kind
    if (dig === 'open' || dig === 'digging' || dig === 'filling' || dig === 'closing')
      return false
  }
  return true
}

const SHIELD_SPEED = 0.005
const HOLE_LINGER_SPEED = 0.002
const HOLE_CLOSE_SPEED = 0.003

export const tickSurfaces = (state: WorldState): void => {
  for (const col of state.grid) {
    for (const cell of col) {
      if (cell.surface.kind === 'shield') {
        const shield = cell.surface.shield
        shield.progress += SHIELD_SPEED
        if (shield.progress >= 1) {
          cell.surface.shield =
            shield.kind === 'closed'
              ? { kind: 'open', progress: 0 }
              : { kind: 'closed', progress: 0 }
        }
      } else if (cell.surface.kind === 'floor') {
        const dig = cell.surface.dig
        if (dig.kind === 'open') {
          dig.progress += HOLE_LINGER_SPEED
          if (dig.progress >= 1) {
            cell.surface.dig = { kind: 'closing', progress: 0 }
          }
        } else if (dig.kind === 'closing') {
          dig.progress += HOLE_CLOSE_SPEED
          if (dig.progress >= 1) {
            cell.surface.dig = { kind: 'intact' }
            // Free any trapped aliens — they escape
            for (const occupantId of cell.occupants) {
              const occupant = state.entities.get(occupantId)
              if (occupant && occupant.state.kind === 'trapped') {
                occupant.state = { kind: 'idle' }
                occupant.intent = { kind: 'idle' }
              }
            }
          }
        }
      }
    }
  }
}

export const moveTo = (
  state: WorldState,
  entityId: EntityId,
  from: TilePos,
  to: TilePos
): void => {
  const fromCell = getCell(state.grid, from)
  const toCell = getCell(state.grid, to)
  if (fromCell) fromCell.occupants.delete(entityId)
  if (toCell) toCell.occupants.add(entityId)
}
