import type { Direction, TilePos } from './model'

export const DIRS: Direction[] = ['left', 'right', 'up', 'down']

export const dirOffset = (dir: Direction): TilePos =>
  ({
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 }
  })[dir]

export const addPos = (a: TilePos, b: TilePos): TilePos => ({
  x: a.x + b.x,
  y: a.y + b.y
})
