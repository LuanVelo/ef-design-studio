import type { ReactNode } from 'react'

/** Empty state canônico (R6): headline grotesca + subtítulo + pill CTA */
export function EmptyState({
  headline,
  subtitle,
  action,
}: {
  headline: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="max-w-xl text-4xl font-bold tracking-tight">{headline}</h1>
      {subtitle ? <p className="max-w-md text-sm text-ink-muted">{subtitle}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
