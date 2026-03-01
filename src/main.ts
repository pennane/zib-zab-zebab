import './main.css'

async function loadImageBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  const blob = await res.blob()
  return await createImageBitmap(blob)
}

await document.fonts.load('8px pixel')
const zibzabalien = await loadImageBitmap('zibzabalien.png')
const mars = await loadImageBitmap('mars.png')
const zeff = await loadImageBitmap('zebabzeff.png')

const level1 = [
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

function randomInclusive(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const randomDirection = () => randomInclusive(0, 3)

const newDirection = (old: number) => {
  let dir
  do {
    dir = randomDirection()
  } while (dir === old)
  return dir
}

type Cell = {
  dirty: boolean
} & (
  | { type: 'obstacle' }
  | { type: 'cover'; state: number }
  | { type: 'enemy'; direction: number }
  | { type: 'player' }
  | { type: 'hole'; state: number; enemy: Extract<Cell, { type: 'enemy' }> }
)

function initializeCell(type: number): Cell | null {
  switch (type) {
    case 0:
      return null
    case 1:
      return { type: 'obstacle', dirty: false }
    case 2:
      return { type: 'cover', state: 3, dirty: false }
    case 3:
      return {
        type: 'enemy',
        direction: randomDirection(),
        dirty: false
      }
    case 4:
      return {
        type: 'player',
        dirty: false
      }
    default:
      throw new Error('Unknown type ' + type)
  }
}

const initializeLevel = (level: number[][]) => {
  const grid = level.map((row) => row.map((type) => initializeCell(type)))

  return grid
}

type Game = ReturnType<typeof initializeLevel>

const directions = [
  { dx: 0, dy: -1 }, // up
  { dx: 1, dy: 0 }, // right
  { dx: 0, dy: 1 }, // down
  { dx: -1, dy: 0 } // left
]

const step = (level: Game) => {
  const rows = level.length
  const cols = level[0].length

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = level[y][x]
      if (!cell) continue
      cell.dirty = false
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = level[y][x]
      if (!cell || cell.type !== 'enemy' || cell.dirty) continue
      cell.dirty = true

      const { dx, dy } = directions[cell.direction]
      const nx = x + dx
      const ny = y + dy

      if (ny < 0 || ny >= rows || nx < 0 || nx >= cols || level[ny][nx]) {
        cell.direction = newDirection(cell.direction)
      } else {
        level[ny][nx] = cell
        level[y][x] = null
      }
    }
  }
}

const app = document.getElementById('screen')
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')!
app?.appendChild(canvas)

canvas.width = 160
canvas.height = 144

ctx.imageSmoothingEnabled = false
ctx.textRendering = 'geometricPrecision'
ctx.font = '8px pixel'
ctx.letterSpacing = '0px'

const drawGrid = (level: Game) => {
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, 160, 144)

  for (const [y, row] of level.entries()) {
    for (const [x, cell] of row.entries()) {
      ctx.drawImage(mars, x * 16, y * 16)
      if (!cell) continue
      if (cell.type === 'obstacle') {
        ctx.fillStyle = 'black'
        ctx.fillRect(x * 16, y * 16, 16, 16)
      }
      if (cell.type === 'enemy') {
        ctx.drawImage(zibzabalien, x * 16, y * 16)
      }
      if (cell.type === 'player') {
        ctx.drawImage(zeff, x * 16, y * 16)
      }
    }
  }

  ctx.fillStyle = 'white'

  ctx.fillText('zebab price', 16, 32)
  ctx.fillText('on mars $$$', 16, 48)
}

let game = initializeLevel(level1)
setInterval(() => {
  step(game)
  drawGrid(game)
}, 300)
