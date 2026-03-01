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

export const passableInto = (cell: Cell): boolean => {
  if (cell.surface.kind === 'obstacle') return false
  if (cell.surface.kind === 'shield' && cell.surface.shield.kind === 'closed')
    return false
  return true
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
