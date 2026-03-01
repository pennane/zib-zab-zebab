import type { Context, Direction, Game, Intent, RawInput } from './model'
import { updateAlienIntents } from './ai'
import { tick } from './entity'
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

export const makeGame = (context: Context): Game => {
  let tickCount = 0

  return {
    update() {
      const input = context.inputHandler.poll()
      tickCount++

      switch (context.scene.kind) {
        case 'menu': {
          // Any action key starts the game
          if (input.pressed.size > 0) {
            const worldState = makeWorldState(context.levels[0])
            context.scene = {
              kind: 'playing',
              worldState,
              lives: INITIAL_LIVES,
              levelIndex: 0
            }
          }
          break
        }

        case 'playing': {
          const { worldState } = context.scene
          const player = worldState.entities.get(worldState.playerId)
          if (player) player.intent = rawInputToIntent(input)

          tickSurfaces(worldState)
          updateAlienIntents(worldState)
          const events = tick(worldState)

          // Check for player death
          const died = events.find((e) => e.kind === 'player_died')
          if (died) {
            const newLives = context.scene.lives - 1
            if (newLives <= 0) {
              context.scene = { kind: 'game_over' }
            } else {
              resetEntities(worldState)
              context.scene = {
                kind: 'playing',
                worldState,
                lives: newLives,
                levelIndex: context.scene.levelIndex
              }
            }
            break
          }

          // Check for level clear (all aliens eliminated)
          const hasAliens = worldState.entities
            .values()
            .some((e) => e.kind === 'alien')
          if (!hasAliens) {
            context.scene = {
              kind: 'level_clear',
              lives: context.scene.lives,
              levelIndex: context.scene.levelIndex
            }
          }
          break
        }

        case 'level_clear': {
          if (input.pressed.size > 0) {
            const nextIndex = context.scene.levelIndex + 1
            if (nextIndex >= context.levels.length) {
              // Beat all levels — back to menu
              context.scene = { kind: 'menu' }
            } else {
              const worldState = makeWorldState(context.levels[nextIndex])
              context.scene = {
                kind: 'playing',
                worldState,
                lives: context.scene.lives,
                levelIndex: nextIndex
              }
            }
          }
          break
        }

        case 'game_over': {
          if (input.pressed.size > 0) {
            context.scene = { kind: 'menu' }
          }
          break
        }
      }
    },

    render(_alpha: number) {
      switch (context.scene.kind) {
        case 'menu': {
          context.renderer.renderScreen((ctx, mars) => {
            // Draw mars background
            for (let x = 0; x < 10; x++) {
              for (let y = 0; y < 9; y++) {
                ctx.drawImage(mars, x * 16, y * 16)
              }
            }
            // Darken overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
            ctx.fillRect(0, 0, 160, 144)
            // Title
            ctx.fillStyle = '#ff6600'
            ctx.fillText('ZIB ZAB', 44, 40)
            ctx.fillText('KEBAB', 52, 52)
            // Blink "PRESS START"
            if (Math.floor(tickCount / 30) % 2 === 0) {
              ctx.fillStyle = '#ffffff'
              ctx.fillText('PRESS START', 36, 90)
            }
          })
          break
        }

        case 'playing': {
          const snapshot = context.animator.snapshot(context.scene.worldState)
          context.renderer.render(snapshot)
          // Capture lives before closure for TypeScript narrowing
          const lives = context.scene.lives
          // HUD: lives display
          context.renderer.renderScreen((ctx) => {
            ctx.fillStyle = '#ffffff'
            ctx.fillText('x' + lives, 2, 142)
          })
          break
        }

        case 'level_clear': {
          // Capture values before closure for TypeScript narrowing
          const lives = context.scene.lives
          const levelIndex = context.scene.levelIndex
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
          break
        }

        case 'game_over': {
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
          break
        }
      }
    }
  }
}
