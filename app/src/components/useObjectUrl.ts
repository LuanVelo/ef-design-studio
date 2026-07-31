import { useEffect, useState } from 'react'

/** Object URL para bytes persistidos (thumbnails etc.), revogado ao desmontar/trocar. */
export function useObjectUrl(bytes?: ArrayBuffer, mime = 'image/png'): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!bytes) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }))
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [bytes, mime])
  return url
}
