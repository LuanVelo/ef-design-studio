import { NavLink, useNavigate } from 'react-router-dom'
import { useSession } from '@auth/session'
import { Avatar } from './Avatar'
import { EspindolaLogo } from './EspindolaLogo'

/**
 * Header mínimo (variante "light" do Figma): logo à esquerda, Logout + avatar
 * à direita. A navegação entre ferramentas mora na Home (cards de tipo), não
 * numa nav fixa — decisão de UI de 02/08/2026.
 */
export function TopBar() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  return (
    <header className="flex items-center justify-between py-6">
      <NavLink to="/" aria-label="Início" className="text-brand-body">
        <EspindolaLogo />
      </NavLink>

      <div className="flex items-center gap-3">
        {user ? (
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="cursor-pointer text-base text-brand-body transition-opacity hover:opacity-70"
            style={{ fontFamily: 'var(--font-nav)' }}
          >
            Logout
          </button>
        ) : null}
        <Avatar name={user?.username} size={23} />
      </div>
    </header>
  )
}
