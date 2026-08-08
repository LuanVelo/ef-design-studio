import gsap from 'gsap'

/**
 * Distância horizontal entre o centro de uma peça lateral e o da central:
 * o leque tem 752px e as laterais 280px, então o centro de cada lateral fica
 * a 140px da borda e o da central a 376px — 236px de diferença.
 */
export const FAN_STACK_OFFSET = 236

/** Ângulo de repouso das peças laterais do leque. */
export const FAN_REST_ROTATION = 10

/**
 * Entrada em baralho da tela de login: as duas peças laterais saem de trás da
 * central. Elas partem empilhadas no centro e sem rotação — como a central é
 * opaca e tem z-index maior, ficam escondidas até começarem a deslizar.
 *
 * O ângulo de repouso do leque é definido aqui, e não no CSS: as utilidades
 * `rotate-*` do Tailwind escrevem na propriedade `rotate`, que somaria com o
 * `transform` do GSAP e dobraria o ângulo.
 */
export function buildFanTimeline(scope: HTMLElement): gsap.core.Timeline {
  const q = gsap.utils.selector(scope)
  gsap.set(q('[data-fan="left"]'), { rotation: -FAN_REST_ROTATION })
  gsap.set(q('[data-fan="right"]'), { rotation: FAN_REST_ROTATION })

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  tl.from(q('[data-fan="center"]'), { y: 28, scale: 0.96, opacity: 0, duration: 0.5 })
    .from(
      q('[data-fan="left"]'),
      { x: FAN_STACK_OFFSET, y: 6, rotation: 0, scale: 0.94, duration: 0.9 },
      '-=0.15',
    )
    .from(
      q('[data-fan="right"]'),
      { x: -FAN_STACK_OFFSET, y: 6, rotation: 0, scale: 0.94, duration: 0.9 },
      '<0.09',
    )
  return tl
}
