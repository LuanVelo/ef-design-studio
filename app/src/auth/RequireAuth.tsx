import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './session'

/** Guard: rotas do app exigem sessão ativa; sem sessão → /login. */
export function RequireAuth() {
  const { user, restoring, restore, touch } = useSession()

  useEffect(() => {
    if (restoring) void restore()
  }, [restoring, restore])

  // Renova a expiração por inatividade em interações reais (throttle simples).
  useEffect(() => {
    if (!user) return
    let last = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - last > 60_000) {
        last = now
        touch()
      }
    }
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)
    return () => {
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
    }
  }, [user, touch])

  if (restoring) return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
