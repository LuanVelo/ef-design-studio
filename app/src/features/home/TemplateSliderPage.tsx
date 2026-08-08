import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSession } from '@auth/session'
import { EmptyState } from '@components/EmptyState'
import { Modal } from '@components/Modal'
import { PillButton } from '@components/PillButton'
import { useObjectUrl } from '@components/useObjectUrl'
import type { TemplateCategory } from '@core/schemas'
import { templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import { latestPerManifestId } from '@features/manager/template-filters'
import { createSocialProject, saveSocialProject } from '@features/social/social-project'
import { createSlidesProject } from '@features/slides/slides-project'

type TemplateSliderPageProps = {
  categories: readonly TemplateCategory[]
  title: string
}

/**
 * Escolha de template por categoria (Figma "tipo selecionado"): um slider
 * horizontal grande com barra de progresso própria. Escolher um template
 * cria o projeto e abre o editor correspondente.
 */
export function TemplateSliderPage({ categories, title }: TemplateSliderPageProps) {
  const user = useSession((s) => s.user)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const formatoAtalho = params.get('formato')
  const [templates, setTemplates] = useState<TemplateRecord[] | null>(null)
  const [formatChoice, setFormatChoice] = useState<TemplateRecord | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!user) return
    void templatesRepo.listByOwner(user.id).then((list) => {
      const elegiveis = latestPerManifestId(
        list.filter((t) => t.status !== 'arquivado' && categories.includes(t.category)),
      )
      setTemplates(
        formatoAtalho
          ? elegiveis.filter((t) =>
              (t.manifest?.formats ?? []).some((f) => f.key === formatoAtalho),
            )
          : elegiveis,
      )
    })
    // categories é literal por rota; formatoAtalho vem da query
  }, [user, categories, formatoAtalho])

  const onScroll = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgress(max > 0 ? el.scrollLeft / max : 0)
  }, [])

  const isSocial = categories.includes('social')

  async function abrir(template: TemplateRecord, formatKey?: string) {
    if (isSocial) {
      const project = await createSocialProject(template)
      // Atalho do "+": o formato já veio escolhido, pula a etapa 2 do wizard.
      if (formatoAtalho) {
        await saveSocialProject(project, { formatKeys: [formatoAtalho], step: 3 })
      }
      navigate(`/social/${project.id}`)
      return
    }
    const formats = template.manifest?.formats ?? []
    const key = formatKey ?? (formats.length === 1 ? formats[0].key : undefined)
    if (!key) {
      setFormatChoice(template)
      return
    }
    const project = await createSlidesProject(template, key)
    navigate(`/slides/${project.id}`)
  }

  if (!user) return null

  return (
    <div className="flex flex-1 flex-col justify-center gap-24 py-8">
      {templates === null ? (
        <p className="text-center text-sm text-ink-muted">Carregando templates…</p>
      ) : templates.length === 0 ? (
        <EmptyState
          headline={`Nenhum template ${title.toLowerCase()} por aqui ainda`}
          subtitle="Importe um pacote .eftpl no gerenciador para começar a produzir peças."
          action={
            <PillButton variant="brand" onClick={() => navigate('/templates')}>
              Abrir gerenciador
            </PillButton>
          }
        />
      ) : (
        <>
          <div
            ref={trackRef}
            onScroll={onScroll}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {templates.map((template) => (
              <TemplateSlide
                key={template.id}
                template={template}
                onClick={() => void abrir(template)}
              />
            ))}
          </div>

          <div className="mx-auto h-1.5 w-full max-w-[960px] overflow-hidden rounded-full border border-[#dadada] bg-brand-light-text">
            <div
              className="h-full rounded-full bg-brand-gold transition-[width,margin] duration-150"
              style={{ width: '40%', marginInlineStart: `${progress * 60}%` }}
            />
          </div>
        </>
      )}

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
                void abrir(template, f.key)
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

/** Card do slider: thumbnail do template em moldura navy com rodapé dourado. */
function TemplateSlide({ template, onClick }: { template: TemplateRecord; onClick: () => void }) {
  const thumbUrl = useObjectUrl(template.thumbnailBytes, template.thumbnailMime)
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="template-slide"
      className="flex size-[318px] shrink-0 snap-start cursor-pointer flex-col overflow-hidden bg-brand-navy-deep text-left transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="flex flex-1 flex-col justify-between overflow-hidden p-5">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <p
            className="text-[21px] leading-tight text-brand-paper"
            style={{ fontFamily: 'var(--font-display-alt)' }}
          >
            {template.name}
          </p>
        )}
        <span className="text-meta mt-3 text-brand-gold">{template.name}</span>
      </div>
      <div className="h-[18px] w-full bg-brand-gold" />
    </button>
  )
}
