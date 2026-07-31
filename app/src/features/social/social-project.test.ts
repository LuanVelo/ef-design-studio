import { db } from '@data/db'
import { projectsRepo, templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import {
  createSocialProject,
  listSocialProjects,
  relativeTime,
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
