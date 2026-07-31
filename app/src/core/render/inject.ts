import DOMPurify from 'dompurify'
import type { SlotValue, TemplateManifest, InnerSlotDef, SlotDef } from '@core/schemas'

/** Conteúdo de UMA página/peça a ser injetado num layout */
export type RenderContent = {
  variant?: string
  /** slot key → valor (texto ou itens de lista) */
  values?: Record<string, SlotValue>
  /** cor editável key → valor (#hex) */
  colors?: Record<string, string>
  /** slot de imagem key → URL utilizável (object/data URL) */
  images?: Record<string, string>
  /** número da página (slot especial page-number em templates PDF) */
  pageNumber?: number
}

export type InjectReport = {
  /** slots cujo texto estourou maxChars e foi truncado */
  truncated: string[]
}

const RICHTEXT_TAGS = ['b', 'i', 'strong', 'em', 'br']

function flatSlots(manifest: TemplateManifest): (SlotDef | InnerSlotDef)[] {
  return manifest.slots.flatMap((s) => (s.type === 'page-group' ? [s, ...s.slots] : [s]))
}

function setEmptyState(el: Element, empty: boolean) {
  el.classList.toggle('slot-empty', empty)
}

/**
 * Injeta conteúdo num documento de layout já composto (iframe ou DOM avulso).
 * Idempotente: pode ser reaplicada a cada mudança de conteúdo.
 */
export function applyContent(
  doc: Document,
  manifest: TemplateManifest,
  content: RenderContent,
): InjectReport {
  const report: InjectReport = { truncated: [] }
  const root = doc.body.firstElementChild
  if (!root) return report

  // 1. Variant: remove variant-* e aplica a escolhida (ou o default do manifest)
  const variantSlot = manifest.slots.find((s) => s.type === 'variant')
  const variant =
    content.variant ??
    (variantSlot?.type === 'variant' ? (variantSlot.default ?? variantSlot.options[0]) : undefined)
  if (variant) {
    for (const cls of [...root.classList]) {
      if (cls.startsWith('variant-')) root.classList.remove(cls)
    }
    root.classList.add(`variant-${variant}`)
  }

  // 2. Cores editáveis como custom properties no raiz
  const rootStyle = (root as HTMLElement).style
  for (const color of manifest.colors?.editable ?? []) {
    const value = content.colors?.[color.key] ?? color.default
    rootStyle.setProperty(`--${color.key}`, value)
  }

  // 3. Slots de conteúdo
  for (const slot of flatSlots(manifest)) {
    if (slot.type === 'variant' || slot.type === 'color' || slot.type === 'page-group') continue
    const el = doc.querySelector(`[data-slot="${slot.key}"]`)
    if (!el) continue

    if (slot.type === 'image') {
      const url = content.images?.[slot.key]
      el.replaceChildren()
      if (url) {
        const img = doc.createElement('img')
        img.src = url
        img.alt = ''
        img.style.width = '100%'
        img.style.height = '100%'
        img.style.objectFit = slot.fit
        img.style.display = 'block'
        el.appendChild(img)
      }
      setEmptyState(el, !url)
      continue
    }

    if (slot.type === 'list') {
      const raw = content.values?.[slot.key]
      let items = Array.isArray(raw) ? raw : []
      if (slot.maxItems != null && items.length > slot.maxItems) items = items.slice(0, slot.maxItems)
      el.replaceChildren()
      for (const item of items) {
        let text = item
        if (slot.itemMaxChars != null && text.length > slot.itemMaxChars) {
          text = text.slice(0, slot.itemMaxChars)
          if (!report.truncated.includes(slot.key)) report.truncated.push(slot.key)
        }
        const span = doc.createElement('span')
        span.textContent = text
        el.appendChild(span)
      }
      setEmptyState(el, items.length === 0)
      continue
    }

    // text | richtext
    const raw = content.values?.[slot.key]
    let text = typeof raw === 'string' ? raw : ''
    if (slot.maxChars != null && text.length > slot.maxChars) {
      text = text.slice(0, slot.maxChars)
      report.truncated.push(slot.key)
    }
    if (slot.type === 'richtext') {
      el.innerHTML = DOMPurify.sanitize(text, { ALLOWED_TAGS: RICHTEXT_TAGS, ALLOWED_ATTR: [] })
    } else {
      el.textContent = text
    }
    setEmptyState(el, text.length === 0)
  }

  // 4. Slot especial page-number
  const pageNumberEl = doc.querySelector('[data-slot="page-number"]')
  if (pageNumberEl) {
    pageNumberEl.textContent = content.pageNumber != null ? String(content.pageNumber) : ''
  }

  return report
}
