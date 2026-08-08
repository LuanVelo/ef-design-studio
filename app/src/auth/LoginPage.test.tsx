import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { db } from '@data/db'
import { usersRepo } from '@data/repositories'
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

/** O login está desligado por enquanto: clicar já entra, sem e-mail nem senha. */
describe('LoginPage', () => {
  it('o CTA entra direto, criando o perfil local na primeira vez', async () => {
    const user = userEvent.setup()
    renderLogin()
    expect(await screen.findByRole('heading', { name: /design studio/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fazer login' }))

    expect(
      await screen.findByText('Home logada', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument()
    expect(useSession.getState().user).not.toBeNull()
    expect(await usersRepo.listAll()).toHaveLength(1)
  }, 20_000)

  it('o "Login" do topo entra do mesmo jeito', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: /^login$/i }))

    expect(
      await screen.findByText('Home logada', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument()
  }, 20_000)

  it('reaproveita o perfil que já existe em vez de criar outro', async () => {
    await useSession.getState().enterWithoutPassword()
    const [primeiro] = await usersRepo.listAll()
    useSession.getState().logout()

    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: 'Fazer login' }))

    expect(
      await screen.findByText('Home logada', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument()
    expect(await usersRepo.listAll()).toHaveLength(1)
    expect(useSession.getState().user?.id).toBe(primeiro.id)
  }, 20_000)
})
