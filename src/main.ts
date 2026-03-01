import './main.css'
import { makeInputHandler } from './input'
import { level1 } from './levels'
import { makeRenderer } from './renderer'
import { makeGame, makeGameLoop, makeWorld } from './system'

const renderer = await makeRenderer(document.getElementById('screen')!)
const inputHandler = makeInputHandler()
const world = makeWorld(level1())

makeGameLoop(
  makeGame({
    renderer,
    inputHandler,
    world
  })
).start()
