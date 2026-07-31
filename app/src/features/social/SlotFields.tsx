import { useRef } from 'react'
import type { EditableColor, SlotDef, SlotValue } from '@core/schemas'
import { openFile } from '@data/fs-adapter'
import { compressImageFile } from './image-utils'

/**
 * Campos de formulário por tipo de slot (F3.2). Todos controlados: recebem o
 * valor efetivo e emitem a mudança — quem decide onde gravar (compartilhado,
 * override ou página) é o chamador.
 */

const fieldClass =
  'rounded-xl border border-ink/15 bg-card px-3 py-2 text-sm outline-none focus:border-ink/40'

export function FieldShell({
  label,
  required,
  counter,
  pinned,
  onPinToggle,
  children,
}: {
  label: string
  required?: boolean
  counter?: string
  /** Estado do override por formato: undefined = sem pin disponível */
  pinned?: boolean
  onPinToggle?: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl p-2 text-sm ${pinned ? 'bg-retro-gelo/40' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </span>
        <span className="flex items-center gap-2">
          {counter ? <span className="text-meta text-ink-muted">{counter}</span> : null}
          {onPinToggle ? (
            <button
              type="button"
              onClick={onPinToggle}
              title={pinned ? 'Voltar ao conteúdo compartilhado' : 'Ajustar só para este formato'}
              aria-pressed={pinned}
              className={`text-meta cursor-pointer rounded-full px-2 py-0.5 transition-colors ${
                pinned ? 'bg-ink text-white' : 'bg-ink/5 text-ink-muted hover:bg-ink/10'
              }`}
            >
              {pinned ? 'só este formato' : 'por formato'}
            </button>
          ) : null}
        </span>
      </div>
      {children}
    </div>
  )
}

export function TextField({
  slot,
  value,
  onChange,
}: {
  slot: Extract<SlotDef, { type: 'text' }>
  value: string
  onChange: (v: string) => void
}) {
  const props = {
    value,
    maxLength: slot.maxChars,
    className: fieldClass,
    'aria-label': slot.label,
  }
  return slot.multiline ? (
    <textarea {...props} rows={3} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input {...props} onChange={(e) => onChange(e.target.value)} />
  )
}

export function RichtextField({
  slot,
  value,
  onChange,
}: {
  slot: Extract<SlotDef, { type: 'richtext' }>
  value: string
  onChange: (v: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  function wrapSelection(tag: 'b' | 'i') {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const next = `${value.slice(0, a)}<${tag}>${value.slice(a, b)}</${tag}>${value.slice(b)}`
    onChange(next)
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => wrapSelection('b')}
          className="cursor-pointer rounded-md bg-ink/5 px-2 py-0.5 text-xs font-bold hover:bg-ink/10"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('i')}
          className="cursor-pointer rounded-md bg-ink/5 px-2 py-0.5 text-xs italic hover:bg-ink/10"
        >
          I
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        rows={4}
        maxLength={slot.maxChars}
        aria-label={slot.label}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
      <span className="text-meta text-ink-muted">Negrito/itálico: selecione e use B / I.</span>
    </div>
  )
}

export function ListField({
  slot,
  value,
  onChange,
}: {
  slot: Extract<SlotDef, { type: 'list' }>
  value: string[]
  onChange: (v: string[]) => void
}) {
  const max = slot.maxItems ?? 10
  return (
    <div className="flex flex-col gap-1.5">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={item}
            maxLength={slot.itemMaxChars}
            aria-label={`${slot.label} — item ${i + 1}`}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
            className={`${fieldClass} flex-1`}
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label={`Remover item ${i + 1}`}
            className="cursor-pointer rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
          >
            ×
          </button>
        </div>
      ))}
      {value.length < max ? (
        <button
          type="button"
          onClick={() => onChange([...value, ''])}
          className="w-fit cursor-pointer rounded-full bg-ink/5 px-3 py-1 text-xs font-medium hover:bg-ink/10"
        >
          + item
        </button>
      ) : null}
    </div>
  )
}

export function ImageField({
  slot,
  value,
  onChange,
}: {
  slot: Extract<SlotDef, { type: 'image' }>
  value: string | undefined
  onChange: (dataUrl: string | undefined) => void
}) {
  async function pick() {
    const file = await openFile({
      accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
      description: 'Imagem',
    })
    if (file) onChange(await compressImageFile(file))
  }
  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-hairline bg-surface">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => void pick()}
          className="cursor-pointer rounded-full bg-ink/5 px-3 py-1.5 text-xs font-medium hover:bg-ink/10"
        >
          {value ? 'Trocar imagem' : 'Escolher imagem'}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="cursor-pointer text-xs text-ink-muted underline"
          >
            Remover
          </button>
        ) : null}
        {slot.aspectHint ? (
          <span className="text-meta text-ink-muted">proporção sugerida {slot.aspectHint}</span>
        ) : null}
      </div>
    </div>
  )
}

export function VariantField({
  slot,
  value,
  onChange,
}: {
  slot: Extract<SlotDef, { type: 'variant' }>
  value: string | undefined
  onChange: (v: string) => void
}) {
  const active = value ?? slot.default ?? slot.options[0]
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={slot.label}>
      {slot.options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            active === opt ? 'bg-accent-social text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function ColorField({
  color,
  value,
  onChange,
}: {
  color: EditableColor
  value: string | undefined
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="color"
        value={value ?? color.default}
        onChange={(e) => onChange(e.target.value)}
        aria-label={color.label}
        className="h-8 w-12 cursor-pointer rounded border border-hairline"
      />
      <span>{color.label}</span>
    </label>
  )
}

export type { SlotValue }
