import gsap from 'gsap'
import { buildFanTimeline, FAN_REST_ROTATION, FAN_STACK_OFFSET } from './fan-animation'

function buildScope() {
  const scope = document.createElement('div')
  for (const slot of ['left', 'right', 'center']) {
    const card = document.createElement('div')
    card.dataset.fan = slot
    scope.appendChild(card)
  }
  document.body.appendChild(scope)
  return scope
}

const num = (el: Element, prop: string) => Number(gsap.getProperty(el, prop))

/**
 * Verificação por `seek` em vez de tempo real: o timeline é determinístico,
 * então dá para inspecionar início/fim sem depender de requestAnimationFrame
 * (que não roda em jsdom nem com o painel do navegador oculto).
 */
describe('entrada em baralho do leque de login', () => {
  let scope: HTMLElement
  let tl: gsap.core.Timeline

  beforeEach(() => {
    document.body.innerHTML = ''
    scope = buildScope()
    tl = buildFanTimeline(scope)
    tl.pause()
  })

  afterEach(() => {
    tl.kill()
  })

  it('começa com as laterais empilhadas atrás da central e sem rotação', () => {
    tl.seek(0)
    const left = scope.querySelector('[data-fan="left"]')!
    const right = scope.querySelector('[data-fan="right"]')!

    expect(num(left, 'x')).toBeCloseTo(FAN_STACK_OFFSET, 0)
    expect(num(right, 'x')).toBeCloseTo(-FAN_STACK_OFFSET, 0)
    // sem inclinação no início: é isso que faz elas sumirem atrás da central
    expect(num(left, 'rotation')).toBeCloseTo(0, 1)
    expect(num(right, 'rotation')).toBeCloseTo(0, 1)
  })

  it('termina com o leque aberto: laterais na posição de repouso e inclinadas', () => {
    tl.progress(1)
    const left = scope.querySelector('[data-fan="left"]')!
    const right = scope.querySelector('[data-fan="right"]')!
    const center = scope.querySelector('[data-fan="center"]')!

    expect(num(left, 'x')).toBeCloseTo(0, 1)
    expect(num(right, 'x')).toBeCloseTo(0, 1)
    expect(num(left, 'rotation')).toBeCloseTo(-FAN_REST_ROTATION, 1)
    expect(num(right, 'rotation')).toBeCloseTo(FAN_REST_ROTATION, 1)
    expect(num(center, 'scale')).toBeCloseTo(1, 2)
    expect(num(center, 'opacity')).toBeCloseTo(1, 2)
  })

  it('a central entra antes das laterais começarem a sair', () => {
    // no meio da entrada da central as laterais ainda estão empilhadas
    tl.seek(0.2)
    const left = scope.querySelector('[data-fan="left"]')!
    expect(num(left, 'x')).toBeCloseTo(FAN_STACK_OFFSET, 0)
  })

  it('as laterais deslizam para fora ao longo do tempo', () => {
    const left = scope.querySelector('[data-fan="left"]')!
    tl.seek(0.5)
    const meio = num(left, 'x')
    tl.seek(1.1)
    const depois = num(left, 'x')

    expect(meio).toBeLessThan(FAN_STACK_OFFSET)
    expect(depois).toBeLessThan(meio)
    expect(depois).toBeGreaterThanOrEqual(0)
  })
})
