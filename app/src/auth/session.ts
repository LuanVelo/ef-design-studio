import { create } from 'zustand'
import { usersRepo } from '@data/repositories'
import { hashPassword, verifyPassword } from './crypto'
import type { UserRecord } from '@data/types'

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 480 // 8h

const SESSION_KEY = 'ef-session'

type StoredSession = {
  userId: string
  expiresAt: number // epoch ms
  timeoutMinutes: number
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function writeStoredSession(session: StoredSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

type SessionState = {
  user: UserRecord | null
  /** true enquanto a sessão persistida ainda não foi restaurada */
  restoring: boolean
  restore: () => Promise<void>
  createAccount: (username: string, password: string) => Promise<UserRecord>
  login: (username: string, password: string) => Promise<UserRecord>
  /**
   * Entrada sem senha (decisão de 02/08/2026: o login fica desligado por
   * enquanto — clicar em "Login" já acessa). Reaproveita o perfil local se
   * existir, senão cria um sem credenciais. `createAccount`/`login` seguem
   * intactos para quando o login voltar a ser exigido.
   */
  enterWithoutPassword: () => Promise<UserRecord>
  logout: () => void
  /** Renova a expiração por inatividade. Chamar em interações relevantes. */
  touch: () => void
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  restoring: true,

  restore: async () => {
    const stored = readStoredSession()
    if (!stored) {
      set({ user: null, restoring: false })
      return
    }
    const user = (await usersRepo.get(stored.userId)) ?? null
    set({ user, restoring: false })
    if (user) get().touch()
  },

  createAccount: async (username, password) => {
    const trimmed = username.trim()
    if (!trimmed) throw new Error('Informe um nome de usuário.')
    if (password.length < 4) throw new Error('A senha precisa de pelo menos 4 caracteres.')
    if (await usersRepo.getByUsername(trimmed)) {
      throw new Error('Já existe um perfil com esse nome.')
    }
    const credentials = await hashPassword(password)
    const user = await usersRepo.create({
      username: trimmed,
      ownerUserId: '', // preenchido abaixo com o próprio id
      credentials,
      sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
    })
    const withOwner = await usersRepo.update(user.id, { ownerUserId: user.id })
    set({ user: withOwner })
    get().touch()
    return withOwner
  },

  login: async (username, password) => {
    const user = await usersRepo.getByUsername(username)
    if (!user?.credentials) throw new Error('Perfil não encontrado.')
    const ok = await verifyPassword(password, user.credentials)
    if (!ok) throw new Error('Senha incorreta. Tente novamente.')
    set({ user })
    get().touch()
    return user
  },

  enterWithoutPassword: async () => {
    const existing = (await usersRepo.listAll())[0]
    let user = existing
    if (!user) {
      const created = await usersRepo.create({
        username: 'local',
        ownerUserId: '', // preenchido abaixo com o próprio id
        sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
      })
      user = await usersRepo.update(created.id, { ownerUserId: created.id })
    }
    set({ user })
    get().touch()
    return user
  },

  logout: () => {
    writeStoredSession(null)
    set({ user: null })
  },

  touch: () => {
    const { user } = get()
    if (!user) return
    const timeoutMinutes = user.sessionTimeoutMinutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES
    writeStoredSession({
      userId: user.id,
      timeoutMinutes,
      expiresAt: Date.now() + timeoutMinutes * 60_000,
    })
  },
}))
