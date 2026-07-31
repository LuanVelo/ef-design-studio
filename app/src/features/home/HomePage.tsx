import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@components/EmptyState'
import { PillButton } from '@components/PillButton'
import { Badge } from '@components/Badge'

export function HomePage() {
  const navigate = useNavigate()
  return (
    <>
      <EmptyState
        headline="Suas peças de design, produzidas em minutos ✦"
        subtitle="Importe templates, preencha o conteúdo e exporte para social, slides e PDF — tudo no seu navegador, 100% offline."
        action={
          <PillButton onClick={() => navigate('/templates')}>Abrir gerenciador de templates</PillButton>
        }
      />
      <div className="flex items-center justify-center gap-2">
        <Badge kind="social" />
        <Badge kind="slides" />
        <Badge kind="pdf" />
      </div>
    </>
  )
}
