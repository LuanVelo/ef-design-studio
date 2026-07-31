import { useRef, useState, type DragEvent } from 'react'
import DOMPurify from 'dompurify'
import { Card } from '@components/Card'
import { Modal } from '@components/Modal'
import { PillButton } from '@components/PillButton'
import { TemplateRenderer } from '@core/render'
import type { EftplValidationResult } from '@core/validate/eftpl'
import type { SlotValue, TemplateManifest } from '@core/schemas'
import { openFile } from '@data/fs-adapter'
import { compressImageFile } from '@features/social/image-utils'
import { ColorField } from '@features/social/SlotFields'
import { missingRequiredKeys } from './content-import'
import { emptySlide, type SlideContent, type SlidesProjectData } from './slides-project'

const RICHTEXT_TAGS = ['b', 'i', 'strong', 'em', 'br']

type Zoom = 'fit' | 0.5 | 1

/**
 * Editor on-screen (F4.2): filmstrip + canvas com edição inline + painel de
 * ajustes. Guardrail v1: nada de mover/redimensionar/criar elementos — só
 * conteúdo dentro dos slots do template.
 */
export function SlidesCanvas({
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
  const format = manifest.formats.find((f) => f.key === formatKey) ?? manifest.formats[0]
  const slides = data.slides ?? []
  const [selected, setSelected] = useState(0)
  const [zoom, setZoom] = useState<Zoom>('fit')
  const [addOpen, setAddOpen] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const canvasBox = useRef<HTMLDivElement>(null)
  const index = Math.min(selected, Math.max(slides.length - 1, 0))
  const slide = slides[index] ?? emptySlide()

  const variantSlot = manifest.slots.find((s) => s.type === 'variant')
  const imageSlots = manifest.slots.filter((s) => s.type === 'image')
  const listSlots = manifest.slots.filter((s) => s.type === 'list')
  const missing = missingRequiredKeys(slide, manifest)

  function setSlides(next: SlideContent[]) {
    onChange({ slides: next })
  }

  function updateSlide(i: number, patch: Partial<SlideContent>) {
    setSlides(
      slides.map((s, j) =>
        j === i
          ? {
              ...s,
              ...patch,
              values: { ...s.values, ...patch.values },
              images: { ...s.images, ...patch.images },
              imageTransforms: { ...s.imageTransforms, ...patch.imageTransforms },
            }
          : s,
      ),
    )
  }

  function addSlide(variant?: string) {
    const s = emptySlide()
    s.variant =
      variant ??
      (variantSlot?.type === 'variant'
        ? (variantSlot.default ?? variantSlot.options[0])
        : undefined)
    setSlides([...slides, s])
    setSelected(slides.length)
  }

  function duplicateSlide(i: number) {
    const copy = structuredClone(slides[i])
    setSlides([...slides.slice(0, i + 1), copy, ...slides.slice(i + 1)])
    setSelected(i + 1)
  }

  function removeSlide(i: number) {
    if (slides.length <= 1) return
    setSlides(slides.filter((_, j) => j !== i))
    setSelected(Math.max(0, i - 1))
  }

  function moveSlide(from: number, to: number) {
    if (from === to) return
    const next = [...slides]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setSlides(next)
    setSelected(to)
  }

  /** Edição inline: torna slots de texto editáveis dentro do iframe do canvas. */
  function wireInlineEditing(root: HTMLElement, doc: Document) {
    for (const slot of manifest.slots) {
      if (slot.type !== 'text' && slot.type !== 'richtext') continue
      const el = doc.querySelector<HTMLElement>(`[data-slot="${slot.key}"]`)
      if (!el) continue
      el.contentEditable = slot.type === 'text' ? 'plaintext-only' : 'true'
      el.style.outline = 'none'
      el.style.cursor = 'text'
      // commit no blur (evita re-render resetando o cursor durante a digitação)
      el.onblur = () => {
        const raw =
          slot.type === 'richtext'
            ? DOMPurify.sanitize(el.innerHTML, { ALLOWED_TAGS: RICHTEXT_TAGS, ALLOWED_ATTR: [] })
            : (el.textContent ?? '')
        const limited =
          'maxChars' in slot && slot.maxChars != null ? raw.slice(0, slot.maxChars) : raw
        updateSlide(index, { values: { [slot.key]: limited } })
      }
    }
    void root
  }

  async function pickImage(slotKey: string) {
    const file = await openFile({
      accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
      description: 'Imagem',
    })
    if (!file) return
    updateSlide(index, {
      images: { [slotKey]: await compressImageFile(file) },
      imageTransforms: { [slotKey]: { x: 50, y: 50, scale: 1 } },
    })
  }

  const fitScale = undefined // TemplateRenderer ajusta ao container quando scale é undefined
  const canvasScale = zoom === 'fit' ? fitScale : zoom

  return (
    <div
      className="grid grid-cols-[10rem_minmax(0,1fr)_16rem] gap-4"
      data-testid="slides-canvas"
    >
      {/* Filmstrip */}
      <aside className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1" data-testid="filmstrip">
        {slides.map((s, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e: DragEvent) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragFrom !== null) moveSlide(dragFrom, i)
              setDragFrom(null)
            }}
            className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${
              i === index ? 'border-ink' : 'border-hairline hover:border-ink/30'
            }`}
            onClick={() => setSelected(i)}
            data-testid="filmstrip-item"
          >
            <TemplateRenderer
              manifest={manifest}
              layoutHtml={validation.layouts[format.key]}
              styles={validation.styles}
              resourceUrls={resourceUrls}
              width={format.width}
              height={format.height}
              content={{
                values: s.values,
                variant: s.variant,
                colors: data.colors,
                images: s.images,
                imageTransforms: s.imageTransforms,
                pageNumber: i + 1,
              }}
            />
            <span className="text-meta absolute bottom-1 left-1.5 rounded bg-white/85 px-1 text-ink">
              {i + 1}
            </span>
            <span className="absolute top-1 right-1 hidden gap-0.5 group-hover:flex">
              <button
                type="button"
                title="Duplicar slide"
                onClick={(e) => {
                  e.stopPropagation()
                  duplicateSlide(i)
                }}
                className="cursor-pointer rounded bg-white/90 px-1.5 text-xs shadow-sm hover:bg-white"
              >
                ⧉
              </button>
              <button
                type="button"
                title="Excluir slide"
                onClick={(e) => {
                  e.stopPropagation()
                  removeSlide(i)
                }}
                disabled={slides.length <= 1}
                className="cursor-pointer rounded bg-white/90 px-1.5 text-xs shadow-sm hover:bg-white disabled:opacity-40"
              >
                ×
              </button>
            </span>
          </div>
        ))}
        <button
          type="button"
          onClick={() => (variantSlot ? setAddOpen(true) : addSlide())}
          className="shrink-0 cursor-pointer rounded-lg border-2 border-dashed border-ink/20 py-3 text-sm font-medium text-ink-muted hover:border-ink/40 hover:text-ink"
          data-testid="add-slide"
        >
          + slide
        </button>
      </aside>

      {/* Canvas central com toolbar pill escura (R2) */}
      <div className="relative flex flex-col" ref={canvasBox}>
        <div
          className={`rounded-xl border border-hairline bg-white ${zoom === 'fit' ? 'overflow-hidden' : 'max-h-[70vh] overflow-auto'}`}
        >
          <TemplateRenderer
            key={`${index}-${slide.variant ?? ''}`}
            manifest={manifest}
            layoutHtml={validation.layouts[format.key]}
            styles={validation.styles}
            resourceUrls={resourceUrls}
            width={format.width}
            height={format.height}
            scale={canvasScale}
            interactive
            content={{
              values: slide.values,
              variant: slide.variant,
              colors: data.colors,
              images: slide.images,
              imageTransforms: slide.imageTransforms,
              pageNumber: index + 1,
            }}
            onRootReady={wireInlineEditing}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-white shadow-(--shadow-lift)">
            {(['fit', 0.5, 1] as const).map((z) => (
              <button
                key={String(z)}
                type="button"
                onClick={() => setZoom(z)}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  zoom === z ? 'bg-white text-ink' : 'text-white/80 hover:text-white'
                }`}
              >
                {z === 'fit' ? 'Ajustar' : `${z * 100}%`}
              </button>
            ))}
            <span className="text-meta ml-2 text-white/70">
              slide {index + 1}/{slides.length}
            </span>
          </div>
        </div>
      </div>

      {/* Painel lateral: variant, cores, imagens, listas, não mapeado */}
      <aside className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto" data-testid="side-panel">
        {missing.length > 0 ? (
          <span className="text-meta rounded-full bg-retro-amarelo px-2.5 py-1 text-ink">
            faltam: {missing.join(', ')}
          </span>
        ) : null}

        {variantSlot?.type === 'variant' ? (
          <Card bordered className="flex flex-col gap-2 p-3">
            <span className="text-meta font-semibold text-ink-muted uppercase">
              {variantSlot.label}
            </span>
            <div className="flex flex-wrap gap-1">
              {variantSlot.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateSlide(index, { variant: opt })}
                  className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium ${
                    (slide.variant ?? variantSlot.default) === opt
                      ? 'bg-ink text-white'
                      : 'bg-ink/5 text-ink hover:bg-ink/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        {imageSlots.map((slot) => {
          const t = slide.imageTransforms?.[slot.key] ?? { x: 50, y: 50, scale: 1 }
          const has = Boolean(slide.images[slot.key])
          return (
            <Card bordered key={slot.key} className="flex flex-col gap-2 p-3">
              <span className="text-meta font-semibold text-ink-muted uppercase">{slot.label}</span>
              <PillButton variant="ghost" onClick={() => void pickImage(slot.key)}>
                {has ? 'Trocar imagem' : 'Escolher imagem'}
              </PillButton>
              {has ? (
                <div className="flex flex-col gap-1 text-xs">
                  {(
                    [
                      ['x', 'Horizontal', 0, 100],
                      ['y', 'Vertical', 0, 100],
                      ['scale', 'Zoom', 1, 3],
                    ] as const
                  ).map(([key, label, min, max]) => (
                    <label key={key} className="flex items-center gap-2">
                      <span className="w-16 text-ink-muted">{label}</span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={key === 'scale' ? 0.05 : 1}
                        value={t[key]}
                        onChange={(e) =>
                          updateSlide(index, {
                            imageTransforms: {
                              [slot.key]: { ...t, [key]: Number(e.target.value) },
                            },
                          })
                        }
                        className="flex-1 accent-ink"
                      />
                    </label>
                  ))}
                </div>
              ) : null}
            </Card>
          )
        })}

        {listSlots.map((slot) => {
          const raw = slide.values[slot.key]
          const items = Array.isArray(raw) ? raw : []
          return (
            <Card bordered key={slot.key} className="flex flex-col gap-2 p-3">
              <span className="text-meta font-semibold text-ink-muted uppercase">{slot.label}</span>
              <textarea
                value={items.join('\n')}
                rows={3}
                placeholder="um item por linha"
                onChange={(e) =>
                  updateSlide(index, {
                    values: {
                      [slot.key]: e.target.value.split('\n').filter((l) => l !== ''),
                    },
                  })
                }
                className="resize-y rounded-lg border border-ink/15 bg-card px-2.5 py-1.5 text-sm outline-none focus:border-ink/40"
              />
            </Card>
          )
        })}

        {(manifest.colors?.editable ?? []).length > 0 ? (
          <Card bordered className="flex flex-col gap-2 p-3">
            <span className="text-meta font-semibold text-ink-muted uppercase">Cores</span>
            {(manifest.colors?.editable ?? []).map((color) => (
              <ColorField
                key={color.key}
                color={color}
                value={data.colors[color.key]}
                onChange={(v) => onChange({ colors: { ...data.colors, [color.key]: v } })}
              />
            ))}
          </Card>
        ) : null}

        {data.unmapped.length > 0 ? (
          <Card bordered className="flex flex-col gap-2 p-3" data-testid="unmapped-panel">
            <span className="text-meta font-semibold text-ink-muted uppercase">
              Conteúdo não mapeado
            </span>
            {data.unmapped.map((item, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-lg bg-surface p-2 text-xs">
                <span className="text-meta text-ink-muted uppercase">
                  slide {item.slideIndex + 1} · {item.key}
                </span>
                <span className="line-clamp-2">
                  {Array.isArray(item.value) ? item.value.join(' · ') : item.value}
                </span>
                <select
                  value=""
                  aria-label="Mapear para slot"
                  onChange={(e) => {
                    const slotKey = e.target.value
                    if (!slotKey) return
                    const slot = manifest.slots.find((s) => s.key === slotKey)
                    if (!slot) return
                    let value: SlotValue = item.value
                    if (slot.type === 'list') value = Array.isArray(value) ? value : [String(value)]
                    else value = Array.isArray(value) ? value.join('\n') : value
                    const next = slides.map((s, j) =>
                      j === item.slideIndex ? { ...s, values: { ...s.values, [slotKey]: value } } : s,
                    )
                    onChange({
                      slides: next,
                      unmapped: data.unmapped.filter((_, j) => j !== i),
                    })
                  }}
                  className="cursor-pointer rounded-lg border border-ink/15 bg-card px-2 py-1 outline-none"
                >
                  <option value="">mapear para…</option>
                  {manifest.slots
                    .filter((s) => s.type === 'text' || s.type === 'richtext' || s.type === 'list')
                    .map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.key}
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </Card>
        ) : null}
      </aside>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Novo slide" maxWidth="max-w-md">
        <div className="flex flex-col gap-2" data-testid="add-slide-variants">
          {variantSlot?.type === 'variant'
            ? variantSlot.options.map((opt) => (
                <PillButton
                  key={opt}
                  variant="ghost"
                  onClick={() => {
                    setAddOpen(false)
                    addSlide(opt)
                  }}
                >
                  {opt}
                </PillButton>
              ))
            : null}
        </div>
      </Modal>
    </div>
  )
}
