import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@components/Badge'
import { Card } from '@components/Card'
import { EmptyState } from '@components/EmptyState'
import { PillButton } from '@components/PillButton'
import { useObjectUrl } from '@components/useObjectUrl'
import { useSession } from '@auth/session'
import { templatesRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import { TemplateSelectorModal } from '@features/manager/TemplateSelectorModal'
import { createSocialProject, listSocialProjects, relativeTime } from './social-project'

/** Home do fluxo social (RF-S2): "Meus projetos" com retomada + novo projeto. */
export function SocialPage() {
  const user = useSession((s) => s.user)
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null)
  const [templatesById, setTemplatesById] = useState<Record<string, TemplateRecord>>({})
  const [selectorOpen, setSelectorOpen] = useState(false)

  const reload = useCallback(async () => {
    if (!user) return
    const list = await listSocialProjects(user.id)
    setProjects(list)
    const templates = await Promise.all(
      [...new Set(list.map((p) => p.templateId))].map((id) => templatesRepo.get(id)),
    )
    setTemplatesById(
      Object.fromEntries(templates.filter((t) => t !== undefined).map((t) => [t.id, t])),
    )
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!user) return null

  const newButton = (
    <PillButton onClick={() => setSelectorOpen(true)} data-testid="new-project">
      Nova peça social
    </PillButton>
  )

  return (
    <div className="flex min-h-full flex-col">
      {projects === null ? (
        <p className="py-24 text-center text-sm text-ink-muted">Carregando projetos…</p>
      ) : projects.length === 0 ? (
        <EmptyState
          headline="Sua primeira peça social começa aqui"
          subtitle="Escolha um template, preencha o conteúdo e exporte em todos os formatos de uma vez."
          action={newButton}
        />
      ) : (
        <div className="flex flex-col gap-6 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Meus projetos</h1>
            {newButton}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                template={templatesById[p.templateId]}
                onOpen={() => navigate(`/social/${p.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      <TemplateSelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        categories={['social']}
        onSelect={(template) => {
          setSelectorOpen(false)
          void createSocialProject(template).then((project) => navigate(`/social/${project.id}`))
        }}
      />
    </div>
  )
}

/** Card de projeto (R4): thumbnail do template + nome + "editado há X". */
function ProjectCard({
  project,
  template,
  onOpen,
}: {
  project: ProjectRecord
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
      data-testid="project-card"
    >
      <div className="relative mx-auto h-40 w-full overflow-hidden rounded-xl border border-hairline bg-surface">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full rotate-1 object-cover" />
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
          {project.status === 'rascunho' ? (
            <span className="text-meta rounded-full bg-retro-gelo px-2 py-0.5 text-ink">
              Rascunho
            </span>
          ) : (
            <Badge kind="recente" label="Finalizado" />
          )}
        </div>
      </div>
    </Card>
  )
}
