import type { Context, Direction, Game, Intent, RawInput, Scene } from './model'
import { updateAlienIntents } from './ai'
import { entityBehaviors, tick } from './entity'
import { tickSurfaces, makeWorldState, resetEntities } from './world'

const DIR_ACTIONS = ['up', 'down', 'left', 'right'] as const

const rawInputToIntent = (raw: RawInput): Intent => {
  for (const action of DIR_ACTIONS) {
    if (raw.held.has(action)) {
      return { kind: 'move', dir: action as Direction }
    }
  }
  if (raw.held.has('dig')) return { kind: 'dig' }
  if (raw.held.has('fill')) return { kind: 'fill' }
  return { kind: 'idle' }
}

const INITIAL_LIVES = 5

type SceneHandler = {
  update(input: RawInput): void
  render(): void
}

export const makeGame = (context: Context): Game => {
  let tickCount = 0

  const menuMusic = new Audio('zabzabzabzib.mp3')
  menuMusic.loop = true
  const gameMusic = new Audio('disco.mp3')
  gameMusic.loop = true
  const bootSound = new Audio('zab.wav')

  const musicForScene: Record<Scene['kind'], HTMLAudioElement | null> = {
    off: null,
    booting: null,
    menu: menuMusic,
    game_over: menuMusic,
    playing: gameMusic,
    level_clear: menuMusic
  }

  let currentMusic: HTMLAudioElement | null = null

  const updateMusic = (sceneKind: Scene['kind']) => {
    const target = musicForScene[sceneKind]
    if (target === currentMusic) return
    if (currentMusic) {
      currentMusic.pause()
      currentMusic.currentTime = 0
    }
    currentMusic = target
    if (target) target.play().catch(() => {})
  }

  const sceneHandlers: Record<Scene['kind'], SceneHandler> = {
    off: {
      update() {},
      render() {
        context.renderer.renderScreen((ctx) => {
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, 160, 144)
        })
      }
    },

    booting: {
      update() {
        const scene = context.scene as Extract<Scene, { kind: 'booting' }>
        scene.tick++
        if (scene.tick === 1) {
          bootSound.currentTime = 0
          bootSound.play().catch(() => {})
        }
        if (scene.tick >= 180) {
          context.scene = { kind: 'menu' }
        }
      },
      render() {
        const scene = context.scene as Extract<Scene, { kind: 'booting' }>
        context.renderer.renderScreen((ctx) => {
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, 160, 144)

          if (scene.tick >= 30) {
            ctx.fillStyle = '#88cc88'
            ctx.fillText('Zib-zab', 48, 64)
          }
          if (scene.tick >= 45) {
            ctx.fillStyle = '#88cc88'
            ctx.fillText('electronics', 36, 78)
          }
        })
      }
    },

    menu: {
      update(input) {
        if (input.pressed.size > 0) {
          const worldState = makeWorldState(context.levels[0])
          context.scene = {
            kind: 'playing',
            worldState,
            lives: INITIAL_LIVES,
            levelIndex: 0
          }
        }
      },
      render() {
        context.renderer.renderScreen((ctx, mars) => {
          for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 9; y++) {
              ctx.drawImage(mars, x * 16, y * 16)
            }
          }
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
          ctx.fillRect(0, 0, 160, 144)
          ctx.fillStyle = '#ff6600'
          ctx.fillText('ZIB ZAB', 44, 40)
          ctx.fillText('KEBAB ZEFF', 52, 52)
          if (Math.floor(tickCount / 30) % 2 === 0) {
            ctx.fillStyle = '#ffffff'
            ctx.fillText('PRESS START', 36, 90)
          }
        })
      }
    },

    playing: {
      update(input) {
        const scene = context.scene as Extract<Scene, { kind: 'playing' }>
        const { worldState } = scene
        const player = worldState.entities.get(worldState.playerId)
        if (player) player.intent = rawInputToIntent(input)

        tickSurfaces(worldState)
        updateAlienIntents(worldState)
        const events = tick(worldState)

        const died = events.find((e) => e.kind === 'player_died')
        if (died) {
          const newLives = scene.lives - 1
          if (newLives <= 0) {
            context.scene = { kind: 'game_over' }
          } else {
            resetEntities(worldState)
            context.scene = {
              kind: 'playing',
              worldState,
              lives: newLives,
              levelIndex: scene.levelIndex
            }
          }
          return
        }

        const hasAliens = worldState.entities
          .values()
          .some((e) => entityBehaviors[e.kind].isEnemy)
        if (!hasAliens) {
          context.scene = {
            kind: 'level_clear',
            lives: scene.lives,
            levelIndex: scene.levelIndex
          }
        }
      },
      render() {
        const scene = context.scene as Extract<Scene, { kind: 'playing' }>
        const snapshot = context.animator.snapshot(scene.worldState)
        context.renderer.render(snapshot, tickCount)
        const lives = scene.lives
        context.renderer.renderScreen((ctx) => {
          ctx.fillStyle = '#ffffff'
          ctx.fillText('x' + lives, 2, 142)
        })
      }
    },

    level_clear: {
      update(input) {
        if (input.pressed.size > 0) {
          const scene = context.scene as Extract<Scene, { kind: 'level_clear' }>
          const nextIndex = scene.levelIndex + 1
          if (nextIndex >= context.levels.length) {
            context.scene = { kind: 'menu' }
          } else {
            const worldState = makeWorldState(context.levels[nextIndex])
            context.scene = {
              kind: 'playing',
              worldState,
              lives: scene.lives,
              levelIndex: nextIndex
            }
          }
        }
      },
      render() {
        const scene = context.scene as Extract<Scene, { kind: 'level_clear' }>
        const lives = scene.lives
        const levelIndex = scene.levelIndex
        context.renderer.renderScreen((ctx, mars) => {
          for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 9; y++) {
              ctx.drawImage(mars, x * 16, y * 16)
            }
          }
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
          ctx.fillRect(0, 0, 160, 144)

          ctx.fillStyle = '#00ff00'
          ctx.fillText('LEVEL CLEAR!', 30, 40)

          ctx.fillStyle = '#ffffff'
          ctx.fillText('LIVES: ' + lives, 44, 64)
          ctx.fillText('LEVEL: ' + (levelIndex + 1), 44, 76)

          if (Math.floor(tickCount / 30) % 2 === 0) {
            ctx.fillStyle = '#ffffff'
            ctx.fillText('PRESS START', 36, 110)
          }
        })
      }
    },

    game_over: {
      update(input) {
        if (input.pressed.size > 0) {
          context.scene = { kind: 'menu' }
        }
      },
      render() {
        context.renderer.renderScreen((ctx, mars) => {
          for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 9; y++) {
              ctx.drawImage(mars, x * 16, y * 16)
            }
          }
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx.fillRect(0, 0, 160, 144)

          ctx.fillStyle = '#ff0000'
          ctx.fillText('GAME OVER', 40, 50)

          if (Math.floor(tickCount / 30) % 2 === 0) {
            ctx.fillStyle = '#ffffff'
            ctx.fillText('PRESS START', 36, 90)
          }
        })
      }
    }
  }

  return {
    update() {
      const input = context.inputHandler.poll()
      tickCount++
      sceneHandlers[context.scene.kind].update(input)
      updateMusic(context.scene.kind)
    },
    render(_alpha: number) {
      sceneHandlers[context.scene.kind].render()
    }
  }
}
