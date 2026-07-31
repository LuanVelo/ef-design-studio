/** Compressão de imagem do usuário (RF-S: máx 2560px no lado maior, WebP). */

export const MAX_IMAGE_SIDE = 2560
export const WEBP_QUALITY = 0.85

export async function compressImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível para processar a imagem.')
    ctx.drawImage(bitmap, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY)
    // Navegador sem encoder webp devolve png — aceitável como fallback
    return dataUrl
  } finally {
    bitmap.close()
  }
}
