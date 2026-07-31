import { useEffect, type ReactNode } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Largura máxima do painel (classe Tailwind) */
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidth} rounded-(--radius-shell) bg-card p-6 shadow-(--shadow-lift)`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer rounded-full p-1.5 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
