import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@auth/session'
import { Badge } from '@components/Badge'
import { Card } from '@components/Card'
import { EmptyState } from '@components/EmptyState'
import { PillButton } from '@components/PillButton'
import { useObjectUrl } from '@components/useObjectUrl'
import { templatesRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import { listSocialProjects, relativeTime } from '@features/social/social-project'
import { listSlidesProjects } from '@features/slides/slides-project'

type HistoricoItem = {
  project: ProjectRecord
  kind: 'social' | 'slides'
}

/**
 * Card "Histórico" da Home: tudo que já foi criado, dos dois fluxos, em uma
 * lista só ordenada por edição mais recente.
 */
export function HistoricoPage() {
  const user = useSession((s) => s.user)
  const navigate = useNavigate()
  const [items, setItems] = useState<HistoricoItem[] | null>(null)
  const [templatesById, setTemplatesById] = useState<Record<string, TemplateRecord>>({})

  const reload = useCallback(async () => {
    if (!user) return
    const [social, slides] = await Promise.all([
      listSocialProjects(user.id),
      listSlidesProjects(user.id),
    ])
    const merged: HistoricoItem[] = [
      ...social.map((project) => ({ project, kind: 'social' as const })),
      ...slides.map((project) => ({ project, kind: 'slides' as const })),
    ].sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt))
    setItems(merged)

    const templates = await Promise.all(
      [...new Set(merged.map((i) => i.project.templateId))].map((id) => templatesRepo.get(id)),
    )
    setTemplatesById(
      Object.fromEntries(templates.filter((t) => t !== undefined).map((t) => [t.id, t])),
    )
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!user) return null

  return (
    <div className="flex min-h-full flex-col">
      {items === null ? (
        <p className="py-24 text-center text-sm text-ink-muted">Carregando projetos…</p>
      ) : items.length === 0 ? (
        <EmptyState
          headline="Seu histórico começa na primeira peça"
          subtitle="Tudo que você criar em Social e em Apresentação aparece aqui, do mais recente para o mais antigo."
          action={
            <PillButton variant="brand" onClick={() => navigate('/')}>
              Voltar para o início
            </PillButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-6 pt-6">
          <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(({ project, kind }) => (
              <HistoricoCard
                key={project.id}
                project={project}
                kind={kind}
                template={templatesById[project.templateId]}
                onOpen={() => navigate(`/${kind}/${project.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoricoCard({
  project,
  kind,
  template,
  onOpen,
}: {
  project: ProjectRecord
  kind: 'social' | 'slides'
  template?: TemplateRecord
  onOpen: () => void
}) {
  const thumbUrl = useObjectUrl(template?.thumbnailBytes, template?.thumbnailMime)
  return (
    <Card
      bordered
      interactive
      className="flex cursor-pointer flex-col gap-3 p-4"
      onClick={onOpen}
      data-testid="historico-card"
    >
      <div className="relative mx-auto h-40 w-full overflow-hidden rounded-xl border border-hairline bg-surface">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-muted">
            template removido
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="truncate text-sm font-semibold tracking-tight">{project.name}</h3>
        <div className="flex items-center justify-between gap-2">
          <span className="text-meta text-ink-muted">editado {relativeTime(project.updatedAt)}</span>
          <Badge kind={kind === 'social' ? 'social' : 'slides'} />
        </div>
      </div>
    </Card>
  )
}
