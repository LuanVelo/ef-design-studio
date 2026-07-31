import { db } from '@data/db'
import { useSession } from './session'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  localStorage.clear()
  useSession.setState({ user: null, restoring: false })
})

describe('sessão local', () => {
  it('createAccount cria usuário com credenciais e ownerUserId = próprio id', async () => {
    const user = await useSession.getState().createAccount('ana', 'segredo1')
    expect(user.ownerUserId).toBe(user.id)
    expect(user.credentials?.iterations).toBeGreaterThanOrEqual(310_000)
    expect(useSession.getState().user?.username).toBe('ana')
    // sessão persistida com expiração
    const stored = JSON.parse(localStorage.getItem('ef-session')!)
    expect(stored.userId).toBe(user.id)
    expect(stored.expiresAt).toBeGreaterThan(Date.now())
  }, 15_000)

  it('não permite username duplicado', async () => {
    await useSession.getState().createAccount('ana', 'segredo1')
    await expect(useSession.getState().createAccount('ana', 'outra123')).rejects.toThrow(
      /já existe/i,
    )
  }, 15_000)

  it('login com senha errada falha; com senha certa entra; logout limpa', async () => {
    await useSession.getState().createAccount('bia', 'segredo1')
    useSession.getState().logout()
    expect(useSession.getState().user).toBeNull()
    expect(localStorage.getItem('ef-session')).toBeNull()

    await expect(useSession.getState().login('bia', 'errada')).rejects.toThrow(/senha incorreta/i)
    const user = await useSession.getState().login('bia', 'segredo1')
    expect(user.username).toBe('bia')
  }, 30_000)

  it('restore ignora sessão expirada', async () => {
    const user = await useSession.getState().createAccount('caio', 'segredo1')
    localStorage.setItem(
      'ef-session',
      JSON.stringify({ userId: user.id, timeoutMinutes: 480, expiresAt: Date.now() - 1000 }),
    )
    useSession.setState({ user: null, restoring: true })
    await useSession.getState().restore()
    expect(useSession.getState().user).toBeNull()
    expect(localStorage.getItem('ef-session')).toBeNull()
  }, 15_000)

  it('restore recupera sessão válida', async () => {
    const user = await useSession.getState().createAccount('duda', 'segredo1')
    useSession.setState({ user: null, restoring: true })
    await useSession.getState().restore()
    expect(useSession.getState().user?.id).toBe(user.id)
  }, 15_000)
})
