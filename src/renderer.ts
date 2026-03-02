import type {
  Cell,
  CellSurface,
  EntityKind,
  EntityVisual,
  ObstacleKind,
  Renderer
} from './model'

async function loadImageBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  const blob = await res.blob()
  return await createImageBitmap(blob)
}

async function loadImageBitmapSafe(url: string): Promise<ImageBitmap | null> {
  try {
    return await loadImageBitmap(url)
  } catch {
    return null
  }
}

async function loadKioskSlices(
  url: string
): Promise<[ImageBitmap, ImageBitmap, ImageBitmap, ImageBitmap]> {
  const res = await fetch(url)
  const blob = await res.blob()
  return (await Promise.all([
    createImageBitmap(blob, 0, 16, 16, 16),
    createImageBitmap(blob, 16, 16, 16, 16),
    createImageBitmap(blob, 0, 48, 16, 16),
    createImageBitmap(blob, 16, 48, 16, 16)
  ])) as [ImageBitmap, ImageBitmap, ImageBitmap, ImageBitmap]
}

export const makeRenderer = async (target: HTMLElement): Promise<Renderer> => {
  await document.fonts.load('8px pixel')
  const zibzabalien = await loadImageBitmap('zibzabalien.png')
  const mars = await loadImageBitmap('mars.png')
  const zeff = await loadImageBitmap('zebabzeff.png')
  const rokc = await loadImageBitmap('rokc.png')
  const box = await loadImageBitmap('box.png')
  const tree = await loadImageBitmapSafe('tree.png')
  const zebab = await loadImageBitmap('zebab.png')
  const [kioskF1L, kioskF1R, kioskF2L, kioskF2R] =
    await loadKioskSlices('zebab-kiosk.png')
  const shieldSheet = await loadImageBitmap('shield.png')
  const shieldClosed = await createImageBitmap(shieldSheet, 0, 0, 16, 16)
  const shieldOpen = await createImageBitmap(shieldSheet, 0, 16, 16, 16)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  target.appendChild(canvas)
  canvas.width = 160
  canvas.height = 144

  ctx.imageSmoothingEnabled = false
  ctx.textRendering = 'geometricPrecision'
  ctx.font = '8px pixel'
  ctx.letterSpacing = '0px'

  const surfaceRenderers: Record<
    CellSurface['kind'],
    (cell: Cell, x: number, y: number) => void
  > = {
    floor(cell, x, y) {
      const platter = (cell.surface as Extract<CellSurface, { kind: 'floor' }>).platter
      if (platter.kind === 'open') {
        ctx.drawImage(zebab, x * 16, y * 16)
      } else if (platter.kind === 'plattering') {
        ctx.globalAlpha = platter.progress
        ctx.drawImage(zebab, x * 16, y * 16)
        ctx.globalAlpha = 1
      } else if (platter.kind === 'napping' || platter.kind === 'closing') {
        ctx.globalAlpha = 1 - platter.progress
        ctx.drawImage(zebab, x * 16, y * 16)
        ctx.globalAlpha = 1
      }
    },
    obstacle(cell, x, y) {
      const kind = (cell.surface as Extract<CellSurface, { kind: 'obstacle' }>)
        .obstacle
      obstacleRenderers[kind](x * 16, y * 16)
    },
    shield(cell, x, y) {
      const shield = (cell.surface as Extract<CellSurface, { kind: 'shield' }>)
        .shield
      if (shield.kind === 'closed') {
        ctx.drawImage(shieldClosed, x * 16, y * 16)
      } else {
        ctx.drawImage(shieldOpen, x * 16, y * 16)
      }
    }
  }

  let kioskFrame = 0

  const obstacleRenderers: Record<
    ObstacleKind,
    (x: number, y: number) => void
  > = {
    tree(x, y) {
      if (tree) {
        ctx.drawImage(tree, x, y)
      } else {
        ctx.fillStyle = 'black'
        ctx.fillRect(x, y, 16, 16)
      }
    },
    rock(x, y) {
      ctx.drawImage(rokc, x, y)
    },
    kiosk_left(x, y) {
      ctx.drawImage(kioskFrame === 0 ? kioskF1L : kioskF2L, x, y)
    },
    kiosk_right(x, y) {
      ctx.drawImage(kioskFrame === 0 ? kioskF1R : kioskF2R, x, y)
    },
    box(x, y) {
      ctx.drawImage(box, x, y)
    },
    none() {}
  }

  const entityRenderers: Record<EntityKind, (entity: EntityVisual) => void> = {
    alien(entity) {
      ctx.drawImage(zibzabalien, entity.x, entity.y)
    },
    player(entity) {
      ctx.drawImage(zeff, entity.x, entity.y)
    }
  }

  return {
    render(snapshot, tickCount) {
      kioskFrame = Math.floor(tickCount / 30) % 2
      for (const [x, col] of snapshot.grid.entries()) {
        for (const [y, cell] of col.entries()) {
          ctx.drawImage(mars, x * 16, y * 16)
          surfaceRenderers[cell.surface.kind](cell, x, y)
        }
      }

      for (const entity of snapshot.entities) {
        entityRenderers[entity.kind](entity)
      }
    },

    renderText(text: string, x: number, y: number, color = '#ffffff') {
      ctx.fillStyle = color
      ctx.fillText(text, x, y)
    },

    renderScreen(
      draw: (ctx: CanvasRenderingContext2D, mars: ImageBitmap) => void
    ) {
      draw(ctx, mars)
    }
  }
}
