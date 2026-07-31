export type BadgeKind =
  | 'social'
  | 'slides'
  | 'pdf'
  | 'novo'
  | 'recente'
  | 'arquivado'

/** Cores R5: categoria = cor cheia; status novo/recente = tintas claras; arquivado = cinza */
const kindStyles: Record<BadgeKind, string> = {
  social: 'bg-accent-social text-white',
  slides: 'bg-accent-slides text-white',
  pdf: 'bg-accent-pdf text-white',
  novo: 'bg-retro-amarelo text-ink',
  recente: 'bg-retro-gelo text-ink',
  arquivado: 'bg-ink/10 text-ink-muted',
}

const kindLabels: Record<BadgeKind, string> = {
  social: 'Social',
  slides: 'Slides',
  pdf: 'PDF',
  novo: 'Novo',
  recente: 'Recente',
  arquivado: 'Arquivado',
}

export function Badge({ kind, label }: { kind: BadgeKind; label?: string }) {
  return (
    <span className={`text-meta inline-flex items-center rounded-full px-2.5 py-1 font-semibold ${kindStyles[kind]}`}>
      {label ?? kindLabels[kind]}
    </span>
  )
}
