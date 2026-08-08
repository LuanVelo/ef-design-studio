import { render, screen, fireEvent } from '@testing-library/react'
import gsap from 'gsap'
import { TiltCard } from './TiltCard'

const RECT = { x: 0, y: 0, left: 0, top: 0, width: 200, height: 300, right: 200, bottom: 300 }

function renderCard() {
  render(
    <TiltCard slot="center" baseZ={20}>
      <span>peça</span>
    </TiltCard>,
  )
  const el = screen.getByText('peça').parentElement as HTMLElement
  // jsdom não faz layout: sem um rect medido a normalização do mouse não roda
  el.getBoundingClientRect = () => ({ ...RECT, toJSON: () => RECT }) as DOMRect
  return el
}

/** Leva os tweens do elemento ao fim sem depender de requestAnimationFrame. */
function settle(el: HTMLElement) {
  for (const tween of gsap.getTweensOf(el)) tween.progress(1)
}

describe('TiltCard', () => {
  afterEach(() => {
    gsap.globalTimeline.clear()
  })

  it('inclina na direção do mouse: canto inferior direito', () => {
    const el = renderCard()
    fireEvent.mouseMove(el, { clientX: 190, clientY: 290 })
    settle(el)

    // à direita → gira para a direita (rotationY > 0); embaixo → rotationX < 0
    expect(Number(gsap.getProperty(el, 'rotationY'))).toBeGreaterThan(0)
    expect(Number(gsap.getProperty(el, 'rotationX'))).toBeLessThan(0)
  })

  it('inclina para o outro lado no canto oposto', () => {
    const el = renderCard()
    fireEvent.mouseMove(el, { clientX: 10, clientY: 10 })
    settle(el)

    expect(Number(gsap.getProperty(el, 'rotationY'))).toBeLessThan(0)
    expect(Number(gsap.getProperty(el, 'rotationX'))).toBeGreaterThan(0)
  })

  it('volta ao repouso quando o mouse sai', () => {
    const el = renderCard()
    fireEvent.mouseMove(el, { clientX: 190, clientY: 290 })
    settle(el)
    fireEvent.mouseLeave(el)
    settle(el)

    expect(Number(gsap.getProperty(el, 'rotationX'))).toBeCloseTo(0, 2)
    expect(Number(gsap.getProperty(el, 'rotationY'))).toBeCloseTo(0, 2)
    expect(Number(gsap.getProperty(el, 'scale'))).toBeCloseTo(1, 2)
  })

  it('sobe na pilha ao entrar e volta ao z-index de repouso ao sair', () => {
    const el = renderCard()
    fireEvent.mouseEnter(el)
    expect(Number(gsap.getProperty(el, 'zIndex'))).toBeGreaterThan(20)

    fireEvent.mouseLeave(el)
    settle(el)
    expect(Number(gsap.getProperty(el, 'zIndex'))).toBe(20)
  })

  it('devolve o z-index já na saída, sem esperar o tween terminar', () => {
    const el = renderCard()
    fireEvent.mouseEnter(el)
    fireEvent.mouseLeave(el)

    // sem `settle`: o card que está saindo não pode continuar empatado com o
    // que acabou de ser apontado, senão a ordem do DOM decide quem fica acima
    expect(Number(gsap.getProperty(el, 'zIndex'))).toBe(20)
  })

  it('a peça apontada fica acima da central mesmo com ela ainda voltando ao repouso', () => {
    render(
      <>
        <TiltCard slot="left" baseZ={10}>
          <span>lateral</span>
        </TiltCard>
        <TiltCard slot="center" baseZ={20}>
          <span>central</span>
        </TiltCard>
      </>,
    )
    const lateral = screen.getByText('lateral').parentElement as HTMLElement
    const central = screen.getByText('central').parentElement as HTMLElement

    // o mouse atravessa a peça central (que ocupa o meio da tela) a caminho da lateral
    fireEvent.mouseEnter(central)
    fireEvent.mouseLeave(central)
    fireEvent.mouseEnter(lateral)

    const zLateral = Number(gsap.getProperty(lateral, 'zIndex'))
    const zCentral = Number(gsap.getProperty(central, 'zIndex'))
    expect(zLateral).toBeGreaterThan(zCentral)
  })

  it('ignora o movimento quando o elemento ainda não tem área medida', () => {
    render(
      <TiltCard slot="left" baseZ={10}>
        <span>sem layout</span>
      </TiltCard>,
    )
    const el = screen.getByText('sem layout').parentElement as HTMLElement
    fireEvent.mouseMove(el, { clientX: 5, clientY: 5 })

    expect(gsap.getTweensOf(el)).toHaveLength(0)
  })
})
