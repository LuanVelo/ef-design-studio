import { useEffect, useState, type DragEvent } from 'react'
import { Card } from '@components/Card'
import { PillButton } from '@components/PillButton'
import type { Device } from '@components/useDevice'
import { TemplateRenderer, type RenderContent } from '@core/render'
import type { EftplValidationResult } from '@core/validate/eftpl'
import type { TemplateRecord } from '@data/types'
import {
  addPage,
  duplicatePage,
  effectiveContent,
  emptyContent,
  movePage,
  pagesOf,
  removePage,
  type SocialContent,
  type SocialProjectData,
} from './social-project'
import {
  ColorField,
  FieldShell,
  ImageField,
  ListField,
  RichtextField,
  TextField,
  VariantField,
} from './SlotFields'

/** Debounce simples para o preview (RNF: atualização ≤300ms) */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

type SocialContentStepProps = {
  template: TemplateRecord
  validation: EftplValidationResult
  resourceUrls: Record<string, string>
  data: SocialProjectData
  onChange: (patch: Partial<SocialProjectData>) => void
  device: Device
  onBack: () => void
  onNext: () => void
}

/**
 * Etapa 3 (RF-S1/S3): formulário gerado dos slots + preview ao vivo com tabs
 * por formato. Conteúdo compartilhado; campos "fixados" viram override do
 * formato ativo; formatos multi (carousel) editam por página.
 */
