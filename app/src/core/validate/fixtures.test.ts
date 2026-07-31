import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ContentDocumentSchema } from '@core/schemas'
import { composeSrcdoc } from '@core/render/compose'
import { applyContent } from '@core/render/inject'
import { validateEftpl } from './eftpl'

const distDir = resolve(process.cwd(), '../templates/dist')
const contentDir = resolve(process.cwd(), '../content/fixtures')

const FIXTURES = [
  { file: 'ef-slides-editorial-01.eftpl', id: 'ef-slides-editorial-01', category: 'slides' },
  { file: 'ef-social-basico.eftpl', id: 'ef-social-basico', category: 'social' },
  { file: 'ef-pdf-basico.eftpl', id: 'ef-pdf-basico', category: 'pdf' },
] as const

describe('aceite F1.4 — os 3 fixtures passam no validador e renderizam', () => {
  it.each(FIXTURES)('$id valida sem erros', async ({ file, id, category }) => {
    const result = await validateEftpl(readFileSync(resolve(distDir, file)))
    expect(result.errors, JSON.stringify(result.errors, null, 2)).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.manifest?.id).toBe(id)
    expect(result.manifest?.category).toBe(category)
  })

  it.each(FIXTURES)('$id: todos os formatos compõem e recebem conteúdo', async ({ file }) => {
    const result = await validateEftpl(readFileSync(resolve(distDir, file)))
    const manifest = result.manifest!
    for (const format of manifest.formats) {
      const srcdoc = composeSrcdoc({
        layoutHtml: result.layouts[format.key],
        styles: result.styles,
        resourceUrls: {},
      })
      const doc = new DOMParser().parseFromString(srcdoc, 'text/html')
      const report = applyContent(doc, manifest, {
        values: {
          titulo: 'Título de teste',
          topicos: ['Um', 'Dois'],
        },
        pageNumber: 3,
      })
      const root = doc.body.firstElementChild as HTMLElement
      expect(root, `${file}/${format.key} sem raiz`).not.toBeNull()
      // variant default aplicada
      expect([...root.classList].some((c) => c.startsWith('variant-'))).toBe(true)
      expect(report.truncated).toEqual([])
      // slot obrigatório preenchido
      expect(doc.querySelector('[data-slot="titulo"]')?.textContent).toBe('Título de teste')
    }
  })

  it('ef-pdf-basico preenche page-number automaticamente', async () => {
    const result = await validateEftpl(readFileSync(resolve(distDir, 'ef-pdf-basico.eftpl')))
    const srcdoc = composeSrcdoc({
      layoutHtml: result.layouts['pdf-a4-portrait'],
      styles: result.styles,
      resourceUrls: {},
    })
    const doc = new DOMParser().parseFromString(srcdoc, 'text/html')
    applyContent(doc, result.manifest!, { pageNumber: 12 })
    expect(doc.querySelector('[data-slot="page-number"]')?.textContent).toBe('12')
  })

  it('carousel-square do social declara limites 2–10 (decisão §12.5)', async () => {
    const result = await validateEftpl(readFileSync(resolve(distDir, 'ef-social-basico.eftpl')))
    const carousel = result.manifest!.formats.find((f) => f.key === 'carousel-square')
    expect(carousel).toMatchObject({ pages: 'multi', minPages: 2, maxPages: 10 })
  })
})

describe('aceite F1.4 — exemplos de content.json validam', () => {
  it.each(['proposta-slides.content.json', 'relatorio-pdf.content.json'])('%s', (file) => {
    const raw = JSON.parse(readFileSync(resolve(contentDir, file), 'utf-8'))
    const result = ContentDocumentSchema.safeParse(raw)
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
  })
})
