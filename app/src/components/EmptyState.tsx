import type { ReactNode } from 'react'

/** Empty state canônico (R6): ilustração opcional + headline grotesca + subtítulo + pill CTA */
export function EmptyState({
  headline,
  subtitle,
  action,
  illustration,
}: {
  headline: string
  subtitle?: string
  action?: ReactNode
  illustration?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      {illustration ? <div className="mb-2">{illustration}</div> : null}
      <h1 className="max-w-xl text-4xl font-bold tracking-tight">{headline}</h1>
      {subtitle ? <p className="max-w-md text-sm text-ink-muted">{subtitle}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
