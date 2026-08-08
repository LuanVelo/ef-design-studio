import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddMenu } from '@components/AddMenu'
import { FolderCard, type FolderCardTone } from '@components/FolderCard'

type HomeCard = {
  key: FolderCardTone
  eyebrow: string
  title: string
  to: string
}

const CARDS: HomeCard[] = [
  {
    key: 'social',
    eyebrow: 'Templates social',
    title: 'Instagram, Facebook, LinkedIn.',
    to: '/social/novo',
  },
  {
    key: 'slides',
    eyebrow: 'Templates apresentação',
    title: 'Slides, powerpoint, PDF',
    to: '/slides/novo',
  },
  {
    key: 'historico',
    eyebrow: 'Histórico',
    title: 'Lista de todas suas criações moram aqui',
    to: '/historico',
  },
]

/** Atalhos do "+": levam à escolha de template já com o formato marcado. */
const ATALHOS = [
  { label: 'Stories', formato: 'stories' },
  { label: '1080x1080', formato: 'feed-square' },
  { label: '1080x1350', formato: 'feed-portrait' },
  { label: 'Carousel', formato: 'carousel-square' },
]

/**
 * Hub do app (Figma "home"): os três cards de tipo, reordenáveis pelo punho
 * de arrastar, e o "+" flutuante com atalhos por formato.
 */
export function HomePage() {
  const navigate = useNavigate()
  const [order, setOrder] = useState(CARDS)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  function reorder(from: number, to: number) {
    if (from === to) return
    setOrder((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-24 py-8">
      <div className="flex items-start justify-center gap-3">
        {order.map((card, index) => (
          <div
            key={card.key}
            draggable={dragIndex !== null}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) reorder(dragIndex, index)
              setDragIndex(null)
            }}
            className="flex flex-col items-center gap-8"
          >
            <FolderCard
              eyebrow={card.eyebrow}
              title={card.title}
              tone={card.key}
              onClick={() => navigate(card.to)}
            />
            <button
              type="button"
              aria-label={`Reordenar ${card.eyebrow}`}
              onMouseDown={() => setDragIndex(index)}
              onMouseUp={() => setDragIndex(null)}
              className="grid cursor-grab grid-cols-3 gap-1 active:cursor-grabbing"
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full transition-colors ${
                    dragIndex === index ? 'bg-brand-body/60' : 'bg-brand-body/20'
                  }`}
                />
              ))}
            </button>
          </div>
        ))}
      </div>

      <AddMenu
        items={ATALHOS.map((a) => ({
          label: a.label,
          onClick: () => navigate(`/social/novo?formato=${a.formato}`),
        }))}
      />
    </div>
  )
}
