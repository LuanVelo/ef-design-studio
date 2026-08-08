import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { useSession } from '@auth/session'
import type { UserRecord } from '@data/types'

const fakeUser: UserRecord = {
  id: 'u-test',
  username: 'teste',
  ownerUserId: 'u-test',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function renderAt(path: string, { loggedIn = true } = {}) {
  useSession.setState({ user: loggedIn ? fakeUser : null, restoring: false })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('App shell e rotas', () => {
  it('renderiza a home (cards de tipo) dentro do shell quando logado', () => {
    renderAt('/')
    // âncora no início evita casar com o punho de arrastar ("Reordenar …")
    expect(screen.getByRole('button', { name: /^templates social/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^templates apresentação/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^histórico/i })).toBeInTheDocument()
    // versão do app visível no rodapé do shell
    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument()
  })

  it.each([
    ['/templates', /seus templates moram aqui/i],
    ['/social', /peça social/i],
    ['/slides', /da ideia ao pdf/i],
  ])('renderiza %s', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(heading)
  })

  it('sem sessão, rotas do app redirecionam para /login', async () => {
    renderAt('/templates', { loggedIn: false })
    expect(await screen.findByRole('heading', { name: /design studio/i })).toBeInTheDocument()
  })

  it('card da home leva para a escolha de template daquele tipo', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: /^templates social/i }))
    // sem templates importados no banco de teste, a tela mostra o estado vazio
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      /nenhum template social/i,
    )
  })

  it('login não usa o shell (sem logout no topo)', async () => {
    renderAt('/login', { loggedIn: false })
    expect(await screen.findByRole('heading', { name: /design studio/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument()
  })

  it('logout na topbar leva para /login', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByRole('button', { name: 'Fazer login' })).toBeInTheDocument()
  })
})
