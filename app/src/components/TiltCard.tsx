import { useRef, type CSSProperties, type ReactNode } from 'react'
import gsap from 'gsap'

const TILT_MAX_DEG = 10
const LIFT_Z = 30

type TiltCardProps = {
  /** Identifica o card no timeline de entrada do leque */
  slot: 'left' | 'center' | 'right'
  /** z-index de repouso; no hover o card sobe para o topo da pilha */
  baseZ: number
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Card do leque da tela de entrada: segue o mouse com uma inclinação 3D leve
 * e volta ao repouso ao sair. A rotação Z de repouso (o ângulo do leque) é
 * definida pelo GSAP em LoginPage — aqui só mexemos em rotationX/Y, que o
 * GSAP guarda separado e por isso não desfaz o ângulo do leque.
 */
export function TiltCard({ slot, baseZ, className = '', style, children }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // sem área medida a normalização viraria divisão por zero (NaN no tween)
    if (!rect.width || !rect.height) return
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    gsap.to(el, {
      rotationY: px * TILT_MAX_DEG * 2,
      rotationX: -py * TILT_MAX_DEG * 2,
      transformPerspective: 900,
      scale: 1.03,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }

  function onEnter() {
    if (ref.current) gsap.set(ref.current, { zIndex: LIFT_Z })
  }

  function onLeave() {
    const el = ref.current
    if (!el) return
    // z-index volta na hora, não no fim do tween: senão o card que está
    // saindo continua empatado em LIFT_Z com o que acabou de ser apontado, e
    // o desempate pela ordem do DOM deixa a peça central sempre por cima.
    gsap.set(el, { zIndex: baseZ })
    gsap.to(el, {
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      duration: 0.5,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }

  return (
    <div
      ref={ref}
      data-fan={slot}
      className={className}
      style={{ zIndex: baseZ, ...style }}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  )
}
