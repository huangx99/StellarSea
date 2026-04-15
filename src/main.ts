import { Engine } from '@babylonjs/core/Engines/engine'
import './style.css'
import { createScene } from './game/createScene'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="game-canvas" aria-label="Stellar Sea 原型"></canvas>
`

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')

if (!canvas) {
  throw new Error('未找到 Babylon 画布')
}

const engine = new Engine(
  canvas,
  true,
  {
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true,
    stencil: true,
  },
  true,
)

engine.setHardwareScalingLevel(1)

const scene = createScene(engine, canvas)

engine.runRenderLoop(() => {
  scene.render()
})

window.addEventListener('resize', () => {
  engine.resize()
})
