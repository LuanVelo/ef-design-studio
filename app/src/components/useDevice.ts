import { useEffect, useState } from 'react'

export type Device = 'celular' | 'tablet' | 'desktop'

/** Breakpoints do ESCOPO: celular <768 / tablet 768–1199 / desktop ≥1200 */
export function deviceFromWidth(width: number): Device {
  if (width < 768) return 'celular'
  if (width < 1200) return 'tablet'
  return 'desktop'
}

export function useDevice(): Device {
  const [device, setDevice] = useState<Device>(() => deviceFromWidth(window.innerWidth))

  useEffect(() => {
    const onResize = () => setDevice(deviceFromWidth(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return device
}
