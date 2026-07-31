import { db } from '@data/db'
import { projectsRepo, templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import {
  archiveTemplate,
  deleteTemplate,
  duplicateTemplate,
  exportTemplate,
  newerVersionOf,
  unarchiveTemplate,
} from './template-actions'
import { saveFile } from '@data/fs-adapter'

vi.mock('@data/fs-adapter', () => ({
  saveFile: vi.fn().mockResolvedValue(true),
}))

const OWNER = 'u1'

function makeTemplate(partial: Partial<TemplateRecord> = {}): Promise<TemplateRecord> {
  return templatesRepo.create({
    ownerUserId: OWNER,
    manifestId: 'ef-x',
    name: 'X',
    category: 'social',
    version: '1.0.0',
    status: 'ativo',
    usageCount: 0,
    packageBytes: new TextEncoder().encode('zip').buffer,
    packageMime: 'application/zip',
    ...partial,
  })
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  vi.clearAllMocks()
})

describe('F2.4 — arquivar/desarquivar', () => {
  it('alterna o status preservando o resto', async () => {
    const t = await makeTemplate()
    expect((await archiveTemplate(t.id)).status).toBe('arquivado')
    const back = await unarchiveTemplate(t.id)
    expect(back.status).toBe('ativo')
    expect(back.name).toBe('X')
  })
})

describe('F2.4 — exclusão definitiva', () => {
  it('exclui quando não há projetos vinculados', async () => {
    const t = await makeTemplate()
    const result = await deleteTemplate(t)
    expect(result.blocked).toBe(false)
    expect(await templatesRepo.get(t.id)).toBeUndefined()
  })

  it('bloqueia com projetos vinculados e informa a contagem', async () => {
    const t = await makeTemplate()
    await projectsRepo.create({
      ownerUserId: OWNER,
      name: 'Projeto',
      templateId: t.id,
      status: 'rascunho',
    })
    const result = await deleteTemplate(t)
    expect(result).toEqual({ blocked: true, projectCount: 1 })
    expect(await templatesRepo.get(t.id)).toBeDefined()
  })

  it('projetos na lixeira não bloqueiam', async () => {
    const t = await makeTemplate()
    await projectsRepo.create({
      ownerUserId: OWNER,
      name: 'Projeto',
      templateId: t.id,
      status: 'lixeira',
    })
    expect((await deleteTemplate(t)).blocked).toBe(false)
  })
})

describe('F2.4 — exportar e duplicar', () => {
  it('exporta o pacote original com nome id-versão', async () => {
    const t = await makeTemplate()
    await exportTemplate(t)
    expect(saveFile).toHaveBeenCalledWith(
      expect.any(Blob),
      'ef-x-v1.0.0.eftpl',
      expect.anything(),
    )
  })

  it('duplicar cria manifestId derivado, origem marcada e status novo', async () => {
    const t = await makeTemplate({ usageCount: 7 })
    const copy = await duplicateTemplate(t)
    expect(copy.manifestId).toBe('ef-x-copia')
    expect(copy.copiedFrom).toBe('ef-x')
    expect(copy.status).toBe('novo')
    expect(copy.usageCount).toBe(0)
    expect(copy.name).toBe('X (cópia)')

    const copy2 = await duplicateTemplate(t)
    expect(copy2.manifestId).toBe('ef-x-copia-2')
  })
})

describe('F2.4 — aviso de versão mais nova (RF-G4)', () => {
  it('aponta a maior versão mais nova; null quando já é a mais nova', async () => {
    const v1 = await makeTemplate({ version: '1.0.0' })
    await makeTemplate({ version: '1.2.0' })
    const v3 = await makeTemplate({ version: '1.10.0' })
    expect((await newerVersionOf(v1))?.version).toBe('1.10.0')
    expect(await newerVersionOf(v3)).toBeNull()
  })
})
