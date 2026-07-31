import { useEffect, useMemo, useState } from 'react'
import { useSession } from '@auth/session'
import { useObjectUrl } from '@components/useObjectUrl'
import { templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import type { TemplateCategory } from '@core/schemas'
import {
  EMPTY_FILTERS,
  filterTemplates,
  latestPerManifestId,
  type TemplateStatusFilter,
} from './template-filters'

const STATUS_ITEMS: { value: TemplateStatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'novo', label: 'Novos' },
  { value: 'recente', label: 'Recentes' },
  { value: 'ativo', label: 'Ativos' },
]

type TemplateSelectorModalProps = {
  open: boolean
  onClose: () => void
  category: TemplateCategory
  /** Chamado ao escolher um template elegível */
  onSelect: (template: TemplateRecord) => void
  /** Conteúdo do bloco de ajuda no rodapé da sidebar */
  helpText?: string
}

/**
 * Modal seletor padrão R8: backdrop blur + sidebar (busca + lista de status +
 * bloco de ajuda) + grid de cards. Só templates elegíveis: categoria dada,
 * status ativo/novo/recente (arquivados ficam de fora), maior versão de cada id.
 */
export function TemplateSelectorModal({
  open,
  onClose,
  category,
  onSelect,
  helpText,
}: TemplateSelectorModalProps) {
  const user = useSession((s) => s.user)
  const [templates, setTemplates] = useState<TemplateRecord[] | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TemplateStatusFilter>('todos')

  useEffect(() => {
    if (!open || !user) return
    setSearch('')
    setStatus('todos')
    void templatesRepo.listByOwner(user.id).then((list) => {
      setTemplates(latestPerManifestId(list.filter((t) => t.status !== 'arquivado')))
    })
  }, [open, user])

  const eligible = useMemo(
    () =>
      filterTemplates(
        (templates ?? []).filter((t) => t.category === category),
        { ...EMPTY_FILTERS, search, status },
      ).sort((a, b) => (b.lastUsedAt ?? b.createdAt).localeCompare(a.lastUsedAt ?? a.createdAt)),
    [templates, category, search, status],
  )

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
        aria-label="Escolher template"
        className="flex h-[min(640px,90vh)] w-full max-w-3xl overflow-hidden rounded-(--radius-shell) bg-card shadow-(--shadow-lift)"
        onClick={(e) => e.stopPropagation()}
        data-testid="template-selector"
      >
        {/* Sidebar R8: busca + status + ajuda */}
        <aside className="flex w-56 shrink-0 flex-col gap-4 border-r border-hairline bg-surface p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar templates"
            className="rounded-full border border-ink/15 bg-card px-3.5 py-1.5 text-sm outline-none placeholder:text-ink-muted focus:border-ink/40"
          />
          <nav className="flex flex-col gap-0.5" aria-label="Filtrar por status">
            {STATUS_ITEMS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={`cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  status === item.value ? 'bg-ink/5 font-semibold' : 'hover:bg-ink/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 rounded-xl bg-card p-3 shadow-(--shadow-soft)">
            <p className="text-xs text-ink-muted">
              {helpText ?? 'Não achou o que queria? Importe um .eftpl novo no gerenciador.'}
            </p>
          </div>
        </aside>

        {/* Grid de cards */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight">Templates</h2>
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
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {templates === null ? (
              <p className="py-16 text-center text-sm text-ink-muted">Carregando…</p>
            ) : eligible.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-muted">
                Nenhum template {category} disponível. Importe um .eftpl no gerenciador.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {eligible.map((t) => (
                  <SelectorCard key={t.id} template={t} onSelect={() => onSelect(t)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SelectorCard({ template, onSelect }: { template: TemplateRecord; onSelect: () => void }) {
  const thumbUrl = useObjectUrl(template.thumbnailBytes, template.thumbnailMime)
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex cursor-pointer flex-col gap-2 rounded-(--radius-card) border border-hairline bg-card p-3 text-left transition-[transform,box-shadow] duration-150 ease-(--ease-out-app) hover:-translate-y-0.5 hover:shadow-(--shadow-lift)"
      data-testid="selector-card"
    >
      <span className="text-meta text-ink-muted uppercase">{template.category}</span>
      <div className="relative h-32 w-full overflow-hidden rounded-lg border border-hairline bg-surface">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <span className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-ink">
            Usar
          </span>
        </span>
      </div>
      <span className="truncate text-sm font-semibold tracking-tight">{template.name}</span>
    </button>
  )
}
