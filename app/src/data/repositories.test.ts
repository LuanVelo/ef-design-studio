import { db } from './db'
import { exportsRepo, projectsRepo, settingsRepo, templatesRepo, usersRepo } from './repositories'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('convenções de registro', () => {
  it('create preenche id, createdAt, updatedAt; update só muda updatedAt', async () => {
    const user = await usersRepo.create({ username: 'ana', ownerUserId: 'self' })
    expect(user.id).toBeTruthy()
    expect(Date.parse(user.createdAt)).not.toBeNaN()
    expect(user.updatedAt).toBe(user.createdAt)

    await new Promise((r) => setTimeout(r, 5))
    const updated = await usersRepo.update(user.id, { username: 'ana-maria' })
    expect(updated.createdAt).toBe(user.createdAt)
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(user.createdAt))
  })
})

describe('usersRepo', () => {
  it('round-trip: create → getByUsername → remove', async () => {
    const user = await usersRepo.create({ username: 'bruno', ownerUserId: 'self' })
    expect((await usersRepo.getByUsername('bruno'))?.id).toBe(user.id)
    await usersRepo.remove(user.id)
    expect(await usersRepo.getByUsername('bruno')).toBeUndefined()
  })
})

describe('templatesRepo', () => {
  it('round-trip com bytes do pacote e filtro por status', async () => {
    const bytes = new TextEncoder().encode('zip-fake')
    const created = await templatesRepo.create({
      ownerUserId: 'u1',
      manifestId: 'ef-social-01',
      name: 'Social Bold',
      category: 'social',
      version: '1.0.0',
      status: 'novo',
      usageCount: 0,
      packageBytes: bytes.buffer,
      packageMime: 'application/zip',
    })
    const loaded = await templatesRepo.get(created.id)
    expect(loaded?.name).toBe('Social Bold')
    expect(new TextDecoder().decode(loaded?.packageBytes)).toBe('zip-fake')
    expect(loaded?.packageMime).toBe('application/zip')

    expect(await templatesRepo.listByStatus('u1', 'novo')).toHaveLength(1)
    expect(await templatesRepo.listByStatus('u1', 'arquivado')).toHaveLength(0)
  })
})

describe('projectsRepo', () => {
  it('round-trip e listByTemplate', async () => {
    const p = await projectsRepo.create({
      ownerUserId: 'u1',
      name: 'Campanha Julho',
      templateId: 't1',
      status: 'rascunho',
      data: { slots: { titulo: 'Olá' } },
    })
    const loaded = await projectsRepo.get(p.id)
    expect(loaded?.data).toEqual({ slots: { titulo: 'Olá' } })
    expect(await projectsRepo.listByTemplate('u1', 't1')).toHaveLength(1)
    expect(await projectsRepo.listByTemplate('u2', 't1')).toHaveLength(0)
  })
})

describe('exportsRepo', () => {
  it('round-trip', async () => {
    const e = await exportsRepo.create({
      ownerUserId: 'u1',
      projectId: 'p1',
      formatKey: 'stories',
      fileType: 'png',
      fileCount: 1,
    })
    expect((await exportsRepo.get(e.id))?.formatKey).toBe('stories')
  })
})

describe('settingsRepo', () => {
  it('setByKey cria e depois atualiza o mesmo registro', async () => {
    const first = await settingsRepo.setByKey('u1', 'tema', 'claro')
    const second = await settingsRepo.setByKey('u1', 'tema', 'escuro')
    expect(second.id).toBe(first.id)
    expect((await settingsRepo.getByKey('u1', 'tema'))?.value).toBe('escuro')
    // outra pessoa não enxerga nem colide
    expect(await settingsRepo.getByKey('u2', 'tema')).toBeUndefined()
  })
})

describe('isolamento por ownerUserId', () => {
  it('listByOwner só devolve registros do dono', async () => {
    await projectsRepo.create({ ownerUserId: 'u1', name: 'A', templateId: 't', status: 'rascunho' })
    await projectsRepo.create({ ownerUserId: 'u2', name: 'B', templateId: 't', status: 'rascunho' })
    const mine = await projectsRepo.listByOwner('u1')
    expect(mine).toHaveLength(1)
    expect(mine[0].name).toBe('A')
  })
})
