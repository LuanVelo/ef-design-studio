import { pxToPt } from './slides-export'

describe('F4.3 — export de slides', () => {
  it('pxToPt converte 96dpi → 72dpi (A4 794px ≈ 595.5pt)', () => {
    expect(pxToPt(96)).toBe(72)
    expect(pxToPt(794)).toBeCloseTo(595.5)
    expect(pxToPt(1123)).toBeCloseTo(842.25)
    // 16:9 nativo
    expect(pxToPt(1920)).toBe(1440)
    expect(pxToPt(1080)).toBe(810)
  })
})
