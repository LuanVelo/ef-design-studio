import { useRef } from 'react'
import gsap from 'gsap'

export type FolderCardTone = 'social' | 'slides' | 'historico'

const TONE_GRADIENT: Record<FolderCardTone, string> = {
  social: 'linear-gradient(160deg, #ddcda9 0%, #c6ac81 100%)',
  slides: 'linear-gradient(160deg, #d6c39a 0%, #bfa476 100%)',
  historico: 'linear-gradient(160deg, #ececec 0%, #d9d9d9 100%)',
}

const SHADOW_REST = '0 10px 20px rgba(0,0,0,0.08)'
const SHADOW_HOVER = '0 24px 40px rgba(0,0,0,0.16)'

type FolderCardProps = {
  eyebrow: string
  title: string
  tone: FolderCardTone
  onClick?: () => void
}

/**
 * Card "tipo pasta" da Home (cards_tipo no Figma): retângulo branco com um
 * painel colorido por categoria, aba recortada no canto (metáfora de pasta,
 * ver design/DIRETRIZES-UI.md R1/R5) via clip-path — sem depender de PNG
 * exportado do Figma (decisão do usuário).
 */
export function FolderCard({ eyebrow, title, tone, onClick }: FolderCardProps) {
  const ref = useRef<HTMLButtonElement>(null)

  // gsap.to direto no handler (em vez de useGSAP/contextSafe): sob StrictMode
  // o contexto sem callback é revertido no mount duplicado e os tweens
  // agendados por ele nunca rodam.
  const onEnter = () => {
    gsap.to(ref.current, { y: -6, boxShadow: SHADOW_HOVER, duration: 0.25, ease: 'power2.out' })
  }

  const onLeave = () => {
    gsap.to(ref.current, { y: 0, boxShadow: SHADOW_REST, duration: 0.25, ease: 'power2.out' })
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className="relative h-[400px] w-80 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-white text-left"
      style={{ boxShadow: SHADOW_REST }}
    >
      <div
        className="absolute inset-y-0 left-0 w-[94%]"
        style={{
          background: TONE_GRADIENT[tone],
          clipPath: 'polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)',
        }}
      />
      <div className="absolute bottom-8 left-8 flex w-52 flex-col gap-2 text-brand-body">
        <p className="text-xs font-light">{eyebrow}</p>
        <p className="text-base leading-tight">{title}</p>
      </div>
    </button>
  )
}
