import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export type AddMenuItem = {
  label: string
  onClick: () => void
}

type AddMenuProps = {
  items: AddMenuItem[]
  className?: string
}

/**
 * FAB "+" flutuante (Add no Figma) que expande um menu vertical de atalhos
 * (add_component/nav_item) acima do botão. Estados default/active do FAB
 * (ícone + / ícone ×) e abertura/fechamento animados com GSAP.
 */
export function AddMenu({ items, className = '' }: AddMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = menuRef.current
      if (!el) return
      const pills = el.querySelectorAll('[data-add-menu-item]')
      if (open) {
        gsap.fromTo(
          pills,
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out', stagger: 0.04 },
        )
      }
    },
    { dependencies: [open], scope: menuRef },
  )

  return (
    <div ref={menuRef} className={`relative flex flex-col items-center gap-4 ${className}`}>
      {open ? (
        <div className="absolute bottom-full mb-6 flex flex-col items-center gap-4">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              data-add-menu-item
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className="cursor-pointer whitespace-nowrap rounded-full bg-brand-navy px-6 py-2 text-lg font-medium text-white transition-colors hover:bg-brand-navy-deep"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        aria-label={open ? 'Fechar menu de criação' : 'Criar nova peça'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex size-[72px] cursor-pointer items-center justify-center rounded-full transition-colors ${
          open ? 'bg-brand-gold-hover' : 'bg-brand-gold hover:bg-brand-gold-hover'
        }`}
      >
        <svg width="23" height="23" viewBox="0 0 23 23" fill="none" aria-hidden="true">
          {open ? (
            <path d="M4 4l15 15M19 4L4 19" stroke="#2d2d2d" strokeWidth="1.6" strokeLinecap="round" />
          ) : (
            <path
              d="M11.5 2v19M2 11.5h19"
              stroke="#2d2d2d"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
    </div>
  )
}
