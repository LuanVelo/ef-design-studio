import JSZip from 'jszip'
import { applyContent, captureElement, composeSrcdoc, type RenderContent } from '@core/render'
import type { FormatDef, TemplateManifest } from '@core/schemas'
import type { EftplValidationResult } from '@core/validate/eftpl'
import {
  effectiveContent,
  pagesOf,
  type SocialProjectData,
} from '@features/social/social-project'

/** Decisão §12.4 fechada: qualidade JPG fixa em 90 (sem controle exposto na v1). */
export const JPG_QUALITY = 0.9

export type ExportOptions = {
  fileType: 'png' | 'jpg'
  pixelRatio: 1 | 2
}

export type ExportPlanEntry = {
  formatKey: string
  /** índice da página (só formatos multi) */
  pageIndex?: number
  fileName: string
}

export function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'peca'
  )
}

/**
 * Plano de export: um arquivo por formato (single) ou por página (multi),
 * nomes `<projeto>-<formato>[-<página>].<ext>` (RF-S1 etapa 4).
 */
export function buildExportPlan(
  projectName: string,
  data: SocialProjectData,
  manifest: TemplateManifest,
  ext: 'png' | 'jpg',
): ExportPlanEntry[] {
  const slug = slugifyName(projectName)
  const plan: ExportPlanEntry[] = []
  for (const formatKey of data.formatKeys) {
    const format = manifest.formats.find((f) => f.key === formatKey)
    if (!format) continue
    if (format.pages === 'multi') {
      const pages = pagesOf(data, formatKey)
      pages.forEach((_, i) => {
        plan.push({ formatKey, pageIndex: i, fileName: `${slug}-${formatKey}-${i + 1}.${ext}` })
      })
    } else {
      plan.push({ formatKey, fileName: `${slug}-${formatKey}.${ext}` })
    }
  }
  return plan
}

/** Converte o PNG capturado para JPG (fundo branco, qualidade fixa §12.4). */
export async function toJpeg(blob: Blob, width: number, height: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', JPG_QUALITY))
    if (!jpg) throw new Error('Falha ao converter para JPG.')
    return jpg
  } finally {
    bitmap.close()
  }
}

/** Renderiza um formato num iframe fora da tela e captura (motor único F1.3). */
async function renderAndCapture(args: {
  manifest: TemplateManifest
  validation: EftplValidationResult
  resourceUrls: Record<string, string>
  format: FormatDef
  content: RenderContent
  pixelRatio: 1 | 2
}): Promise<{ blob: Blob; durationMs: number }> {
  const { manifest, validation, resourceUrls, format, content, pixelRatio } = args
  const iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-same-origin')
  iframe.width = String(format.width)
  iframe.height = String(format.height)
  iframe.style.cssText = `position:fixed;left:-100000px;top:0;border:0;width:${format.width}px;height:${format.height}px;`
  iframe.srcdoc = composeSrcdoc({
    layoutHtml: validation.layouts[format.key],
    styles: validation.styles,
    resourceUrls,
  })
  document.body.appendChild(iframe)
  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve()
    })
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Iframe de export não carregou.')
    applyContent(doc, manifest, content)
    const fonts = (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts
    if (fonts) await fonts.ready
    // um frame para o layout assentar após a injeção
    await new Promise((r) => setTimeout(r, 30))
    const root = doc.body.firstElementChild as HTMLElement | null
    if (!root) throw new Error(`Layout do formato "${format.key}" sem elemento raiz.`)
    return await captureElement(root, {
      pixelRatio,
      width: format.width,
      height: format.height,
    })
  } finally {
    iframe.remove()
  }
}

export type ExportedFile = ExportPlanEntry & {
  blob: Blob
  durationMs: number
}

export type SocialExportResult = {
  files: ExportedFile[]
  totalMs: number
  /** zip quando há mais de um arquivo */
  zipBlob?: Blob
  zipName?: string
}

/** Exporta todos os formatos/páginas selecionados do projeto (etapa 4). */
export async function exportSocialProject(args: {
  projectName: string
  data: SocialProjectData
  manifest: TemplateManifest
  validation: EftplValidationResult
  resourceUrls: Record<string, string>
  options: ExportOptions
  onProgress?: (done: number, total: number) => void
}): Promise<SocialExportResult> {
  const { projectName, data, manifest, validation, resourceUrls, options, onProgress } = args
  // A captura (html-to-image) não rasteriza com a página oculta (observação
  // F1.3) — melhor falhar com mensagem clara do que travar silenciosamente.
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    throw new Error(
      'O export precisa da aba visível — volte para esta aba e tente de novo.',
    )
  }
  const plan = buildExportPlan(projectName, data, manifest, options.fileType)
  const files: ExportedFile[] = []
  const start = performance.now()
  for (const [i, entry] of plan.entries()) {
    const format = manifest.formats.find((f) => f.key === entry.formatKey)!
    const eff = effectiveContent(data, entry.formatKey, entry.pageIndex)
    const content: RenderContent = {
      values: eff.values,
      variant: eff.variant,
      colors: eff.colors,
      images: eff.images,
      pageNumber: (entry.pageIndex ?? 0) + 1,
    }
    const captured = await renderAndCapture({
      manifest,
      validation,
      resourceUrls,
      format,
      content,
      pixelRatio: options.pixelRatio,
    })
    const blob =
      options.fileType === 'jpg'
        ? await toJpeg(
            captured.blob,
            format.width * options.pixelRatio,
            format.height * options.pixelRatio,
          )
        : captured.blob
    files.push({ ...entry, blob, durationMs: captured.durationMs })
    onProgress?.(i + 1, plan.length)
  }

  const result: SocialExportResult = { files, totalMs: performance.now() - start }
  if (files.length > 1) {
    const zip = new JSZip()
    for (const file of files) zip.file(file.fileName, file.blob)
    result.zipBlob = await zip.generateAsync({ type: 'blob' })
    result.zipName = `${slugifyName(projectName)}.zip`
  }
  return result
}
