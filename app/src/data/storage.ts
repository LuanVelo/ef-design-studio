/** Persistência e cota de storage (RNF: aviso a 80% da cota). */

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export type StorageEstimate = {
  usageBytes: number
  quotaBytes: number
  /** 0..1 — fração usada da cota */
  fraction: number
  nearLimit: boolean
}

const NEAR_LIMIT_THRESHOLD = 0.8

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  const fraction = quota > 0 ? usage / quota : 0
  return {
    usageBytes: usage,
    quotaBytes: quota,
    fraction,
    nearLimit: fraction >= NEAR_LIMIT_THRESHOLD,
  }
}
