import './main.css'
import { makeInputHandler } from './input'
import { level1 } from './levels'
import { makeRenderer } from './renderer'
import { makeGame } from './game'
import { makeGameLoop } from './loop'
import { makeWorldState } from './world'
import type { Action } from './model'

const renderer = await makeRenderer(document.getElementById('screen')!)
const inputHandler = makeInputHandler()
const state = makeWorldState(level1())

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

makeGameLoop(
  makeGame({
    renderer,
    inputHandler,
    state
  })
).start()
