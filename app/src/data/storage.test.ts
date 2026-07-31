import { getStorageEstimate, requestPersistentStorage } from './storage'

describe('storage utils', () => {
  it('estimate calcula fração e flag de 80%', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: async () => ({ usage: 850, quota: 1000 }),
        persist: async () => true,
      },
    })
    const est = await getStorageEstimate()
    expect(est?.fraction).toBeCloseTo(0.85)
    expect(est?.nearLimit).toBe(true)
    expect(await requestPersistentStorage()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('degrada para null/false sem a API', async () => {
    vi.stubGlobal('navigator', {})
    expect(await getStorageEstimate()).toBeNull()
    expect(await requestPersistentStorage()).toBe(false)
    vi.unstubAllGlobals()
  })
})
