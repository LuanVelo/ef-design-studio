import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PillButton } from '@components/PillButton'
import { usersRepo } from '@data/repositories'
import type { UserRecord } from '@data/types'
import { useSession } from './session'

type Mode = 'login' | 'criar'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, createAccount } = useSession()
  const [profiles, setProfiles] = useState<UserRecord[] | null>(null)
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void usersRepo.listAll().then((users) => {
      setProfiles(users)
      if (users.length === 0) setMode('criar')
      else setUsername(users[0].username)
    })
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'criar') await createAccount(username, password)
      else await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-lg rounded-(--radius-shell) bg-card p-8 shadow-(--shadow-soft) sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === 'criar' ? 'Crie seu perfil ✦' : 'Bem-vindo de volta ✦'}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === 'criar'
              ? 'Seus dados ficam só neste navegador — nada vai para a internet.'
              : 'Escolha seu perfil e entre com a senha.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === 'login' && profiles && profiles.length > 0 ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-ink-muted">Perfil</span>
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/30"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.username}>
                    {p.username}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-ink-muted">Nome de usuário</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/30"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-ink-muted">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
              className="rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/30"
            />
          </label>

          {error ? (
            <p role="alert" className="rounded-xl bg-retro-rosa px-4 py-2.5 text-sm text-ink">
              {error}
            </p>
          ) : null}

          <PillButton type="submit" disabled={busy} className="mt-2">
            {busy ? 'Aguarde…' : mode === 'criar' ? 'Criar perfil' : 'Entrar'}
          </PillButton>
        </form>

        <div className="mt-6 text-center">
          {profiles && profiles.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'criar' ? 'login' : 'criar')
                setError(null)
              }}
              className="cursor-pointer text-sm text-ink-muted underline-offset-4 hover:underline"
            >
              {mode === 'criar' ? 'Já tenho um perfil' : 'Criar novo perfil'}
            </button>
          ) : null}
        </div>

        {mode === 'criar' ? (
          <p className="mt-8 rounded-xl bg-surface px-4 py-3 text-xs leading-relaxed text-ink-muted">
            <strong className="text-ink">Sobre a segurança:</strong> este login protege seus
            projetos de olhares casuais em um computador compartilhado, mas os dados ficam no
            navegador e podem ser acessados por quem tem acesso total a esta máquina. Não use uma
            senha que você usa em outros serviços. Se esquecer a senha, não há recuperação.
          </p>
        ) : null}
      </div>
    </div>
  )
}
