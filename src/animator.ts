import { dirOffset } from './lib'
import type { Animator, EntityVisual, RenderSnapshot, WorldState } from './model'

const TILE = 16

export const makeAnimator = (): Animator => {
  return {
    snapshot(state: WorldState): RenderSnapshot {
      const entities: EntityVisual[] = []

      for (const entity of state.entities.values()) {
        let x = entity.tilePos.x * TILE
        let y = entity.tilePos.y * TILE

        if (entity.state.kind === 'walking') {
          const off = dirOffset(entity.state.dir)
          x += entity.state.progress * off.x * TILE
          y += entity.state.progress * off.y * TILE
        }

        entities.push({ kind: entity.kind, x, y, facing: entity.facing })
      }

      return { grid: state.grid, entities }
    }
  }
}
