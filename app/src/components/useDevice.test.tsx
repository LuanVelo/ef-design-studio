import { act, renderHook } from '@testing-library/react'
import { deviceFromWidth, useDevice } from './useDevice'

function resizeTo(width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
}

describe('deviceFromWidth', () => {
  it.each([
    [320, 'celular'],
    [767, 'celular'],
    [768, 'tablet'],
    [1199, 'tablet'],
    [1200, 'desktop'],
    [1920, 'desktop'],
  ])('%dpx → %s', (width, expected) => {
    expect(deviceFromWidth(width)).toBe(expected)
  })
})

describe('useDevice', () => {
  it('reage a resize', () => {
    window.innerWidth = 1400
    const { result } = renderHook(() => useDevice())
    expect(result.current).toBe('desktop')

    act(() => resizeTo(800))
    expect(result.current).toBe('tablet')

    act(() => resizeTo(500))
    expect(result.current).toBe('celular')
  })
})
