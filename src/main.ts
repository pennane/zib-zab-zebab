import './main.css'
import { makeInputHandler } from './input'
import { levels } from './levels'
import { makeRenderer } from './renderer'
import { makeGame } from './game'
import { makeGameLoop } from './loop'
import { makeAnimator } from './animator'
import type { Action, Context } from './model'

const renderer = await makeRenderer(document.getElementById('screen')!)
const inputHandler = makeInputHandler()
const animator = makeAnimator()

const context: Context = {
  scene: { kind: 'off' },
  levels,
  inputHandler,
  renderer,
  animator
}

const powerBtn = document.getElementById('power-btn')!
powerBtn.addEventListener('click', () => {
  if (context.scene.kind === 'off') {
    context.scene = { kind: 'booting', tick: 0 }
    powerBtn.classList.add('pressed')
  }
})

const KEY_MAP: Record<string, Action> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyZ: 'dig',
  KeyX: 'fill'
}

window.addEventListener('keydown', (e) => {
  const action = KEY_MAP[e.code]
  if (action) inputHandler.press(action)
})
window.addEventListener('keyup', (e) => {
  const action = KEY_MAP[e.code]
  if (action) inputHandler.release(action)
})

for (const btn of document.querySelectorAll<HTMLButtonElement>(
  '[data-action]'
)) {
  const action = btn.dataset.action as Action
  btn.addEventListener('pointerdown', () => inputHandler.press(action))
  btn.addEventListener('pointerup', () => inputHandler.release(action))
  btn.addEventListener('pointerleave', () => inputHandler.release(action))
  btn.addEventListener('pointercancel', () => inputHandler.release(action))
}

makeGameLoop(makeGame(context)).start()
