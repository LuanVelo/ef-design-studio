import {
  ContentDocumentSchema,
  type ContentDocument,
  type SlotValue,
  type TemplateManifest,
} from '@core/schemas'
import type { TemplateRecord } from '@data/types'
import { emptySlide, type SlideContent, type UnmappedItem } from './slides-project'

/**
 * Importação de conteúdo (Contrato 2): content.json ou Markdown estruturado.
 * Markdown: H1/H2 = novo slide (título), corpo = texto, "- item" = bullets.
 */

export function parseContentJson(raw: string): ContentDocument {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }
  const parsed = ContentDocumentSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue.path.length ? ` (campo: ${issue.path.join('.')})` : ''
    throw new Error(`content.json inválido: ${issue.message}${path}`)
  }
  return parsed.data
}

/** Converte Markdown estruturado para ContentDocument (H1/H2 = slide novo). */
export function parseMarkdownContent(md: string): ContentDocument {
  const lines = md.split(/\r?\n/)
  let title = 'Documento importado'
  let sawTitle = false
  type Draft = { titulo?: string; texto: string[]; bullets: string[] }
  const drafts: Draft[] = []
  let current: Draft | null = null

  function push() {
    if (current) drafts.push(current)
    current = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    const h = /^(#{1,2})\s+(.*)$/.exec(line)
    if (h) {
      push()
      current = { titulo: h[2].trim(), texto: [], bullets: [] }
      if (!sawTitle) {
        title = h[2].trim()
        sawTitle = true
      }
      continue
    }
    if (!current) current = { texto: [], bullets: [] }
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) current.bullets.push(bullet[1].trim())
    else current.texto.push(line)
  }
  push()

  if (drafts.length === 0) {
    throw new Error('O Markdown não tem conteúdo — use # ou ## para abrir slides.')
  }

  return ContentDocumentSchema.parse({
    schemaVersion: 1,
    title,
    pages: drafts.map((d) => {
      const slots: Record<string, SlotValue> = {}
      if (d.titulo) slots.titulo = d.titulo
      if (d.texto.length) slots.texto = d.texto.join('\n')
      if (d.bullets.length) slots.bullets = d.bullets
      return { slots }
    }),
  })
}

export type ContentMatchResult = {
  slides: SlideContent[]
  unmapped: UnmappedItem[]
  /** Por slide: keys de slots obrigatórios que ficaram vazios */
  missingRequired: string[][]
}

/**
 * Matching (RF-SL): keys casadas preenchem os slots; sobras vão para o painel
 * "Conteúdo não mapeado"; obrigatórios vazios são sinalizados.
 */
export function matchContentToTemplate(
  document: ContentDocument,
  manifest: TemplateManifest,
): ContentMatchResult {
  const variantSlot = manifest.slots.find((s) => s.type === 'variant')
  const contentSlots = new Map(
    manifest.slots
      .filter((s) => s.type !== 'variant' && s.type !== 'color' && s.type !== 'page-group')
      .map((s) => [s.key, s]),
  )

  const slides: SlideContent[] = []
  const unmapped: UnmappedItem[] = []

  document.pages.forEach((page, slideIndex) => {
    const slide = emptySlide()
    if (variantSlot?.type === 'variant') {
      slide.variant =
        page.suggestedVariant && variantSlot.options.includes(page.suggestedVariant)
          ? page.suggestedVariant
          : (variantSlot.default ?? variantSlot.options[0])
    }
    for (const [key, value] of Object.entries(page.slots)) {
      if (value == null) continue
      const slot = contentSlots.get(key)
      if (!slot) {
        unmapped.push({ slideIndex, key, value })
        continue
      }
      if (slot.type === 'image') {
        // conteúdo de IA não traz imagem embutida; texto vira item não mapeado
        unmapped.push({ slideIndex, key, value })
        continue
      }
      slide.values[key] = slot.type === 'list' && !Array.isArray(value) ? [value] : value
    }
    slides.push(slide)
  })

  const missingRequired = slides.map((slide) => missingRequiredKeys(slide, manifest))

  return { slides, unmapped, missingRequired }
}

/** Slots obrigatórios ainda vazios num slide (sinalização RF-SL). */
export function missingRequiredKeys(slide: SlideContent, manifest: TemplateManifest): string[] {
  const missing: string[] = []
  for (const slot of manifest.slots) {
    if (slot.type === 'variant' || slot.type === 'color' || slot.type === 'page-group') continue
    if (!('required' in slot) || !slot.required) continue
    if (slot.type === 'image') {
      if (!slide.images[slot.key]) missing.push(slot.key)
      continue
    }
    const v = slide.values[slot.key]
    if (
      v == null ||
      (typeof v === 'string' && v.trim() === '') ||
      (Array.isArray(v) && v.length === 0)
    ) {
      missing.push(slot.key)
    }
  }
  return missing
}

/**
 * Prompt "Copiar para IA" (RF-SL): embute o Contrato 2 + slots/variants do
 * template escolhido para a IA devolver um content.json que casa 100%.
 */
export function buildContentPrompt(template: TemplateRecord): string {
  const manifest = template.manifest
  if (!manifest) return ''
  const variantSlot = manifest.slots.find((s) => s.type === 'variant')
  const slotLines = manifest.slots
    .filter((s) => s.type !== 'variant' && s.type !== 'color' && s.type !== 'page-group')
    .map((s) => {
      const limits =
        'maxChars' in s && s.maxChars
          ? ` (máx ${s.maxChars} chars)`
          : s.type === 'list'
            ? ` (lista${'maxItems' in s && s.maxItems ? `, máx ${s.maxItems} itens` : ''})`
            : ''
      const req = 'required' in s && s.required ? ' — obrigatório' : ''
      return `- \`${s.key}\` (${s.type})${limits}${req}: ${s.label}`
    })
    .join('\n')

  return `Gere o conteúdo de uma apresentação como um arquivo \`content.json\` para o template "${manifest.name}".

## Formato do arquivo (Contrato 2 — schemaVersion 1)

\`\`\`json
{
  "schemaVersion": 1,
  "title": "Título do documento",
  "language": "pt-BR",
  "pages": [
    { "suggestedVariant": "<variant>", "slots": { "<slot-key>": "valor ou [\\"lista\\"]" } }
  ]
}
\`\`\`

## Slots disponíveis neste template (use exatamente estas keys)

${slotLines}

${variantSlot?.type === 'variant' ? `## Variants disponíveis (uma por página em suggestedVariant)\n\n${variantSlot.options.map((o) => `- \`${o}\``).join('\n')}` : ''}

## Regras

1. Use somente as keys listadas — qualquer outra vai para "conteúdo não mapeado".
2. Slots de imagem não recebem valor (as imagens são escolhidas no app).
3. Respeite os limites de caracteres/itens indicados.
4. Richtext aceita apenas <b>, <i> e <br>.
5. Responda com o JSON puro, pronto para salvar como .json e importar no app.`
}
