import { Badge } from '@components/Badge'
import { Card } from '@components/Card'
import { useObjectUrl } from '@components/useObjectUrl'
import type { TemplateRecord } from '@data/types'
import { formatDateCaps, isRecent } from './template-meta'

type TemplateCardProps = {
  template: TemplateRecord
  onOpen?: (template: TemplateRecord) => void
}

/**
 * Card canônico de template (R3/R5): pilha fanada de thumbnails (uma camada
 * por formato, máx. 3), nome, badge de categoria, versão, status e data.
 */
export function TemplateCard({ template, onOpen }: TemplateCardProps) {
  const thumbUrl = useObjectUrl(template.thumbnailBytes, template.thumbnailMime)
  const formatCount = template.manifest?.formats.length ?? 1
  const layers = Math.min(formatCount, 3)

  return (
    <Card
      bordered
      interactive={Boolean(onOpen)}
      className={`flex flex-col gap-3 p-4 ${onOpen ? 'cursor-pointer' : ''}`}
      onClick={onOpen ? () => onOpen(template) : undefined}
      data-testid="template-card"
    >
      <div className="relative mx-auto h-44 w-36">
        {layers >= 3 ? (
          <div className="absolute inset-0 -rotate-3 rounded-xl border border-hairline bg-surface" />
        ) : null}
        {layers >= 2 ? (
          <div className="absolute inset-0 rotate-2 rounded-xl border border-hairline bg-white" />
        ) : null}
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Thumbnail de ${template.name}`}
            className="absolute inset-0 h-full w-full rounded-xl border border-hairline bg-white object-cover"
          />
        ) : (
          <div className="absolute inset-0 rounded-xl border border-hairline bg-ink/5" />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold tracking-tight">{template.name}</h3>
          <span className="text-meta shrink-0 text-ink-muted">v{template.version}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge kind={template.category} />
          {template.status === 'novo' ? <Badge kind="novo" /> : null}
          {template.status === 'arquivado' ? <Badge kind="arquivado" /> : null}
          {template.status !== 'arquivado' && isRecent(template) ? <Badge kind="recente" /> : null}
        </div>
        <div className="text-meta flex items-center justify-between text-ink-muted uppercase">
          <span>{formatDateCaps(template.createdAt)}</span>
          <span>
            {template.usageCount > 0 ? `${template.usageCount}× usado` : 'nunca usado'}
          </span>
        </div>
      </div>
    </Card>
  )
}
