import type { Game } from './model'

export const makeGameLoop = (game: Game, msPerTick = 1000 / 60) => {
  let accumulator = 0
  let rafId: number | null = null

  return {
    start(): void {
      let lastTime = performance.now()
      const loop = (now: number) => {
        const elapsed = Math.min(now - lastTime, 100)
        lastTime = now
        accumulator += elapsed
        while (accumulator >= msPerTick) {
          game.update()
          accumulator -= msPerTick
        }
        game.render(accumulator / msPerTick)
        rafId = requestAnimationFrame(loop)
      }
      rafId = requestAnimationFrame(loop)
    },

    stop(): void {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
      accumulator = 0
    }
  }
}
