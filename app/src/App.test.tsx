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
  it('renderiza a home dentro do shell quando logado', () => {
    renderAt('/')
    expect(screen.getByText('EF Design Studio')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/peças de design/i)
    // versão do app visível no rodapé do shell
    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument()
  })

  it.each([
    ['/templates', /seus templates moram aqui/i],
    ['/social', /peça social/i],
    ['/slides', /slides & pdf/i],
  ])('renderiza %s', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(heading)
  })

  it('sem sessão, rotas do app redirecionam para /login', async () => {
    renderAt('/templates', { loggedIn: false })
    expect(await screen.findByRole('heading', { name: /crie seu perfil/i })).toBeInTheDocument()
  })

  it('navega pela topbar', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: 'Templates' }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      /seus templates moram aqui/i,
    )
    await user.click(screen.getByRole('link', { name: 'Slides & PDF' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/slides & pdf/i)
  })

  it('login não usa o shell (sem topbar)', async () => {
    renderAt('/login', { loggedIn: false })
    expect(await screen.findByRole('heading', { name: /crie seu perfil/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Templates' })).not.toBeInTheDocument()
  })

  it('logout na topbar leva para /login', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { name: /crie seu perfil/i })).toBeInTheDocument()
  })
})
