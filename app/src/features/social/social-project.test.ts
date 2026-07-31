import { db } from '@data/db'
import { projectsRepo, templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import {
  addPage,
  createSocialProject,
  duplicatePage,
  effectiveContent,
  emptySocialData,
  listSocialProjects,
  movePage,
  relativeTime,
  removePage,
  saveSocialProject,
  socialDataOf,
} from './social-project'

const OWNER = 'u1'

function makeTemplate(partial: Partial<TemplateRecord> = {}): Promise<TemplateRecord> {
  return templatesRepo.create({
    ownerUserId: OWNER,
    manifestId: 'ef-social-x',
    name: 'Social X',
    category: 'social',
    version: '1.0.0',
    status: 'novo',
    usageCount: 0,
    ...partial,
  })
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('F3.1 — projeto social', () => {
  it('cria rascunho na entrada e marca 1º uso do template', async () => {
    const template = await makeTemplate()
    const project = await createSocialProject(template)

    expect(project.status).toBe('rascunho')
    expect(project.templateId).toBe(template.id)
    expect(project.name).toContain('Social X')
    expect(socialDataOf(project)).toMatchObject({ kind: 'social', formatKeys: [], step: 2 })

    const used = await templatesRepo.get(template.id)
    expect(used?.usageCount).toBe(1)
    expect(used?.lastUsedAt).toBeTruthy()
  })

  it('autosave: patch de dados + nome, preservando o resto', async () => {
    const template = await makeTemplate()
    const project = await createSocialProject(template)

    const saved = await saveSocialProject(project, { formatKeys: ['stories'], step: 3 }, {
      name: 'Campanha Agosto',
    })
    expect(saved.name).toBe('Campanha Agosto')
    expect(socialDataOf(saved)).toMatchObject({ formatKeys: ['stories'], step: 3, kind: 'social' })

    const reloaded = await projectsRepo.get(project.id)
    expect(socialDataOf(reloaded!).formatKeys).toEqual(['stories'])
  })

  it('listSocialProjects: só projetos sociais fora da lixeira, mais recente primeiro', async () => {
    const template = await makeTemplate()
    const p1 = await createSocialProject(template)
    await new Promise((r) => setTimeout(r, 5))
    const p2 = await createSocialProject(template)
    // projeto de outro fluxo (sem data social) e um na lixeira não aparecem
    await projectsRepo.create({
      ownerUserId: OWNER,
      name: 'Slides qualquer',
      templateId: template.id,
      status: 'rascunho',
    })
    await projectsRepo.update(p1.id, { status: 'lixeira' })

    const list = await listSocialProjects(OWNER)
    expect(list.map((p) => p.id)).toEqual([p2.id])
  })

  it('retomada preserva a etapa salva', async () => {
    const template = await makeTemplate()
    const project = await createSocialProject(template)
    await saveSocialProject(project, { step: 4, formatKeys: ['stories', 'feed-square'] })
    const [resumed] = await listSocialProjects(OWNER)
    expect(socialDataOf(resumed)).toMatchObject({ step: 4, formatKeys: ['stories', 'feed-square'] })
  })
})

describe('F3.2 — conteúdo efetivo (compartilhado ← override ← página)', () => {
  function dataWith(): ReturnType<typeof emptySocialData> {
    const d = emptySocialData()
    d.content = {
      values: { titulo: 'Compartilhado', sub: 'Sub' },
      variant: 'a',
      colors: { destaque: '#111111' },
      images: { hero: 'data:img-shared' },
    }
    d.overrides = { stories: { values: { titulo: 'Só stories' }, variant: 'b' } }
    d.pages = {
      'carousel-square': [
        { values: { titulo: 'Página 1' }, colors: {}, images: {} },
        { values: {}, colors: {}, images: { hero: 'data:img-p2' } },
      ],
    }
    return d
  }

  it('override por formato sobrescreve só os campos fixados', () => {
    const d = dataWith()
    const stories = effectiveContent(d, 'stories')
    expect(stories.values).toMatchObject({ titulo: 'Só stories', sub: 'Sub' })
    expect(stories.variant).toBe('b')
    const feed = effectiveContent(d, 'feed-square')
    expect(feed.values.titulo).toBe('Compartilhado')
    expect(feed.variant).toBe('a')
  })

  it('página do carousel sobrepõe o compartilhado por slot', () => {
    const d = dataWith()
    const p1 = effectiveContent(d, 'carousel-square', 0)
    expect(p1.values).toMatchObject({ titulo: 'Página 1', sub: 'Sub' })
    expect(p1.images.hero).toBe('data:img-shared')
    const p2 = effectiveContent(d, 'carousel-square', 1)
    expect(p2.values.titulo).toBe('Compartilhado')
    expect(p2.images.hero).toBe('data:img-p2')
  })

  it('gerenciador de páginas: add/duplicar/mover/excluir imutáveis', () => {
    let d = { ...dataWith(), ...addPage(dataWith(), 'carousel-square') }
    expect(d.pages['carousel-square']).toHaveLength(3)
    d = { ...d, ...duplicatePage(d, 'carousel-square', 0) }
    expect(d.pages['carousel-square'][1].values.titulo).toBe('Página 1')
    d = { ...d, ...movePage(d, 'carousel-square', 3, 0) }
    expect(d.pages['carousel-square']).toHaveLength(4)
    d = { ...d, ...removePage(d, 'carousel-square', 0) }
    expect(d.pages['carousel-square']).toHaveLength(3)
    // fora dos limites não quebra
    d = { ...d, ...movePage(d, 'carousel-square', 10, 0) }
    expect(d.pages['carousel-square']).toHaveLength(3)
  })
})

describe('relativeTime', () => {
  const NOW = Date.parse('2026-07-31T12:00:00Z')
  it('formata faixas de tempo', () => {
    expect(relativeTime(new Date(NOW - 30_000).toISOString(), NOW)).toBe('agora mesmo')
    expect(relativeTime(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe('há 5 min')
    expect(relativeTime(new Date(NOW - 3 * 3_600_000).toISOString(), NOW)).toBe('há 3 h')
    expect(relativeTime(new Date(NOW - 26 * 3_600_000).toISOString(), NOW)).toBe('ontem')
    expect(relativeTime(new Date(NOW - 80 * 3_600_000).toISOString(), NOW)).toBe('há 3 dias')
  })
})
