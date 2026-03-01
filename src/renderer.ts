import type { Renderer } from './model'

async function loadImageBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  const blob = await res.blob()
  return await createImageBitmap(blob)
}

export const makeRenderer = async (target: HTMLElement): Promise<Renderer> => {
  await document.fonts.load('8px pixel')
  const zibzabalien = await loadImageBitmap('zibzabalien.png')
  const mars = await loadImageBitmap('mars.png')
  const zeff = await loadImageBitmap('zebabzeff.png')

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  target.appendChild(canvas)
  canvas.width = 160
  canvas.height = 144

  ctx.imageSmoothingEnabled = false
  ctx.textRendering = 'geometricPrecision'
  ctx.font = '8px pixel'
  ctx.letterSpacing = '0px'

  return {
    render(state) {
      for (const [x, col] of state.grid.entries()) {
        for (const [y, cell] of col.entries()) {
          ctx.drawImage(mars, x * 16, y * 16)
          switch (cell.surface.kind) {
            case 'obstacle': {
              ctx.fillStyle = 'black'
              ctx.fillRect(x * 16, y * 16, 16, 16)
              break
            }
            case 'shield': {
              ctx.fillStyle = 'blue'
              ctx.fillRect(x * 16, y * 16, 16, 16)
            }
          }
          for (const occupantId of cell.occupants) {
            const occupant = state.entities.get(occupantId)!
            switch (occupant.kind) {
              case 'alien': {
                ctx.drawImage(zibzabalien, x * 16, y * 16)
                break
              }
              case 'player': {
                ctx.drawImage(zeff, x * 16, y * 16)
                break
              }
            }
          }
        }
      }
    }
  }
}
