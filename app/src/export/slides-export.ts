import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import type { RenderContent } from '@core/render'
import type { TemplateManifest } from '@core/schemas'
import type { EftplValidationResult } from '@core/validate/eftpl'
import type { SlidesProjectData } from '@features/slides/slides-project'
import { renderAndCapture, slugifyName } from './social-export'

/** Conversão px (96dpi, dimensão dos formatos) → pontos PDF (72dpi). */
export function pxToPt(px: number): number {
  return (px * 72) / 96
}

export type SlidesExportOptions = {
  fileType: 'pdf' | 'png'
  /** PDF sempre renderiza @2x (RNF de fidelidade); PNG pode escolher */
  pixelRatio: 1 | 2
}

export type SlidesExportResult = {
  blob: Blob
  fileName: string
  pageCount: number
  totalMs: number
  /** duração da página mais lenta (captura) */
  slowestMs: number
}

function contentOf(data: SlidesProjectData, index: number): RenderContent {
  const slide = (data.slides ?? [])[index]
  return {
    values: slide.values,
    variant: slide.variant,
    colors: data.colors,
    images: slide.images,
    imageTransforms: slide.imageTransforms,
    pageNumber: index + 1,
  }
}

/**
 * Export de apresentação (F4.3): PDF por composição das páginas capturadas
 * @2x em dimensão nativa, ou PNGs numerados num zip. `page-number` é
 * preenchido automaticamente pelo motor via content.pageNumber.
 */
export async function exportSlidesProject(args: {
  projectName: string
  data: SlidesProjectData
  manifest: TemplateManifest
  validation: EftplValidationResult
  resourceUrls: Record<string, string>
  options: SlidesExportOptions
  onProgress?: (done: number, total: number) => void
}): Promise<SlidesExportResult> {
  const { projectName, data, manifest, validation, resourceUrls, options, onProgress } = args
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    throw new Error('O export precisa da aba visível — volte para esta aba e tente de novo.')
  }
  const format = manifest.formats.find((f) => f.key === data.formatKey)
  if (!format) throw new Error(`Formato "${data.formatKey}" não existe mais no template.`)
  const slides = data.slides ?? []
  if (slides.length === 0) throw new Error('A apresentação não tem slides.')

  const slug = slugifyName(projectName)
  const pixelRatio = options.fileType === 'pdf' ? 2 : options.pixelRatio
  const start = performance.now()
  let slowestMs = 0
  const pages: Blob[] = []
  for (let i = 0; i < slides.length; i++) {
    const captured = await renderAndCapture({
      manifest,
      validation,
      resourceUrls,
      format,
      content: contentOf(data, i),
      pixelRatio,
    })
    slowestMs = Math.max(slowestMs, captured.durationMs)
    pages.push(captured.blob)
    onProgress?.(i + 1, slides.length)
  }

  if (options.fileType === 'pdf') {
    const pdf = await PDFDocument.create()
    pdf.setTitle(projectName)
    for (const pageBlob of pages) {
      const png = await pdf.embedPng(await pageBlob.arrayBuffer())
      const page = pdf.addPage([pxToPt(format.width), pxToPt(format.height)])
      page.drawImage(png, { x: 0, y: 0, width: pxToPt(format.width), height: pxToPt(format.height) })
    }
    const bytes = await pdf.save()
    return {
      blob: new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }),
      fileName: `${slug}.pdf`,
      pageCount: pages.length,
      totalMs: performance.now() - start,
      slowestMs,
    }
  }

  const zip = new JSZip()
  pages.forEach((blob, i) => zip.file(`${slug}-${i + 1}.png`, blob))
  return {
    blob: await zip.generateAsync({ type: 'blob' }),
    fileName: `${slug}.zip`,
    pageCount: pages.length,
    totalMs: performance.now() - start,
    slowestMs,
  }
}
