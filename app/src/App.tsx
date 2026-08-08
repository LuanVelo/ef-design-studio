import { Routes, Route } from 'react-router-dom'
import { RequireAuth } from '@auth/RequireAuth'
import { Shell } from '@components/Shell'
import { HomePage } from '@features/home/HomePage'
import { HistoricoPage } from '@features/home/HistoricoPage'
import { TemplateSliderPage } from '@features/home/TemplateSliderPage'
import { TemplatesPage } from '@features/manager/TemplatesPage'
import { TemplateDetailPage } from '@features/manager/TemplateDetailPage'
import { SocialPage } from '@features/social/SocialPage'
import { SocialWizardPage } from '@features/social/SocialWizardPage'
import { SlidesPage } from '@features/slides/SlidesPage'
import { SlidesEditorPage } from '@features/slides/SlidesEditorPage'
import { LoginPage } from '@auth/LoginPage'
import { RenderHarnessPage } from '@features/dev/RenderHarnessPage'

// Referências estáveis: TemplateSliderPage recarrega a lista quando `categories` muda.
const SOCIAL_CATEGORIES = ['social'] as const
const SLIDES_CATEGORIES = ['slides', 'pdf'] as const

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Harness de dev do motor de render (sem link na navegação) */}
      <Route path="/dev/render" element={<RenderHarnessPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/historico" element={<HistoricoPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/:id" element={<TemplateDetailPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route
            path="/social/novo"
            element={<TemplateSliderPage categories={SOCIAL_CATEGORIES} title="Social" />}
          />
          <Route path="/social/:projectId" element={<SocialWizardPage />} />
          <Route path="/slides" element={<SlidesPage />} />
          <Route
            path="/slides/novo"
            element={<TemplateSliderPage categories={SLIDES_CATEGORIES} title="Apresentação" />}
          />
          <Route path="/slides/:projectId" element={<SlidesEditorPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
