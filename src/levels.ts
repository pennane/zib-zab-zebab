import type { EntitySpawn, Level, SurfaceSpawn } from './model'

const parseBlueprint = (blueprint: number[][]): Level => {
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
        case 5:
          surfaces.push({ kind: 'obstacle', obstacle: 'kiosk_left', pos: { x, y } })
          break
        case 6:
          surfaces.push({ kind: 'obstacle', obstacle: 'kiosk_right', pos: { x, y } })
          break
        case 7:
          surfaces.push({ kind: 'obstacle', obstacle: 'rock', pos: { x, y } })
          break
        case 8:
          surfaces.push({ kind: 'obstacle', obstacle: 'box', pos: { x, y } })
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

// Level 1: Original — 3 aliens, open layout
const level1 = (): Level =>
  parseBlueprint([
    [0, 7, 0, 0, 2, 3, 0, 0, 0, 0],
    [0, 7, 0, 0, 1, 0, 5, 6, 0, 8],
    [0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
    [1, 0, 2, 0, 5, 6, 1, 0, 2, 0],
    [1, 0, 0, 0, 0, 7, 0, 0, 0, 3],
    [0, 0, 0, 8, 0, 0, 0, 0, 1, 1],
    [0, 1, 0, 1, 0, 5, 6, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 4, 2, 0],
    [0, 0, 5, 6, 0, 0, 0, 0, 0, 0]
  ])

// Level 2: 4 aliens, narrower corridors
const level2 = (): Level =>
  parseBlueprint([
    [0, 0, 7, 0, 3, 0, 8, 0, 0, 3],
    [1, 0, 1, 0, 1, 0, 0, 0, 7, 0],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
    [0, 5, 6, 0, 0, 0, 5, 6, 0, 1],
    [0, 0, 2, 0, 8, 0, 2, 0, 0, 0],
    [7, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 5, 6, 0, 1, 1, 0, 0, 3],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 1, 0, 0, 4, 0, 7, 0, 0]
  ])

// Level 3: 5 aliens, complex shields, tight
const level3 = (): Level =>
  parseBlueprint([
    [3, 0, 0, 8, 0, 0, 7, 0, 0, 3],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 2, 0, 5, 6, 0, 2, 0, 0],
    [7, 0, 0, 0, 0, 0, 0, 0, 0, 8],
    [0, 0, 1, 0, 4, 0, 1, 0, 0, 0],
    [8, 0, 0, 0, 0, 0, 0, 0, 0, 7],
    [0, 0, 2, 0, 5, 6, 0, 2, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
    [3, 0, 0, 7, 0, 0, 8, 0, 0, 3]
  ])

export const levels: Level[] = [level1(), level2(), level3()]
