import { makeAnimator } from './animator'
import { makeGame } from './game'
import { makeInputHandler } from './input'
import { levels } from './levels'
import { makeGameLoop } from './loop'
import './main.css'
import type { Action, Context } from './model'
import { makeRenderer } from './renderer'

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
  } else {
    context.scene = { kind: 'off' }
    powerBtn.classList.remove('pressed')
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
  KeyZ: 'platter',
  KeyX: 'nap'
}

window.addEventListener('keydown', (e) => {
  const action = KEY_MAP[e.code]
  if (!action) return
  e.preventDefault()
  inputHandler.press(action)
})

window.addEventListener('keyup', (e) => {
  const action = KEY_MAP[e.code]
  if (!action) return
  e.preventDefault()
  inputHandler.release(action)
})

for (const btn of document.querySelectorAll<HTMLButtonElement>(
  '[data-action]'
)) {
  const action = btn.dataset.action as Action
  btn.addEventListener('pointerdown', inputHandler.press.bind(null, action))
  btn.addEventListener('pointerup', inputHandler.press.bind(null, action))
  btn.addEventListener('pointerleave', inputHandler.release.bind(null, action))
  btn.addEventListener('pointercancel', inputHandler.release.bind(null, action))
}

makeGameLoop(makeGame(context)).start()
