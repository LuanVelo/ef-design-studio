import { Routes, Route } from 'react-router-dom'
import { RequireAuth } from '@auth/RequireAuth'
import { Shell } from '@components/Shell'
import { HomePage } from '@features/home/HomePage'
import { TemplatesPage } from '@features/manager/TemplatesPage'
import { TemplateDetailPage } from '@features/manager/TemplateDetailPage'
import { SocialPage } from '@features/social/SocialPage'
import { SlidesPage } from '@features/slides/SlidesPage'
import { LoginPage } from '@auth/LoginPage'
import { RenderHarnessPage } from '@features/dev/RenderHarnessPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Harness de dev do motor de render (sem link na navegação) */}
      <Route path="/dev/render" element={<RenderHarnessPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/:id" element={<TemplateDetailPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/slides" element={<SlidesPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
