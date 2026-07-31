import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TemplateManifestSchema } from '@core/schemas'
import { composeSrcdoc, resolvePackagePath, rewriteCssUrls } from './compose'
import { applyContent } from './inject'

const root = resolve(process.cwd(), '../templates/slide-deck-16x9')
const manifest = TemplateManifestSchema.parse(
  JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf-8')),
)
const layoutHtml = readFileSync(resolve(root, 'layouts/slide-16x9.html'), 'utf-8')
const baseCss = readFileSync(resolve(root, 'styles/base.css'), 'utf-8')

const resourceUrls = {
  'fonts/roboto-var.woff2': 'blob:fake-roboto',
  'fonts/figtree-var.woff2': 'blob:fake-figtree',
}

function composedDoc(): Document {
  const srcdoc = composeSrcdoc({
    layoutHtml,
    styles: { 'styles/base.css': baseCss },
    resourceUrls,
  })
  return new DOMParser().parseFromString(srcdoc, 'text/html')
}

describe('resolvePackagePath / rewriteCssUrls', () => {
  it('resolve ../ a partir do diretório do CSS', () => {
    expect(resolvePackagePath('styles', '../fonts/x.woff2')).toBe('fonts/x.woff2')
    expect(resolvePackagePath('', 'assets/logo.png')).toBe('assets/logo.png')
    expect(resolvePackagePath('a/b', './c.png')).toBe('a/b/c.png')
  })

  it('reescreve url() relativas e preserva data:/http', () => {
    const css = '@font-face { src: url("../fonts/roboto-var.woff2"); } .x { background: url(data:image/png;base64,AA); }'
    const out = rewriteCssUrls(css, 'styles/base.css', resourceUrls)
    expect(out).toContain('url("blob:fake-roboto")')
    expect(out).toContain('url(data:image/png;base64,AA)')
  })
})

describe('composeSrcdoc', () => {
  it('remove <link>, inlina o CSS e reescreve as fontes', () => {
    const doc = composedDoc()
    expect(doc.querySelector('link[rel="stylesheet"]')).toBeNull()
    const style = doc.querySelector('style[data-package-css="styles/base.css"]')
    expect(style?.textContent).toContain('blob:fake-roboto')
    expect(style?.textContent).toContain('blob:fake-figtree')
    expect(doc.querySelector('.slide')).not.toBeNull()
  })
})

describe('applyContent no layout real', () => {
  it('aplica variant, cores, textos, lista e imagem', () => {
    const doc = composedDoc()
    const report = applyContent(doc, manifest, {
      variant: 'capa-imagem',
      values: {
        'titulo-grande': 'Proposta <b>Comercial</b>',
        titulo: 'Institucional',
        menu: ['Início', 'Escopo', 'Times'],
      },
      colors: { 'cor-texto': '#112233' },
      images: { imagem: 'blob:fake-image' },
    })

    const rootEl = doc.body.firstElementChild as HTMLElement
    expect(rootEl.classList.contains('variant-capa-imagem')).toBe(true)
    expect(rootEl.classList.contains('variant-duas-colunas-img-direita')).toBe(false)
    expect(rootEl.style.getPropertyValue('--cor-texto')).toBe('#112233')
    // cor não informada cai no default do manifest
    expect(rootEl.style.getPropertyValue('--cor-fundo')).toBe('#ffffff')

    const tituloGrande = doc.querySelector('[data-slot="titulo-grande"]')!
    expect(tituloGrande.innerHTML).toContain('<b>Comercial</b>')

    const menu = doc.querySelector('[data-slot="menu"]')!
    expect(menu.children).toHaveLength(3)
    expect(menu.children[0].textContent).toBe('Início')

    const imagem = doc.querySelector('[data-slot="imagem"]')!
    const img = imagem.querySelector('img')!
    expect(img.src).toContain('blob:fake-image')
    expect(img.style.objectFit).toBe('cover')
    expect(imagem.classList.contains('slot-empty')).toBe(false)

    expect(report.truncated).toEqual([])
  })

  it('trunca texto acima de maxChars e sinaliza', () => {
    const doc = composedDoc()
    const longo = 'x'.repeat(100)
    const report = applyContent(doc, manifest, { values: { titulo: longo } })
    const titulo = doc.querySelector('[data-slot="titulo"]')!
    expect(titulo.textContent).toHaveLength(40) // maxChars do manifest
    expect(report.truncated).toContain('titulo')
  })

  it('lista respeita maxItems e itemMaxChars', () => {
    const doc = composedDoc()
    const report = applyContent(doc, manifest, {
      values: { menu: ['Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'x'.repeat(50)] },
    })
    const menu = doc.querySelector('[data-slot="menu"]')!
    expect(menu.children.length).toBe(4) // maxItems do manifest
    expect(report.truncated).toEqual([])

    const doc2 = composedDoc()
    const report2 = applyContent(doc2, manifest, { values: { menu: ['x'.repeat(50)] } })
    expect(doc2.querySelector('[data-slot="menu"]')!.children[0].textContent).toHaveLength(20)
    expect(report2.truncated).toContain('menu')
  })

  it('slots opcionais vazios ganham slot-empty; richtext malicioso é sanitizado', () => {
    const doc = composedDoc()
    applyContent(doc, manifest, {
      values: { destaque: '<img src=x onerror=alert(1)>Oi<script>x()</script>' },
    })
    expect(doc.querySelector('[data-slot="titulo"]')!.classList.contains('slot-empty')).toBe(true)
    const destaque = doc.querySelector('[data-slot="destaque"]')!
    expect(destaque.innerHTML).not.toContain('img')
    expect(destaque.innerHTML).not.toContain('script')
    expect(destaque.textContent).toContain('Oi')
  })

  it('sem variant explícita aplica o default do manifest; page-number é preenchido quando existe', () => {
    const doc = composedDoc()
    // adiciona um slot page-number ao layout (como um template PDF teria)
    const pn = doc.createElement('div')
    pn.setAttribute('data-slot', 'page-number')
    doc.body.firstElementChild!.appendChild(pn)

    applyContent(doc, manifest, { pageNumber: 7 })
    const rootEl = doc.body.firstElementChild as HTMLElement
    expect(rootEl.classList.contains('variant-duas-colunas-img-direita')).toBe(true)
    expect(pn.textContent).toBe('7')
  })
})
