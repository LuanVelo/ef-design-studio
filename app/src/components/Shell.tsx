import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

/**
 * Shell canônico (R3): canvas cinza-quente atrás, o app inteiro vive dentro
 * de uma superfície creme arredondada com margem.
 */
export function Shell() {
  return (
    <div className="min-h-screen bg-canvas p-2 sm:p-3">
      <div className="flex min-h-[calc(100vh-1.5rem)] flex-col rounded-(--radius-shell) bg-surface shadow-(--shadow-soft)">
        <TopBar />
        <main className="flex-1 px-6 pb-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
