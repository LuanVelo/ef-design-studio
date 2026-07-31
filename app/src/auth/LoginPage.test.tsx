import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { db } from '@data/db'
import { LoginPage } from './LoginPage'
import { useSession } from './session'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<h1>Home logada</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  localStorage.clear()
  useSession.setState({ user: null, restoring: false })
})

describe('LoginPage', () => {
  it('sem usuários: modo criar com aviso de segurança; cria e entra', async () => {
    const user = userEvent.setup()
    renderLogin()
    expect(await screen.findByRole('heading', { name: /crie seu perfil/i })).toBeInTheDocument()
    expect(screen.getByText(/sobre a segurança/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/nome de usuário/i), 'ana')
    await user.type(screen.getByLabelText(/senha/i), 'segredo1')
    await user.click(screen.getByRole('button', { name: /criar perfil/i }))

    expect(await screen.findByText('Home logada', undefined, { timeout: 10_000 })).toBeInTheDocument()
    expect(useSession.getState().user?.username).toBe('ana')
  }, 20_000)

  it('com usuário existente: senha errada mostra erro, senha certa entra', async () => {
    await useSession.getState().createAccount('bia', 'segredo1')
    useSession.getState().logout()

    const user = userEvent.setup()
    renderLogin()
    expect(await screen.findByRole('heading', { name: /bem-vindo de volta/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/senha/i), 'errada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByRole('alert', undefined, { timeout: 10_000 })).toHaveTextContent(
      /senha incorreta/i,
    )

    await user.clear(screen.getByLabelText(/senha/i))
    await user.type(screen.getByLabelText(/senha/i), 'segredo1')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByText('Home logada', undefined, { timeout: 10_000 })).toBeInTheDocument()
  }, 40_000)
})
