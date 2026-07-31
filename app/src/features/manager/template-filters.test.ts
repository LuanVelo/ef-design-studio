import type { TemplateRecord } from '@data/types'
import {
  allTags,
  EMPTY_FILTERS,
  filterTemplates,
  latestPerManifestId,
  recentTemplates,
  shouldPromoteToAtivo,
  sortTemplates,
} from './template-filters'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-07-31T12:00:00Z')

function tpl(partial: Partial<TemplateRecord> & { name: string }): TemplateRecord {
  return {
    id: partial.name,
    manifestId: partial.name,
    category: 'social',
    version: '1.0.0',
    status: 'ativo',
    usageCount: 0,
    ownerUserId: 'u1',
    createdAt: new Date(NOW - 30 * DAY).toISOString(),
    updatedAt: new Date(NOW - 30 * DAY).toISOString(),
    ...partial,
  }
}

describe('shouldPromoteToAtivo (novo expira em 14 dias ou 1º uso)', () => {
  it('novo recém-importado não expira', () => {
    const t = tpl({ name: 'a', status: 'novo', createdAt: new Date(NOW - 2 * DAY).toISOString() })
    expect(shouldPromoteToAtivo(t, NOW)).toBe(false)
  })

  it('novo com 15 dias expira', () => {
    const t = tpl({ name: 'a', status: 'novo', createdAt: new Date(NOW - 15 * DAY).toISOString() })
    expect(shouldPromoteToAtivo(t, NOW)).toBe(true)
  })

  it('novo já usado expira imediatamente', () => {
    const t = tpl({
      name: 'a',
      status: 'novo',
      usageCount: 1,
      createdAt: new Date(NOW - 1 * DAY).toISOString(),
    })
    expect(shouldPromoteToAtivo(t, NOW)).toBe(true)
  })

  it('ativo/arquivado nunca promovem', () => {
    expect(shouldPromoteToAtivo(tpl({ name: 'a', status: 'ativo', usageCount: 5 }), NOW)).toBe(false)
    expect(shouldPromoteToAtivo(tpl({ name: 'a', status: 'arquivado' }), NOW)).toBe(false)
  })
})

describe('latestPerManifestId', () => {
  it('mantém só a maior versão de cada manifestId', () => {
    const list = [
      tpl({ name: 'x', id: 'x1', manifestId: 'x', version: '1.0.0' }),
      tpl({ name: 'x', id: 'x2', manifestId: 'x', version: '1.2.0' }),
      tpl({ name: 'x', id: 'x3', manifestId: 'x', version: '1.10.0' }),
      tpl({ name: 'y', id: 'y1', manifestId: 'y', version: '0.1.0' }),
    ]
    const latest = latestPerManifestId(list)
    expect(latest.map((t) => t.id).sort()).toEqual(['x3', 'y1'])
  })
})

describe('filterTemplates', () => {
  const list = [
    tpl({ name: 'Social Básico', tags: ['produto', 'claro'], category: 'social' }),
    tpl({ name: 'Slides Editorial', tags: ['editorial'], category: 'slides', status: 'novo' }),
    tpl({
      name: 'PDF Básico',
      category: 'pdf',
      lastUsedAt: new Date(NOW - 1 * DAY).toISOString(),
    }),
  ]

  it('busca é insensível a acentos e caixa', () => {
    expect(filterTemplates(list, { ...EMPTY_FILTERS, search: 'BASICO' })).toHaveLength(2)
    expect(filterTemplates(list, { ...EMPTY_FILTERS, search: 'editoriál' })).toHaveLength(1)
  })

  it('busca cobre tags', () => {
    expect(filterTemplates(list, { ...EMPTY_FILTERS, search: 'produto' })[0].name).toBe(
      'Social Básico',
    )
  })

  it('filtra por categoria, tag e status', () => {
    expect(filterTemplates(list, { ...EMPTY_FILTERS, category: 'pdf' })).toHaveLength(1)
    expect(filterTemplates(list, { ...EMPTY_FILTERS, tag: 'editorial' })).toHaveLength(1)
    expect(filterTemplates(list, { ...EMPTY_FILTERS, status: 'novo' })).toHaveLength(1)
  })

  it('status recente usa lastUsedAt', () => {
    const result = filterTemplates(list, { ...EMPTY_FILTERS, status: 'recente' }, NOW)
    expect(result.map((t) => t.name)).toEqual(['PDF Básico'])
  })
})

describe('sortTemplates', () => {
  const list = [
    tpl({ name: 'Bravo', id: 'b', usageCount: 5, createdAt: new Date(NOW - 3 * DAY).toISOString() }),
    tpl({
      name: 'Alfa',
      id: 'a',
      usageCount: 1,
      createdAt: new Date(NOW - 1 * DAY).toISOString(),
      lastUsedAt: new Date(NOW).toISOString(),
    }),
    tpl({ name: 'Charlie', id: 'c', usageCount: 9, createdAt: new Date(NOW - 2 * DAY).toISOString() }),
  ]

  it('az / usados / importacao / recentes', () => {
    expect(sortTemplates(list, 'az').map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(sortTemplates(list, 'usados').map((t) => t.id)).toEqual(['c', 'b', 'a'])
    expect(sortTemplates(list, 'importacao').map((t) => t.id)).toEqual(['a', 'c', 'b'])
    expect(sortTemplates(list, 'recentes')[0].id).toBe('a')
  })
})

describe('allTags e recentTemplates', () => {
  it('allTags une e ordena', () => {
    const list = [tpl({ name: 'a', tags: ['zeta', 'alfa'] }), tpl({ name: 'b', tags: ['alfa'] })]
    expect(allTags(list)).toEqual(['alfa', 'zeta'])
  })

  it('recentTemplates limita e ordena por último uso', () => {
    const list = [
      tpl({ name: 'velho', lastUsedAt: new Date(NOW - 20 * DAY).toISOString() }),
      tpl({ name: 'ontem', lastUsedAt: new Date(NOW - 1 * DAY).toISOString() }),
      tpl({ name: 'hoje', lastUsedAt: new Date(NOW - 1000).toISOString() }),
    ]
    // "velho" está fora da janela de recência
    expect(recentTemplates(list, 4, NOW).map((t) => t.name)).toEqual(['hoje', 'ontem'])
  })
})
