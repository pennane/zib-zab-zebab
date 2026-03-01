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
    render(snapshot) {
      for (const [x, col] of snapshot.grid.entries()) {
        for (const [y, cell] of col.entries()) {
          ctx.drawImage(mars, x * 16, y * 16)
          switch (cell.surface.kind) {
            case 'floor': {
              const dig = cell.surface.dig
              if (dig.kind === 'open') {
                ctx.fillStyle = '#331100'
                ctx.fillRect(x * 16 + 2, y * 16 + 2, 12, 12)
              } else if (dig.kind === 'digging') {
                ctx.globalAlpha = dig.progress
                ctx.fillStyle = '#331100'
                ctx.fillRect(x * 16 + 2, y * 16 + 2, 12, 12)
                ctx.globalAlpha = 1
              } else if (dig.kind === 'filling' || dig.kind === 'closing') {
                ctx.globalAlpha = 1 - dig.progress
                ctx.fillStyle = '#331100'
                ctx.fillRect(x * 16 + 2, y * 16 + 2, 12, 12)
                ctx.globalAlpha = 1
              }
              break
            }
            case 'obstacle': {
              ctx.fillStyle = 'black'
              ctx.fillRect(x * 16, y * 16, 16, 16)
              break
            }
            case 'shield': {
              if (cell.surface.shield.kind === 'closed') {
                ctx.fillStyle = 'blue'
                ctx.fillRect(x * 16, y * 16, 16, 16)
              } else {
                ctx.globalAlpha = 0.3
                ctx.fillStyle = 'blue'
                ctx.fillRect(x * 16, y * 16, 16, 16)
                ctx.globalAlpha = 1
              }
              break
            }
          }
        }
      }

      for (const entity of snapshot.entities) {
        switch (entity.kind) {
          case 'alien': {
            ctx.drawImage(zibzabalien, entity.x, entity.y)
            break
          }
          case 'player': {
            ctx.drawImage(zeff, entity.x, entity.y)
            break
          }
        }
      }
    },

    renderText(text: string, x: number, y: number, color = '#ffffff') {
      ctx.fillStyle = color
      ctx.fillText(text, x, y)
    },

    renderScreen(draw: (ctx: CanvasRenderingContext2D, mars: ImageBitmap) => void) {
      draw(ctx, mars)
    }
  }
}
