import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CANONICAL_FORMATS,
  ContentDocumentSchema,
  getCanonicalFormat,
  TemplateManifestSchema,
} from './index'

// cwd dos testes = app/; o template real vive na raiz do repo
const realManifestPath = resolve(process.cwd(), '../templates/slide-deck-16x9/manifest.json')

function validManifest() {
  return {
    schemaVersion: 1,
    id: 'ef-teste-01',
    name: 'Teste',
    category: 'social',
    version: '1.0.0',
    formats: [
      { key: 'stories', file: 'layouts/stories.html', width: 1080, height: 1920, pages: 'single' },
    ],
    slots: [
      { key: 'titulo', type: 'text', label: 'Título', required: true, maxChars: 60 },
      {
        key: 'variante',
        type: 'variant',
        label: 'Variação',
        options: ['a', 'b'],
        default: 'a',
      },
    ],
  }
}

describe('TemplateManifestSchema', () => {
  it('valida o manifest real do ef-slides-editorial-01', () => {
    const raw = JSON.parse(readFileSync(realManifestPath, 'utf-8'))
    const result = TemplateManifestSchema.safeParse(raw)
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('ef-slides-editorial-01')
      expect(result.data.category).toBe('slides')
      expect(result.data.formats[0]).toMatchObject({ key: 'slide-16x9', width: 1920, height: 1080 })
      expect(result.data.slots).toHaveLength(10)
      expect(result.data.colors?.editable).toHaveLength(5)
    }
  })

  it('valida um manifest mínimo e aplica defaults', () => {
    const result = TemplateManifestSchema.safeParse(validManifest())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual([])
      expect(result.data.slots[0]).toMatchObject({ required: true })
    }
  })

  it.each([
    ['categoria inválida', { category: 'banner' }],
    ['version não-semver', { version: '1.0' }],
    ['id com maiúsculas', { id: 'EF-Teste' }],
    ['schemaVersion errado', { schemaVersion: 2 }],
    ['formats vazio', { formats: [] }],
    ['slots vazio', { slots: [] }],
  ])('rejeita %s', (_label, patch) => {
    const result = TemplateManifestSchema.safeParse({ ...validManifest(), ...patch })
    expect(result.success).toBe(false)
  })

  it('rejeita slot duplicado e default de variant fora das options', () => {
    const dup = validManifest()
    dup.slots.push({ key: 'titulo', type: 'text', label: 'Outro' } as never)
    expect(TemplateManifestSchema.safeParse(dup).success).toBe(false)

    const badDefault = validManifest()
    ;(badDefault.slots[1] as { default: string }).default = 'inexistente'
    expect(TemplateManifestSchema.safeParse(badDefault).success).toBe(false)
  })

  it('aceita slot page-group com slots internos, mas não aninhado', () => {
    const m = validManifest()
    m.slots.push({
      key: 'paginas',
      type: 'page-group',
      label: 'Páginas',
      slots: [{ key: 'sub-titulo', type: 'text', label: 'Título da página' }],
    } as never)
    expect(TemplateManifestSchema.safeParse(m).success).toBe(true)

    const nested = validManifest()
    nested.slots.push({
      key: 'paginas',
      type: 'page-group',
      label: 'Páginas',
      slots: [{ key: 'x', type: 'page-group', label: 'Nested', slots: [] }],
    } as never)
    expect(TemplateManifestSchema.safeParse(nested).success).toBe(false)
  })
})

describe('catálogo de formatos canônicos', () => {
  it('tem os 9 formatos da tabela do CLAUDE.md', () => {
    expect(CANONICAL_FORMATS).toHaveLength(9)
    expect(getCanonicalFormat('slide-16x9')).toMatchObject({
      width: 1920,
      height: 1080,
      category: 'slides',
      pages: 'multi',
    })
    expect(getCanonicalFormat('carousel-square')).toMatchObject({ minPages: 2, maxPages: 10 })
    expect(getCanonicalFormat('pdf-a4-portrait')).toMatchObject({ width: 794, height: 1123 })
    expect(getCanonicalFormat('inexistente')).toBeUndefined()
  })
})

describe('ContentDocumentSchema', () => {
  it('valida documento de conteúdo com páginas', () => {
    const result = ContentDocumentSchema.safeParse({
      schemaVersion: 1,
      title: 'Proposta comercial',
      pages: [
        { suggestedVariant: 'capa-lisa', slots: { 'titulo-grande': 'Proposta Comercial' } },
        { slots: { 'texto-1': 'Corpo', menu: ['Início', 'Escopo'] } },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.language).toBe('pt-BR')
  })

  it('rejeita documento sem páginas ou sem título', () => {
    expect(
      ContentDocumentSchema.safeParse({ schemaVersion: 1, title: 'X', pages: [] }).success,
    ).toBe(false)
    expect(
      ContentDocumentSchema.safeParse({ schemaVersion: 1, pages: [{ slots: {} }] }).success,
    ).toBe(false)
  })
})
