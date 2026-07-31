/**
 * Composição do srcdoc do iframe: layout HTML + CSS inline + recursos
 * (fontes/assets) reescritos para URLs utilizáveis (object URLs).
 */

export type ComposeInput = {
  /** HTML sanitizado do layout */
  layoutHtml: string
  /** CSS por caminho no pacote (ex.: "styles/base.css") */
  styles: Record<string, string>
  /** Caminho no pacote → URL utilizável (object URL/data URL) */
  resourceUrls: Record<string, string>
}

/** Resolve um caminho relativo (com ./ e ../) a partir do diretório de um arquivo do pacote */
export function resolvePackagePath(baseDir: string, relative: string): string {
  const parts = baseDir ? baseDir.split('/').filter(Boolean) : []
  for (const segment of relative.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') parts.pop()
    else parts.push(segment)
  }
  return parts.join('/')
}

const CSS_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g

/** Reescreve url(...) relativos do CSS para as URLs dos recursos do pacote */
export function rewriteCssUrls(
  css: string,
  cssPath: string,
  resourceUrls: Record<string, string>,
): string {
  const baseDir = cssPath.includes('/') ? cssPath.slice(0, cssPath.lastIndexOf('/')) : ''
  return css.replace(CSS_URL, (match, _q, ref: string) => {
    if (/^(data:|blob:|https?:)/i.test(ref)) return match
    const resolved = resolvePackagePath(baseDir, ref)
    const url = resourceUrls[resolved]
    return url ? `url("${url}")` : match
  })
}

/** Monta o documento final do iframe: remove <link> e inlina os CSS reescritos no <head> */
export function composeSrcdoc({ layoutHtml, styles, resourceUrls }: ComposeInput): string {
  const doc = new DOMParser().parseFromString(layoutHtml, 'text/html')

  for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
    link.remove()
  }

  for (const [path, css] of Object.entries(styles)) {
    const styleEl = doc.createElement('style')
    styleEl.setAttribute('data-package-css', path)
    styleEl.textContent = rewriteCssUrls(css, path, resourceUrls)
    doc.head.appendChild(styleEl)
  }

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`
}
