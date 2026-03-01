import { DIRS, addPos, dirOffset, getCell } from './lib'
import type {
  Cell,
  Context,
  Entity,
  EntitySpawn,
  Game,
  GameEvent,
  Intent,
  Level,
  World,
  WorldState
} from './model'

const makeId = (() => {
  let i = 0
  return () => '' + i++
})()

const makeEntity = (spawn: EntitySpawn): Entity => {
  return {
    id: makeId(),
    state: { kind: 'idle' },
    kind: spawn.kind,
    tilePos: spawn.pos,
    facing: 'right',
    intent: { kind: 'idle' }
  }
}

const makeWorldState = (level: Level): WorldState => {
  const grid: Cell[][] = Array.from({ length: level.width }).map((_, x) =>
    Array.from({ length: level.width }).map((_, y): Cell => {
      return {
        pos: { x, y },
        surface: { kind: 'floor', dig: { kind: 'intact' } },
        occupants: new Set()
      }
    })
  )

  const entities = new Map(
    level.entities
      .map((spawn) => makeEntity(spawn))
      .map((entity) => [entity.id, entity])
  )

  for (const surface of level.surfaces) {
    grid[surface.pos.x][surface.pos.y].surface = surface
  }

  for (const entity of entities.values()) {
    grid[entity.tilePos.x][entity.tilePos.y].occupants.add(entity.id)
  }

  return {
    grid,
    entities
  }
}

const makeTick = (state: WorldState) => (): GameEvent[] => {
  const events: GameEvent[] = []

  for (const entity of state.entities.values()) {
    tickEntity(entity, state, events)
  }

  return events
}

const makeUpdateIntents = (state: WorldState) => () => {
  for (const entity of state.entities.values()) {
    if (entity.kind === 'alien') {
      entity.intent = decideAlienIntent(entity, state)
    }
  }
}

const tickEntity = (entity: Entity, state: WorldState, events: GameEvent[]) => {
  switch (entity.state.kind) {
    case 'idle':
      applyIntent(entity, state, events)
      break
    case 'walking':
      advanceWalk(entity, state, events)
      break
  }
}

export const makeWorld = (level: Level): World => {
  const state = makeWorldState(level)
  const tick = makeTick(state)
  const updateIntents = makeUpdateIntents(state)
  return {
    updateIntents,
    state,
    tick
  }
}

export const makeGame = (context: Context): Game => {
  return {
    update() {
      const input = context.inputHandler.poll()
      const player = context.world.state.entities
        .values()
        .find((e) => e.kind === 'player')
      if (player) player.intent = context.inputHandler.toIntent(input)

      const events = context.world.tick()
      return events
    },
    render(alpha: number) {
      context.renderer.render(context.world.state)
    }
  }
}

const passableInto = (entity: Entity, cell: Cell) => {
  if (cell.occupants.size > 0) return false
  if (cell.surface.kind === 'obstacle') return false
  if (cell.surface.kind === 'shield' && cell.surface.shield.kind === 'closed')
    return false
  return true
}

const decideAlienIntent = (entity: Entity, state: WorldState): Intent => {
  if (entity.state.kind !== 'idle') return entity.intent
  const preferred = entity.facing
  const candidates = [preferred, ...DIRS.filter((d) => d !== preferred)]

  for (const dir of candidates) {
    const target = addPos(entity.tilePos, dirOffset(dir))
    const cell = getCell(state.grid, target)!
    if (passableInto(entity, cell)) return { kind: 'move', dir }
  }

  return { kind: 'idle' }
}

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