export function SocialContentStep({
  template,
  validation,
  resourceUrls,
  data,
  onChange,
  device,
  onBack,
  onNext,
}: SocialContentStepProps) {
  const manifest = template.manifest!
  const selectedFormats = manifest.formats.filter((f) => data.formatKeys.includes(f.key))
  const [formatKey, setFormatKey] = useState(selectedFormats[0]?.key)
  const [pageByFormat, setPageByFormat] = useState<Record<string, number>>({})

  const format = selectedFormats.find((f) => f.key === formatKey) ?? selectedFormats[0]
  const isMulti = format?.pages === 'multi'
  const pages = format ? pagesOf(data, format.key) : []
  const pageIndex = format ? Math.min(pageByFormat[format.key] ?? 0, Math.max(pages.length - 1, 0)) : 0

  // Carousel: garante o mínimo de páginas do template ao entrar no formato
  useEffect(() => {
    if (!format || !isMulti) return
    const min = format.minPages ?? 2
    if (pages.length < min) {
      const filled = [...pages]
      while (filled.length < min) filled.push(emptyContent())
      onChange({ pages: { ...data.pages, [format.key]: filled } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format?.key, isMulti])

  const eff = format
    ? effectiveContent(data, format.key, isMulti ? pageIndex : undefined)
    : emptyContent()
  const previewContent: RenderContent = {
    values: eff.values,
    variant: eff.variant,
    colors: eff.colors,
    images: eff.images,
    pageNumber: isMulti ? pageIndex + 1 : 1,
  }
  const debouncedContent = useDebounced(previewContent, 250)

  if (!format) {
    return (
      <Card bordered className="flex flex-col gap-3 p-6">
        <p className="text-sm text-ink-muted">
          Nenhum formato selecionado — volte à etapa 2 e escolha pelo menos um.
        </p>
        <PillButton variant="ghost" onClick={onBack} className="w-fit">
          ← Formatos
        </PillButton>
      </Card>
    )
  }
  const scope: 'page' | 'shared-or-override' = isMulti ? 'page' : 'shared-or-override'
  const override = data.overrides[format.key] ?? {}

  /** Grava um pedaço de conteúdo no lugar certo (página, override ou compartilhado). */
  function write(patch: Partial<SocialContent>, opts: { pinned?: boolean } = {}) {
    if (scope === 'page') {
      const next = [...pages]
      const current = next[pageIndex] ?? emptyContent()
      next[pageIndex] = {
        ...current,
        ...patch,
        values: { ...current.values, ...patch.values },
        colors: { ...current.colors, ...patch.colors },
        images: { ...current.images, ...patch.images },
      }
      onChange({ pages: { ...data.pages, [format.key]: next } })
      return
    }
    if (opts.pinned) {
      const ov = data.overrides[format.key] ?? {}
      onChange({
        overrides: {
          ...data.overrides,
          [format.key]: {
            ...ov,
            ...patch,
            values: { ...ov.values, ...patch.values },
            images: { ...ov.images, ...patch.images },
          },
        },
      })
      return
    }
    onChange({
      content: {
        ...data.content,
        ...patch,
        values: { ...data.content.values, ...patch.values },
        colors: { ...data.content.colors, ...patch.colors },
        images: { ...data.content.images, ...patch.images },
      },
    })
  }

  /** Pin de override por formato (só formatos de página única). */
  function togglePin(kind: 'value' | 'image' | 'variant', slotKey?: string) {
    const ov = data.overrides[format.key] ?? {}
    const next = { ...ov, values: { ...ov.values }, images: { ...ov.images } }
    if (kind === 'value' && slotKey) {
      if (next.values && slotKey in next.values) delete next.values[slotKey]
      else next.values = { ...next.values, [slotKey]: eff.values[slotKey] ?? '' }
    } else if (kind === 'image' && slotKey) {
      if (next.images && slotKey in next.images) delete next.images[slotKey]
      else next.images = { ...next.images, [slotKey]: eff.images[slotKey] ?? '' }
    } else if (kind === 'variant') {
      if (next.variant !== undefined) delete next.variant
      else next.variant = eff.variant
    }
    onChange({ overrides: { ...data.overrides, [format.key]: next } })
  }

  const formatTabs = (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Formato em edição">
      {selectedFormats.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => setFormatKey(f.key)}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            format.key === f.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
          }`}
        >
          {f.key}
        </button>
      ))}
    </div>
  )

  const preview = (
    <Card bordered className="flex flex-col gap-3 p-4" data-testid="content-preview">
      {formatTabs}
      {isMulti ? (
        <PageManager
          count={pages.length}
          active={pageIndex}
          min={format.minPages ?? 2}
          max={format.maxPages ?? 10}
          onSelect={(i) => setPageByFormat((m) => ({ ...m, [format.key]: i }))}
          onAdd={() => {
            onChange(addPage(data, format.key))
            setPageByFormat((m) => ({ ...m, [format.key]: pages.length }))
          }}
          onDuplicate={() => onChange(duplicatePage(data, format.key, pageIndex))}
          onRemove={() => {
            onChange(removePage(data, format.key, pageIndex))
            setPageByFormat((m) => ({ ...m, [format.key]: Math.max(0, pageIndex - 1) }))
          }}
          onMove={(from, to) => onChange(movePage(data, format.key, from, to))}
        />
      ) : null}
      <div className="overflow-hidden rounded-xl border border-hairline bg-white">
        <TemplateRenderer
          key={`${template.id}-${format.key}`}
          manifest={manifest}
          layoutHtml={validation.layouts[format.key]}
          styles={validation.styles}
          resourceUrls={resourceUrls}
          width={format.width}
          height={format.height}
          content={debouncedContent}
        />
      </div>
      <p className="text-meta text-ink-muted uppercase">
        {format.key} · {format.width}×{format.height}
        {isMulti ? ` · página ${pageIndex + 1}/${pages.length}` : ''}
      </p>
    </Card>
  )

  const canPin = !isMulti && selectedFormats.length > 1

  const form = (
    <Card bordered className="flex flex-col gap-2 p-4" data-testid="content-form">
      {isMulti ? (
        <p className="text-meta text-ink-muted uppercase">
          Editando a página {pageIndex + 1} deste carousel
        </p>
      ) : null}
      {manifest.slots.map((slot) => {
        if (slot.type === 'page-group') return null
        if (slot.type === 'color') return null
        if (slot.type === 'variant') {
          const pinned = canPin ? override.variant !== undefined : undefined
          return (
            <FieldShell
              key={slot.key}
              label={slot.label}
              pinned={pinned}
              onPinToggle={canPin ? () => togglePin('variant') : undefined}
            >
              <VariantField
                slot={slot}
                value={eff.variant}
                onChange={(v) => write({ variant: v }, { pinned })}
              />
            </FieldShell>
          )
        }
        if (slot.type === 'image') {
          const pinned = canPin ? slot.key in (override.images ?? {}) : undefined
          return (
            <FieldShell
              key={slot.key}
              label={slot.label}
              required={slot.required}
              pinned={pinned}
              onPinToggle={canPin ? () => togglePin('image', slot.key) : undefined}
            >
              <ImageField
                slot={slot}
                value={eff.images[slot.key]}
                onChange={(url) => write({ images: { [slot.key]: url ?? '' } }, { pinned })}
              />
            </FieldShell>
          )
        }
        const pinned = canPin ? slot.key in (override.values ?? {}) : undefined
        const pinToggle = canPin ? () => togglePin('value', slot.key) : undefined
        if (slot.type === 'list') {
          const raw = eff.values[slot.key]
          return (
            <FieldShell
              key={slot.key}
              label={slot.label}
              required={slot.required}
              counter={slot.maxItems ? `${Array.isArray(raw) ? raw.length : 0}/${slot.maxItems}` : undefined}
              pinned={pinned}
              onPinToggle={pinToggle}
            >
              <ListField
                slot={slot}
                value={Array.isArray(raw) ? raw : []}
                onChange={(v) => write({ values: { [slot.key]: v } }, { pinned })}
              />
            </FieldShell>
          )
        }
        const text = typeof eff.values[slot.key] === 'string' ? (eff.values[slot.key] as string) : ''
        return (
          <FieldShell
            key={slot.key}
            label={slot.label}
            required={slot.required}
            counter={slot.maxChars ? `${text.length}/${slot.maxChars}` : undefined}
            pinned={pinned}
            onPinToggle={pinToggle}
          >
            {slot.type === 'richtext' ? (
              <RichtextField
                slot={slot}
                value={text}
                onChange={(v) => write({ values: { [slot.key]: v } }, { pinned })}
              />
            ) : (
              <TextField
                slot={slot}
                value={text}
                onChange={(v) => write({ values: { [slot.key]: v } }, { pinned })}
              />
            )}
          </FieldShell>
        )
      })}
      {(manifest.colors?.editable ?? []).length > 0 ? (
        <FieldShell label="Cores do template">
          <div className="flex flex-wrap gap-3">
            {(manifest.colors?.editable ?? []).map((color) => (
              <ColorField
                key={color.key}
                color={color}
                value={eff.colors[color.key]}
                onChange={(v) => write({ colors: { [color.key]: v } })}
              />
            ))}
          </div>
        </FieldShell>
      ) : null}
      <div className="mt-2 flex gap-2">
        <PillButton variant="ghost" onClick={onBack}>
          ← Formatos
        </PillButton>
        <PillButton onClick={onNext}>Exportar →</PillButton>
      </div>
    </Card>
  )

  // RF-S3: mobile empilhado com preview acima; desktop lado a lado
  return device === 'celular' ? (
    <div className="flex flex-col gap-4" data-testid="content-step">
      {preview}
      {form}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]" data-testid="content-step">
      {form}
      {preview}
    </div>
  )
}

function PageManager({
  count,
  active,
  min,
  max,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onMove,
}: {
  count: number
  active: number
  min: number
  max: number
  onSelect: (i: number) => void
  onAdd: () => void
  onDuplicate: () => void
  onRemove: () => void
  onMove: (from: number, to: number) => void
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  function onDrop(e: DragEvent, to: number) {
    e.preventDefault()
    if (dragFrom !== null && dragFrom !== to) onMove(dragFrom, to)
    setDragFrom(null)
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="page-manager">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          draggable
          onDragStart={() => setDragFrom(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, i)}
          onClick={() => onSelect(i)}
          aria-label={`Página ${i + 1}`}
          aria-current={active === i ? 'page' : undefined}
          className={`h-8 w-8 cursor-grab rounded-lg text-xs font-semibold transition-colors ${
            active === i ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
          }`}
        >
          {i + 1}
        </button>
      ))}
      <div className="ml-1 flex items-center gap-1">
        <button
          type="button"
          onClick={onAdd}
          disabled={count >= max}
          className="cursor-pointer rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + página
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={count >= max}
          className="cursor-pointer rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          duplicar
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={count <= min}
          className="cursor-pointer rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          excluir
        </button>
      </div>
    </div>
  )
}
