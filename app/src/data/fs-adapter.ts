/**
 * fs-adapter — ÚNICO ponto de acesso a arquivos do app (CLAUDE.md).
 * Nenhum outro módulo pode usar showOpenFilePicker/showSaveFilePicker/download.
 * Isolado aqui para viabilizar um adapter Tauri no futuro sem reescrita.
 */

type OpenOptions = {
  /** ex.: { 'application/zip': ['.eftpl', '.efbackup'] } */
  accept?: Record<string, string[]>
  description?: string
}

type FilePickerWindow = Window & {
  showOpenFilePicker?: (opts?: {
    types?: { description?: string; accept: Record<string, string[]> }[]
    multiple?: boolean
  }) => Promise<{ getFile(): Promise<File> }[]>
  showSaveFilePicker?: (opts?: {
    suggestedName?: string
    types?: { description?: string; accept: Record<string, string[]> }[]
  }) => Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }>
}

/** Abre um arquivo via picker nativo (File System Access) com fallback para <input type=file>. */
export async function openFile(options: OpenOptions = {}): Promise<File | null> {
  const w = window as FilePickerWindow
  if (w.showOpenFilePicker) {
    try {
      const [handle] = await w.showOpenFilePicker({
        types: options.accept
          ? [{ description: options.description, accept: options.accept }]
          : undefined,
        multiple: false,
      })
      return handle ? await handle.getFile() : null
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return null
      throw err
    }
  }
  return openFileViaInput(options)
}

function openFileViaInput(options: OpenOptions): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (options.accept) input.accept = Object.values(options.accept).flat().join(',')
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/** Extrai o primeiro arquivo de um evento de drop (drag-and-drop). */
export function fileFromDrop(event: DragEvent, allowedExtensions?: string[]): File | null {
  const file = event.dataTransfer?.files?.[0] ?? null
  if (!file) return null
  if (allowedExtensions && !allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return null
  }
  return file
}

/** Salva um blob como arquivo: picker nativo quando disponível, senão download. */
export async function saveFile(
  blob: Blob,
  filename: string,
  options: OpenOptions = {},
): Promise<boolean> {
  const w = window as FilePickerWindow
  if (w.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: options.accept
          ? [{ description: options.description, accept: options.accept }]
          : undefined,
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return true
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return false
      throw err
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    return true
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
