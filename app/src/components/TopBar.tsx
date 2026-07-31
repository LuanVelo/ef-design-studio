import { NavLink, useNavigate } from 'react-router-dom'
import { useSession } from '@auth/session'

const navItems = [
  { to: '/templates', label: 'Templates' },
  { to: '/social', label: 'Social' },
  { to: '/slides', label: 'Slides & PDF' },
]

export function TopBar() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  return (
    <header className="flex items-center justify-between px-6 py-4 sm:px-8">
      <NavLink to="/" className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white"
        >
          EF
        </span>
        <span className="text-sm font-semibold tracking-tight">EF Design Studio</span>
      </NavLink>

      <nav className="flex items-center gap-1" aria-label="Navegação principal">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'bg-ink text-white' : 'text-ink hover:bg-ink/5'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-retro-pessego text-xs font-semibold text-ink"
          aria-label={user ? `Perfil: ${user.username}` : 'Usuário'}
          title={user?.username}
        >
          {user ? user.username.charAt(0).toUpperCase() : '?'}
        </span>
        {user ? (
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="cursor-pointer rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            Sair
          </button>
        ) : null}
      </div>
    </header>
  )
}
