import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

/**
 * Shell das telas logadas: página lisa em papel claro com header mínimo no
 * topo (Figma "home"). A moldura arredondada da direção anterior saiu junto
 * com a nav fixa — a Home é que faz o papel de hub.
 */
export function Shell() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-paper">
      <div className="px-6 sm:px-12 lg:px-24">
        <TopBar />
      </div>
      <main className="flex flex-1 flex-col px-6 pb-8 sm:px-8">
        <Outlet />
      </main>
      <footer className="flex justify-end px-6 pb-3 sm:px-8">
        <span className="text-meta text-ink-muted">v{__APP_VERSION__}</span>
      </footer>
    </div>
  )
}
