import { EmptyState } from '@components/EmptyState'
import { PillButton } from '@components/PillButton'

export function TemplatesPage() {
  return (
    <EmptyState
      headline="Nenhum template ainda"
      subtitle="Importe um pacote .eftpl para começar. O gerenciador chega na fase F2."
      action={<PillButton disabled>Importar template (.eftpl)</PillButton>}
    />
  )
}
