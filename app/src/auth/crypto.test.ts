import { PBKDF2_ITERATIONS, hashPassword, verifyPassword } from './crypto'

// Iterações reduzidas nos testes para velocidade; o default é validado à parte.
const TEST_ITERATIONS = 1_000

describe('crypto (PBKDF2)', () => {
  it('default de iterações atende o mínimo do escopo (≥310k)', () => {
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(310_000)
  })

  it('hash → verify round-trip', async () => {
    const creds = await hashPassword('senha-secreta', TEST_ITERATIONS)
    expect(creds.algorithm).toBe('PBKDF2-SHA256')
    expect(creds.saltB64).toBeTruthy()
    expect(creds.hashB64).toBeTruthy()
    expect(await verifyPassword('senha-secreta', creds)).toBe(true)
    expect(await verifyPassword('senha-errada', creds)).toBe(false)
  })

  it('salts aleatórios: mesmo password gera hashes diferentes', async () => {
    const a = await hashPassword('igual', TEST_ITERATIONS)
    const b = await hashPassword('igual', TEST_ITERATIONS)
    expect(a.saltB64).not.toBe(b.saltB64)
    expect(a.hashB64).not.toBe(b.hashB64)
  })
})
