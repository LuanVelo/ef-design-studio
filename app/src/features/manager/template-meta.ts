import type { TemplateRecord } from '@data/types'

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

/** Data em caps pequenas com tracking largo (padrão R5): "31 JUL 2026" */
export function formatDateCaps(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** true quando o template ainda conta como "recente" (usado nos últimos 7 dias) */
export function isRecent(template: TemplateRecord): boolean {
  if (!template.lastUsedAt) return false
  return Date.now() - Date.parse(template.lastUsedAt) < 7 * 24 * 60 * 60 * 1000
}
