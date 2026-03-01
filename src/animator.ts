import type { Animator } from './model'

export const makeAnimator = (): Animator => {
  return {
    applyEvents(events, entities) {},
    snapshot(alpha) {
      return []
    }
  }
}
