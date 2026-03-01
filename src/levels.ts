import type { EntitySpawn, Level, SurfaceSpawn } from './model'

export const level1 = (): Level => {
  const blueprint = [
    [0, 1, 0, 0, 2, 3, 0, 0, 0, 0],
    [0, 1, 0, 0, 1, 0, 1, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
    [1, 0, 2, 0, 1, 1, 1, 0, 2, 0],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 3],
    [0, 0, 0, 1, 0, 0, 0, 0, 1, 1],
    [0, 1, 0, 1, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 4, 2, 0],
    [0, 0, 1, 1, 0, 0, 0, 0, 0, 0]
  ]
  const surfaces: SurfaceSpawn[] = []
  const entities: EntitySpawn[] = []

  for (const [y, row] of blueprint.entries()) {
    for (const [x, kind] of row.entries()) {
      switch (kind) {
        case 1:
          surfaces.push({ kind: 'obstacle', obstacle: 'tree', pos: { x, y } })
          break
        case 2:
          surfaces.push({
            kind: 'shield',
            shield: { kind: 'closed', progress: 0 },
            pos: { x, y }
          })
          break
        case 3:
          entities.push({ kind: 'alien', pos: { x, y } })
          break
        case 4:
          entities.push({ kind: 'player', pos: { x, y } })
          break
      }
    }
  }
  return {
    width: blueprint[0].length,
    height: blueprint.length,
    surfaces,
    entities
  }
}
