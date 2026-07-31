import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@components/Badge'
import { Card } from '@components/Card'
import { EmptyState } from '@components/EmptyState'
import { Modal } from '@components/Modal'
import { PillButton } from '@components/PillButton'
import { useDevice } from '@components/useDevice'
import { useSession } from '@auth/session'
import { createResourceUrls, TemplateRenderer } from '@core/render'
import { validateEftpl, type EftplValidationResult } from '@core/validate/eftpl'
import { openFile } from '@data/fs-adapter'
import { projectsRepo, templatesRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import type { SlotValue, TemplateManifest } from '@core/schemas'
import {
  buildContentPrompt,
  matchContentToTemplate,
  missingRequiredKeys,
  parseContentJson,
  parseMarkdownContent,
} from './content-import'
import {
  emptySlide,
  saveSlidesProject,
  slidesDataOf,
  type SlidesProjectData,
} from './slides-project'

const UNMAPPED_MIME = 'application/x-ef-unmapped'

/** Editor de apresentação (F4.1: entrada de conteúdo + rascunho com mapeamento). */
export function SlidesEditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useSession((s) => s.user)
  const device = useDevice()
  const [project, setProject] = useState<ProjectRecord | null | 'nao-encontrado'>(null)
  const [template, setTemplate] = useState<TemplateRecord | null>(null)
  const [validation, setValidation] = useState<EftplValidationResult | null>(null)
  const [resourceUrls, setResourceUrls] = useState<Record<string, string>>({})
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [entryError, setEntryError] = useState<string | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<ProjectRecord | null>(null)

  useEffect(
    () => () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
      if (pendingRef.current) void saveSlidesProject(pendingRef.current, {})
    },
    [],
  )

  useEffect(() => {
    if (!projectId || !user) return
    void (async () => {
      const rec = await projectsRepo.get(projectId)
      if (!rec || rec.ownerUserId !== user.id) {
        setProject('nao-encontrado')
        return
      }
      setProject(rec)
      setTemplate((await templatesRepo.get(rec.templateId)) ?? null)
    })()
  }, [projectId, user])

  useEffect(() => {
    if (!template?.packageBytes) return
    let revoke: (() => void) | undefined
    void (async () => {
      const result = await validateEftpl(template.packageBytes!)
      setValidation(result)
      if (result.ok) {
        const resources = createResourceUrls(result.binaries)
        revoke = resources.revoke
        setResourceUrls(resources.urls)
      }
    })()
    return () => revoke?.()
  }, [template])

  function save(patch: Partial<SlidesProjectData>, meta: { name?: string } = {}) {
    if (!project || project === 'nao-encontrado') return
    const optimistic: ProjectRecord = {
      ...project,
      ...meta,
      data: { ...slidesDataOf(project), ...patch },
    }
    setProject(optimistic)
    pendingRef.current = optimistic
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      pendingRef.current = null
      void saveSlidesProject(optimistic, {}).then((saved) => setSavedAt(saved.updatedAt))
    }, 400)
  }

  if (!user) return null
  if (device === 'celular') {
    return (
      <EmptyState
        headline="Slides funciona em tablet e desktop"
        subtitle="Abra este projeto num computador ou tablet para editar."
      />
    )
  }
  if (project === 'nao-encontrado') {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-ink-muted">Projeto não encontrado.</p>
        <Link to="/slides" className="text-sm font-medium underline">
          Voltar para Meus projetos
        </Link>
      </div>
    )
  }
  if (!project || !template || !validation) {
    return <p className="py-24 text-center text-sm text-ink-muted">Carregando projeto…</p>
  }
  if (!template.manifest || !validation.ok) {
    return (
      <p className="py-24 text-center text-sm text-red-700">
        O template deste projeto não pôde ser aberto — reimporte-o no gerenciador.
      </p>
    )
  }

  const manifest = template.manifest
  const data = slidesDataOf(project)
  const format = manifest.formats.find((f) => f.key === data.formatKey) ?? manifest.formats[0]

  async function importContentFile(kind: 'json' | 'md') {
    setEntryError(null)
    const file = await openFile(
      kind === 'json'
        ? { accept: { 'application/json': ['.json'] }, description: 'content.json' }
        : { accept: { 'text/markdown': ['.md', '.markdown', '.txt'] }, description: 'Markdown' },
    )
    if (!file) return
    try {
      const raw = await file.text()
      const doc = kind === 'json' ? parseContentJson(raw) : parseMarkdownContent(raw)
      const result = matchContentToTemplate(doc, manifest)
      save({ slides: result.slides, unmapped: result.unmapped }, { name: doc.title })
    } catch (err) {
      setEntryError((err as Error).message)
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(buildContentPrompt(template!))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6 pt-6" data-testid="slides-editor">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/slides" className="text-meta text-ink-muted uppercase hover:text-ink">
          ← Meus projetos
        </Link>
        <Badge kind={template.category} />
        <span className="text-meta text-ink-muted uppercase">
          {template.name} · {format.key}
        </span>
        {savedAt ? (
          <span className="text-meta ml-auto text-ink-muted" data-testid="autosave-indicator">
            Salvo automaticamente ·{' '}
            {new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
      </div>

      <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>

      {data.slides === null ? (
        <Card bordered className="flex flex-col gap-5 p-6" data-testid="content-entry">
          <h2 className="text-lg font-semibold tracking-tight">De onde vem o conteúdo?</h2>
          <p className="text-sm text-ink-muted">
            Suba um documento gerado pela IA (content.json ou Markdown), ou comece em branco e
            monte slide a slide. Use "Copiar prompt" para pedir o conteúdo à IA já no formato
            certo para este template.
          </p>
          <div className="flex flex-wrap gap-2">
            <PillButton onClick={() => void importContentFile('json')} data-testid="upload-json">
              Enviar content.json
            </PillButton>
            <PillButton onClick={() => void importContentFile('md')} data-testid="upload-md">
              Enviar Markdown
            </PillButton>
            <PillButton
              variant="ghost"
              onClick={() => {
                const slide = emptySlide()
                const variantSlot = manifest.slots.find((s) => s.type === 'variant')
                if (variantSlot?.type === 'variant') {
                  slide.variant = variantSlot.default ?? variantSlot.options[0]
                }
                save({ slides: [slide], unmapped: [] })
              }}
              data-testid="start-blank"
            >
              Começar em branco
            </PillButton>
            <PillButton variant="ghost" onClick={() => setPromptOpen(true)}>
              Copiar prompt para IA
            </PillButton>
          </div>
          {entryError ? (
            <p className="text-sm text-red-700" role="alert">
              {entryError}
            </p>
          ) : null}
        </Card>
      ) : (
        <SlidesDraft
          manifest={manifest}
          validation={validation}
          resourceUrls={resourceUrls}
          formatKey={format.key}
          data={data}
          onChange={(patch) => save(patch)}
        />
      )}

      <Modal open={promptOpen} onClose={() => setPromptOpen(false)} title="Prompt para IA" maxWidth="max-w-2xl">
        <div className="flex flex-col gap-4">
          <textarea
            readOnly
            value={buildContentPrompt(template)}
            rows={14}
            className="resize-y rounded-xl border border-ink/15 bg-surface px-3 py-2 font-mono text-xs leading-relaxed outline-none"
          />
          <div className="flex justify-end">
            <PillButton onClick={() => void copyPrompt()}>
              {copied ? 'Copiado ✓' : 'Copiar prompt'}
            </PillButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/** Rascunho F4.1: slides com campos mapeáveis + painel "Conteúdo não mapeado". */
function SlidesDraft({
  manifest,
  validation,
  resourceUrls,
  formatKey,
  data,
  onChange,
}: {
  manifest: TemplateManifest
  validation: EftplValidationResult
  resourceUrls: Record<string, string>
  formatKey: string
  data: SlidesProjectData
  onChange: (patch: Partial<SlidesProjectData>) => void
}) {
  const format = manifest.formats.find((f) => f.key === formatKey)!
  const slides = data.slides ?? []
  const variantSlot = manifest.slots.find((s) => s.type === 'variant')
  const textSlots = manifest.slots.filter(
    (s) => s.type === 'text' || s.type === 'richtext' || s.type === 'list',
  )

  function updateSlide(index: number, patch: Partial<(typeof slides)[number]>) {
    const next = slides.map((s, i) =>
      i === index ? { ...s, ...patch, values: { ...s.values, ...patch.values } } : s,
    )
    onChange({ slides: next })
  }

  function dropUnmapped(e: DragEvent, slideIndex: number, slotKey: string) {
    e.preventDefault()
    const raw = e.dataTransfer.getData(UNMAPPED_MIME)
    if (!raw) return
    const itemIndex = Number(raw)
    const item = data.unmapped[itemIndex]
    if (!item) return
    const slot = manifest.slots.find((s) => s.key === slotKey)
    if (!slot) return
    let value: SlotValue = item.value
    if (slot.type === 'list') value = Array.isArray(value) ? value : [String(value)]
    else value = Array.isArray(value) ? value.join('\n') : value
    const next = slides.map((s, i) =>
      i === slideIndex ? { ...s, values: { ...s.values, [slotKey]: value } } : s,
    )
    onChange({ slides: next, unmapped: data.unmapped.filter((_, i) => i !== itemIndex) })
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_18rem]" data-testid="slides-draft">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          {slides.length} slides importados. O editor visual completo chega na F4.2 — aqui você já
          revisa os textos, escolhe a variação e mapeia o conteúdo que sobrou.
        </p>
        {slides.map((slide, i) => {
          const missing = missingRequiredKeys(slide, manifest)
          return (
            <Card bordered key={i} className="flex flex-col gap-3 p-4" data-testid="slide-card">
              <div className="flex items-center justify-between gap-2">
                <span className="text-meta font-semibold text-ink-muted uppercase">
                  Slide {i + 1}
                </span>
                {missing.length > 0 ? (
                  <span
                    className="text-meta rounded-full bg-retro-amarelo px-2 py-0.5 text-ink"
                    data-testid="missing-required"
                  >
                    faltam: {missing.join(', ')}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="w-64 shrink-0 overflow-hidden rounded-lg border border-hairline bg-white">
                  <TemplateRenderer
                    manifest={manifest}
                    layoutHtml={validation.layouts[format.key]}
                    styles={validation.styles}
                    resourceUrls={resourceUrls}
                    width={format.width}
                    height={format.height}
                    content={{
                      values: slide.values,
                      variant: slide.variant,
                      colors: data.colors,
                      images: slide.images,
                      pageNumber: i + 1,
                    }}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {variantSlot?.type === 'variant' ? (
                    <select
                      value={slide.variant ?? variantSlot.default ?? variantSlot.options[0]}
                      onChange={(e) => updateSlide(i, { variant: e.target.value })}
                      aria-label={`Variação do slide ${i + 1}`}
                      className="w-fit cursor-pointer rounded-full border border-ink/15 bg-card px-3 py-1.5 text-xs font-medium outline-none"
                    >
                      {variantSlot.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {textSlots.map((slot) => {
                    const raw = slide.values[slot.key]
                    const isList = slot.type === 'list'
                    const text = isList
                      ? (Array.isArray(raw) ? raw : []).join('\n')
                      : typeof raw === 'string'
                        ? raw
                        : ''
                    return (
                      <label
                        key={slot.key}
                        className="flex flex-col gap-1 rounded-lg border border-dashed border-transparent p-1 text-xs [&:has(.drop-over)]:border-ink/40"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => dropUnmapped(e, i, slot.key)}
                        data-testid={`drop-${i}-${slot.key}`}
                      >
                        <span className="text-meta text-ink-muted uppercase">{slot.label}</span>
                        <textarea
                          value={text}
                          rows={isList ? 3 : text.length > 80 ? 3 : 1}
                          onChange={(e) =>
                            updateSlide(i, {
                              values: {
                                [slot.key]: isList
                                  ? e.target.value.split('\n').filter((l) => l !== '')
                                  : e.target.value,
                              },
                            })
                          }
                          className="resize-y rounded-lg border border-ink/15 bg-card px-2.5 py-1.5 text-sm outline-none focus:border-ink/40"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <Card bordered className="flex flex-col gap-3 p-4" data-testid="unmapped-panel">
          <h2 className="text-meta font-semibold text-ink-muted uppercase">
            Conteúdo não mapeado
          </h2>
          {data.unmapped.length === 0 ? (
            <p className="text-xs text-ink-muted">
              Tudo mapeado. Itens que não casarem com os slots do template aparecem aqui.
            </p>
          ) : (
            <>
              <p className="text-xs text-ink-muted">
                Arraste um item para o campo de um slide.
              </p>
              <ul className="flex flex-col gap-1.5">
                {data.unmapped.map((item, i) => (
                  <li
                    key={`${item.slideIndex}-${item.key}-${i}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData(UNMAPPED_MIME, String(i))}
                    className="cursor-grab rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs"
                    data-testid="unmapped-item"
                  >
                    <span className="text-meta block text-ink-muted uppercase">
                      slide {item.slideIndex + 1} · {item.key}
                    </span>
                    <span className="line-clamp-2">
                      {Array.isArray(item.value) ? item.value.join(' · ') : item.value}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </aside>
    </div>
  )
}
