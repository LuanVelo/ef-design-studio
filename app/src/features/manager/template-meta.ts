import type { TemplateRecord } from '@data/types'

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

/** Data em caps pequenas com tracking largo (padrão R5): "31 JUL 2026" */
export function formatDateCaps(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Janela de recência (badge/filtro "recente"), em dias */
export const RECENTE_JANELA_DIAS = 7

/** true quando o template ainda conta como "recente" (usado dentro da janela) */
export function isRecent(template: TemplateRecord, now = Date.now()): boolean {
  if (!template.lastUsedAt) return false
  return now - Date.parse(template.lastUsedAt) < RECENTE_JANELA_DIAS * 24 * 60 * 60 * 1000
}
