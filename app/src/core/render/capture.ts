import { toBlob } from 'html-to-image'

export type CaptureResult = {
  blob: Blob
  durationMs: number
}

/**
 * Captura um elemento (o raiz do layout dentro do iframe) como PNG.
 * pixelRatio 1 = preview/thumbnail; 2 = export (RNF-1: peça @2x < 5s).
 */
export async function captureElement(
  el: HTMLElement,
  opts: { pixelRatio?: 1 | 2; width: number; height: number },
): Promise<CaptureResult> {
  const start = performance.now()
  const pixelRatio = opts.pixelRatio ?? 1
  // pixelRatio já multiplica o canvas internamente — não passar canvasWidth junto
  const blob = await toBlob(el, {
    pixelRatio,
    width: opts.width,
    height: opts.height,
    skipFonts: false,
    cacheBust: false,
  })
  if (!blob) throw new Error('Falha na captura da imagem.')
  return { blob, durationMs: performance.now() - start }
}
