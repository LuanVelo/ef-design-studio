import { useEffect, useMemo, useRef, useState } from 'react'
import type { TemplateManifest } from '@core/schemas'
import { composeSrcdoc } from './compose'
import { applyContent, type RenderContent } from './inject'

export type TemplateRendererProps = {
  manifest: TemplateManifest
  /** HTML sanitizado do layout do formato */
  layoutHtml: string
  /** CSS por caminho no pacote */
  styles: Record<string, string>
  /** caminho no pacote → object URL */
  resourceUrls: Record<string, string>
  width: number
  height: number
  content: RenderContent
  /** Escala externa (ex.: 0.3 para thumbnail). Default: ajusta à largura do container. */
  scale?: number
  /** Permite interação com o conteúdo do iframe (edição inline no editor de slides) */
  interactive?: boolean
  /** Recebe o elemento raiz do layout dentro do iframe (para captura/edição) */
  onRootReady?: (root: HTMLElement, iframeDoc: Document) => void
}

/**
 * Motor único de render (preview, thumbnail e export usam este componente).
 * Template roda em iframe sandbox SEM scripts; conteúdo injetado via data-slot.
 */
export function TemplateRenderer({
  manifest,
  layoutHtml,
  styles,
  resourceUrls,
  width,
  height,
  content,
  scale,
  interactive,
  onRootReady,
}: TemplateRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [fitScale, setFitScale] = useState(scale ?? 0)

  const srcdoc = useMemo(
    () => composeSrcdoc({ layoutHtml, styles, resourceUrls }),
    [layoutHtml, styles, resourceUrls],
  )

  // Escala automática para caber no container quando scale não é fixado
  useEffect(() => {
    if (scale != null) {
      setFitScale(scale)
      return
    }
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setFitScale(el.clientWidth / width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [scale, width])

  // Injeção de conteúdo a cada mudança (após load do iframe)
  useEffect(() => {
    if (!loaded) return
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    applyContent(doc, manifest, content)
    const root = doc.body.firstElementChild as HTMLElement | null
    if (root && onRootReady) onRootReady(root, doc)
  }, [loaded, manifest, content, srcdoc, onRootReady])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ width: scale != null ? width * scale : '100%', height: height * fitScale }}
    >
      <iframe
        ref={iframeRef}
        title={`Preview ${manifest.name}`}
        sandbox="allow-same-origin"
        srcDoc={srcdoc}
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        style={{
          width,
          height,
          border: 0,
          transform: `scale(${fitScale})`,
          transformOrigin: 'top left',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      />
    </div>
  )
}
