import type { SlotValue, TemplateManifest } from '@core/schemas'

/**
 * Conteúdo de amostra gerado dos slots do manifest — usado no harness de dev
 * e no preview do detalhe do template (funciona para qualquer template).
 */
export function sampleContentFor(manifest: TemplateManifest): Record<string, SlotValue> {
  const values: Record<string, SlotValue> = {}
  const lorem =
    'Texto de exemplo para avaliar o ritmo tipográfico do template, com conteúdo suficiente para ocupar o espaço reservado do slot. '
  for (const slot of manifest.slots) {
    if (slot.type === 'text') {
      const label = slot.label.split('(')[0].trim()
      values[slot.key] = (slot.maxChars ?? 60) < 45 ? label : `${label} de exemplo`
    } else if (slot.type === 'richtext') {
      const target = Math.min(slot.maxChars ?? 200, 320)
      let text = ''
      while (text.length < target * 0.6) text += lorem
      values[slot.key] = `<b>Exemplo.</b> ${text.slice(0, target - 12)}`
    } else if (slot.type === 'list') {
      values[slot.key] = ['Primeiro item', 'Segundo item', 'Terceiro item'].slice(
        0,
        slot.maxItems ?? 3,
      )
    }
  }
  return values
}

/** Imagem de teste gerada em runtime (gradiente com marcações) */
export function makeTestImage(): string {
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 900
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 1200, 900)
  grad.addColorStop(0, '#DF8F3E')
  grad.addColorStop(1, '#4E96A8')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1200, 900)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 6
  ctx.strokeRect(40, 40, 1120, 820)
  ctx.fillStyle = '#fff'
  ctx.font = '700 80px sans-serif'
  ctx.fillText('IMG 1200×900', 80, 470)
  return c.toDataURL('image/png')
}
