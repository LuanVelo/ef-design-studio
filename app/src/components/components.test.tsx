import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Badge } from './Badge'
import { Modal } from './Modal'
import { PillButton } from './PillButton'

describe('Badge', () => {
  it('renderiza rótulos pt-BR por tipo', () => {
    render(
      <>
        <Badge kind="social" />
        <Badge kind="novo" />
        <Badge kind="arquivado" />
      </>,
    )
    expect(screen.getByText('Social')).toBeInTheDocument()
    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(screen.getByText('Arquivado')).toBeInTheDocument()
  })

  it('aceita label customizado', () => {
    render(<Badge kind="social" label="Produto" />)
    expect(screen.getByText('Produto')).toBeInTheDocument()
  })
})

describe('PillButton', () => {
  it('dispara onClick e respeita disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <>
        <PillButton onClick={onClick}>Ok</PillButton>
        <PillButton disabled onClick={onClick}>
          Nao
        </PillButton>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Ok' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Nao' })).toBeDisabled()
  })
})

function ModalHost() {
  const [open, setOpen] = useState(true)
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Selecionar template">
      <p>conteudo</p>
    </Modal>
  )
}

describe('Modal', () => {
  it('abre, mostra título e fecha no X e no Esc', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<ModalHost />)
    expect(screen.getByRole('dialog', { name: 'Selecionar template' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()

    render(<ModalHost />)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
