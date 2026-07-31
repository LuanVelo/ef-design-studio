/** Cria object URLs para os binários de um pacote e permite liberá-los depois. */

const MIME_BY_EXT: Record<string, string> = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
}

export type PackageResources = {
  /** caminho no pacote → object URL */
  urls: Record<string, string>
  revoke: () => void
}

export function createResourceUrls(binaries: Record<string, ArrayBuffer>): PackageResources {
  const urls: Record<string, string> = {}
  for (const [path, bytes] of Object.entries(binaries)) {
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
    const blob = new Blob([bytes], { type: MIME_BY_EXT[ext] ?? 'application/octet-stream' })
    urls[path] = URL.createObjectURL(blob)
  }
  return {
    urls,
    revoke: () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url)
    },
  }
}
