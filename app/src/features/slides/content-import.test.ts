import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateEftpl } from '@core/validate/eftpl'
import type { TemplateManifest } from '@core/schemas'
import {
  matchContentToTemplate,
  parseContentJson,
  parseMarkdownContent,
} from './content-import'

const contentDir = resolve(process.cwd(), '../content/fixtures')
const distDir = resolve(process.cwd(), '../templates/dist')

let editorial: TemplateManifest

beforeAll(async () => {
  const result = await validateEftpl(readFileSync(resolve(distDir, 'ef-slides-editorial-01.eftpl')))
  editorial = result.manifest!
})

describe('F4.1 — parse de content.json', () => {
  it('fixture proposta-slides.content.json parseia', () => {
    const doc = parseContentJson(
      readFileSync(resolve(contentDir, 'proposta-slides.content.json'), 'utf-8'),
    )
    expect(doc.title).toContain('Proposta')
    expect(doc.pages.length).toBeGreaterThan(2)
  })

  it('JSON quebrado e schema inválido dão mensagens distintas', () => {
    expect(() => parseContentJson('{nope')).toThrow(/JSON válido/)
    expect(() => parseContentJson('{"schemaVersion":1,"title":"x","pages":[]}')).toThrow(
      /content\.json inválido/,
    )
  })
})

describe('F4.1 — parse de Markdown estruturado', () => {
  it('fixture proposta-slides.md: H1/H2 viram slides, bullets viram lista', () => {
    const doc = parseMarkdownContent(readFileSync(resolve(contentDir, 'proposta-slides.md'), 'utf-8'))
    expect(doc.title).toBe('Proposta comercial — Cliente Exemplo')
    expect(doc.pages.length).toBeGreaterThanOrEqual(4)
    const escopo = doc.pages.find((p) => p.slots.titulo === 'Escopo do projeto')
    expect(escopo?.slots.bullets).toHaveLength(3)
    const invest = doc.pages.find((p) => p.slots.titulo === 'Investimento')
    expect(invest?.slots.texto).toContain('R$ 4.900')
  })

  it('markdown vazio dá erro claro', () => {
    expect(() => parseMarkdownContent('\n\n')).toThrow(/Markdown/)
  })
})

describe('F4.1 — matching com o template', () => {
  it('fixture content.json casa com o editorial; imagens e keys estranhas vão para não mapeado', () => {
    const doc = parseContentJson(
      readFileSync(resolve(contentDir, 'proposta-slides.content.json'), 'utf-8'),
    )
    const result = matchContentToTemplate(doc, editorial)
    expect(result.slides).toHaveLength(doc.pages.length)
    // slide 1: titulo-grande casa e variant sugerida é aplicada
    expect(result.slides[0].values['titulo-grande']).toContain('Proposta')
    expect(result.slides[0].variant).toBe('capa-lisa')
  })

  it('key desconhecida vai para unmapped com o slide de origem', () => {
    const result = matchContentToTemplate(
      {
        schemaVersion: 1,
        title: 'X',
        language: 'pt-BR',
        pages: [
          { slots: { titulo: 'Ok', 'key-inventada': 'sobra' } },
          { slots: { outra: ['a', 'b'] } },
        ],
      },
      editorial,
    )
    expect(result.slides[0].values.titulo).toBe('Ok')
    expect(result.unmapped).toEqual([
      { slideIndex: 0, key: 'key-inventada', value: 'sobra' },
      { slideIndex: 1, key: 'outra', value: ['a', 'b'] },
    ])
  })

  it('variant sugerida inválida cai no default; obrigatórios vazios sinalizados', () => {
    const result = matchContentToTemplate(
      { schemaVersion: 1, title: 'X', language: 'pt-BR', pages: [{ suggestedVariant: 'nao-existe', slots: {} }] },
      editorial,
    )
    const variantSlot = editorial.slots.find((s) => s.type === 'variant')
    const expected = variantSlot?.type === 'variant' ? (variantSlot.default ?? variantSlot.options[0]) : undefined
    expect(result.slides[0].variant).toBe(expected)
    // todo slot required do editorial deve aparecer como faltante num slide vazio
    const requiredKeys = editorial.slots
      .filter((s) => 'required' in s && s.required)
      .map((s) => s.key)
    expect(result.missingRequired[0]).toEqual(expect.arrayContaining(requiredKeys))
  })
})
