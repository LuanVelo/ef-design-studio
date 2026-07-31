import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { EmptyState } from '@components/EmptyState'
import { PillButton } from '@components/PillButton'
import { useDevice } from '@components/useDevice'
import { useSession } from '@auth/session'
import { fileFromDrop, openFile } from '@data/fs-adapter'
import { templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import { GlassFolderIllustration } from './GlassFolderIllustration'
import { ImportTemplateDialog } from './ImportTemplateDialog'
import { TemplateCard } from './TemplateCard'
import {
  allTags,
  EMPTY_FILTERS,
  filterTemplates,
  latestPerManifestId,
  recentTemplates,
  shouldPromoteToAtivo,
  sortTemplates,
  type TemplateCategoryFilter,
  type TemplateFilters,
  type TemplateSort,
  type TemplateStatusFilter,
} from './template-filters'

const EFTPL_ACCEPT = { 'application/zip': ['.eftpl'] }

const CATEGORY_OPTIONS: { value: TemplateCategoryFilter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'social', label: 'Social' },
  { value: 'slides', label: 'Slides' },
  { value: 'pdf', label: 'PDF' },
]

const STATUS_OPTIONS: { value: TemplateStatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'novo', label: 'Novos' },
  { value: 'recente', label: 'Recentes' },
  { value: 'ativo', label: 'Ativos' },
]

const SORT_OPTIONS: { value: TemplateSort; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'usados', label: 'Mais usados' },
  { value: 'az', label: 'A–Z' },
  { value: 'importacao', label: 'Data de importação' },
]

const selectClass =
  'cursor-pointer rounded-full border border-ink/15 bg-card px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-ink/40'

export function TemplatesPage() {
  const user = useSession((s) => s.user)
  const device = useDevice()
  const readOnly = device === 'celular'
  const [templates, setTemplates] = useState<TemplateRecord[] | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TemplateFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<TemplateSort>('recentes')

  const reload = useCallback(async () => {
    if (!user) return
    const list = await templatesRepo.listByOwner(user.id)
    // Regra F2.2: `novo` expira para `ativo` (14 dias ou 1º uso)
    for (const t of list) {
      if (shouldPromoteToAtivo(t)) {
        t.status = 'ativo'
        await templatesRepo.update(t.id, { status: 'ativo' })
      }
    }
    setTemplates(list)
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  async function pickFile() {
    const file = await openFile({
      accept: EFTPL_ACCEPT,
      description: 'Pacote de template (.eftpl)',
    })
    if (file) {
      setDropError(null)
      setPendingFile(file)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    if (readOnly) return
    const file = fileFromDrop(event.nativeEvent, ['.eftpl'])
    if (!file) {
      setDropError('Arquivo não reconhecido — solte um pacote .eftpl.')
      return
    }
    setDropError(null)
    setPendingFile(file)
  }

  // Grid mostra a versão mais alta de cada template; arquivados ficam para a aba própria (F2.4)
  const active = useMemo(
    () => latestPerManifestId((templates ?? []).filter((t) => t.status !== 'arquivado')),
    [templates],
  )
  const tags = useMemo(() => allTags(active), [active])
  const filtered = useMemo(
    () => sortTemplates(filterTemplates(active, filters), sort),
    [active, filters, sort],
  )
  const hasActiveFilters =
    filters.search !== '' ||
    filters.category !== 'todas' ||
    filters.tag !== null ||
    filters.status !== 'todos'
  const recents = useMemo(
    () => (hasActiveFilters ? [] : recentTemplates(active)),
    [active, hasActiveFilters],
  )

  if (!user) return null

  const importButton = readOnly ? null : (
    <PillButton onClick={() => void pickFile()} data-testid="import-button">
      Importar template (.eftpl)
    </PillButton>
  )

  return (
    <div
      className="relative flex min-h-full flex-col"
      onDragOver={(e) => {
        if (readOnly) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={onDrop}
    >
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-(--radius-card) border-2 border-dashed border-ink/30 bg-surface/80 backdrop-blur-sm">
          <p className="text-lg font-semibold">Solte o pacote .eftpl para importar</p>
        </div>
      ) : null}

      {templates === null ? (
        <p className="py-24 text-center text-sm text-ink-muted">Carregando templates…</p>
      ) : active.length === 0 && !hasActiveFilters ? (
        <EmptyState
          illustration={<GlassFolderIllustration />}
          headline="Seus templates moram aqui"
          subtitle={
            readOnly
              ? 'No celular o gerenciador é somente leitura — importe templates pelo computador.'
              : 'Importe um pacote .eftpl gerado pela IA — arraste o arquivo para esta tela ou use o botão abaixo.'
          }
          action={importButton}
        />
      ) : (
        <div className="flex flex-col gap-6 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            {importButton}
          </div>

          <div className="flex flex-wrap items-center gap-2" data-testid="template-toolbar">
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Buscar por nome, descrição ou tag…"
              aria-label="Buscar templates"
              className="w-64 rounded-full border border-ink/15 bg-card px-4 py-1.5 text-sm outline-none placeholder:text-ink-muted focus:border-ink/40"
            />
            <div className="flex gap-1" role="group" aria-label="Filtrar por categoria">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, category: opt.value }))}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    filters.category === opt.value
                      ? 'bg-ink text-white'
                      : 'bg-ink/5 text-ink hover:bg-ink/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value as TemplateStatusFilter }))
              }
              aria-label="Filtrar por status"
              className={selectClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {tags.length > 0 ? (
              <select
                value={filters.tag ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value || null }))}
                aria-label="Filtrar por tag"
                className={selectClass}
              >
                <option value="">Todas as tags</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as TemplateSort)}
              aria-label="Ordenar"
              className={`${selectClass} ml-auto`}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {recents.length > 0 ? (
            <section className="flex flex-col gap-3" data-testid="recents-section">
              <h2 className="text-meta font-semibold text-ink-muted uppercase">Recentes</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recents.map((t) => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
              <h2 className="text-meta mt-2 font-semibold text-ink-muted uppercase">Todos</h2>
            </section>
          ) : null}

          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-muted">
              Nenhum template corresponde aos filtros.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {dropError ? (
        <p className="py-3 text-center text-sm text-red-700" role="alert">
          {dropError}
        </p>
      ) : null}

      {readOnly && active.length > 0 ? (
        <p className="text-meta py-3 text-center text-ink-muted uppercase">
          Somente leitura no celular
        </p>
      ) : null}

      <ImportTemplateDialog
        file={pendingFile}
        ownerUserId={user.id}
        onClose={() => setPendingFile(null)}
        onImported={() => {
          setPendingFile(null)
          void reload()
        }}
      />
    </div>
  )
}
