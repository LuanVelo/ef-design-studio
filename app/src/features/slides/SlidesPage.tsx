import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@components/Badge'
import { Card } from '@components/Card'
import { EmptyState } from '@components/EmptyState'
import { PillButton } from '@components/PillButton'
import { useDevice } from '@components/useDevice'
import { useObjectUrl } from '@components/useObjectUrl'
import { useSession } from '@auth/session'
import { Modal } from '@components/Modal'
import { templatesRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import { TemplateSelectorModal } from '@features/manager/TemplateSelectorModal'
import { relativeTime } from '@features/social/social-project'
import { createSlidesProject, listSlidesProjects, slidesDataOf } from './slides-project'

/** Home do fluxo Slides/PDF (RF-SL2): "Meus projetos" + novo (template → formato). */
export function SlidesPage() {
  const user = useSession((s) => s.user)
  const navigate = useNavigate()
  const device = useDevice()
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null)
  const [templatesById, setTemplatesById] = useState<Record<string, TemplateRecord>>({})
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [formatChoice, setFormatChoice] = useState<TemplateRecord | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    const list = await listSlidesProjects(user.id)
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

  // RF-SL3: fluxo bloqueado em celular com mensagem clara
  if (device === 'celular') {
    return (
      <EmptyState
        headline="Slides funciona em tablet e desktop"
        subtitle="A edição de apresentações precisa de espaço de tela — abra o app num computador ou tablet. Seus projetos continuam salvos aqui."
      />
    )
  }

  const newButton = (
    <PillButton onClick={() => setSelectorOpen(true)} data-testid="new-slides-project">
      Nova apresentação
    </PillButton>
  )

  return (
    <div className="flex min-h-full flex-col">
      {projects === null ? (
        <p className="py-24 text-center text-sm text-ink-muted">Carregando projetos…</p>
      ) : projects.length === 0 ? (
        <EmptyState
          headline="Da ideia ao PDF sem sair do template"
          subtitle="Escolha um template de slides ou PDF, suba o conteúdo gerado pela IA (ou comece em branco) e edite dentro dos limites do design."
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
              <SlidesProjectCard
                key={p.id}
                project={p}
                template={templatesById[p.templateId]}
                onOpen={() => navigate(`/slides/${p.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      <TemplateSelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        categories={['slides', 'pdf']}
        helpText="Templates de slides e de PDF entram no mesmo fluxo — PDF é uma apresentação em formato A4."
        onSelect={(template) => {
          setSelectorOpen(false)
          const formats = template.manifest?.formats ?? []
          if (formats.length === 1) {
            void createSlidesProject(template, formats[0].key).then((p) =>
              navigate(`/slides/${p.id}`),
            )
          } else {
            setFormatChoice(template)
          }
        }}
      />

      <Modal
        open={formatChoice !== null}
        onClose={() => setFormatChoice(null)}
        title="Formato da apresentação"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-2" data-testid="format-choice">
          {(formatChoice?.manifest?.formats ?? []).map((f) => (
            <PillButton
              key={f.key}
              variant="ghost"
              onClick={() => {
                const template = formatChoice!
                setFormatChoice(null)
                void createSlidesProject(template, f.key).then((p) => navigate(`/slides/${p.id}`))
              }}
            >
              {f.key} · {f.width}×{f.height}
            </PillButton>
          ))}
        </div>
      </Modal>
    </div>
  )
}

function SlidesProjectCard({
  project,
  template,
  onOpen,
}: {
  project: ProjectRecord
  template?: TemplateRecord
  onOpen: () => void
}) {
  const thumbUrl = useObjectUrl(template?.thumbnailBytes, template?.thumbnailMime)
  const data = slidesDataOf(project)
  return (
    <Card
      bordered
      interactive
      className="flex cursor-pointer flex-col gap-3 p-4"
      onClick={onOpen}
      data-testid="slides-project-card"
    >
      <div className="relative mx-auto h-40 w-full overflow-hidden rounded-xl border border-hairline bg-surface">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full -rotate-1 object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-muted">
            template removido
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="truncate text-sm font-semibold tracking-tight">{project.name}</h3>
        <div className="flex items-center justify-between gap-2">
          <span className="text-meta text-ink-muted">
            {data.slides ? `${data.slides.length} slides · ` : ''}
            editado {relativeTime(project.updatedAt)}
          </span>
          {template ? <Badge kind={template.category} /> : null}
        </div>
      </div>
    </Card>
  )
}
