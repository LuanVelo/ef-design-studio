import type { TemplateRecord } from '@data/types'
import { compareSemver } from './import-service'
import { isRecent } from './template-meta'

/** Regra F2.2: `novo` expira para `ativo` após 14 dias ou no 1º uso */
export const NOVO_EXPIRA_DIAS = 14

export function shouldPromoteToAtivo(t: TemplateRecord, now = Date.now()): boolean {
  if (t.status !== 'novo') return false
  if (t.usageCount > 0) return true
  return now - Date.parse(t.createdAt) > NOVO_EXPIRA_DIAS * 24 * 60 * 60 * 1000
}

/** Uma entrada por manifestId: a maior versão (empate = importação mais recente). */
export function latestPerManifestId(templates: TemplateRecord[]): TemplateRecord[] {
  const byId = new Map<string, TemplateRecord>()
  for (const t of templates) {
    const current = byId.get(t.manifestId)
    if (
      !current ||
      compareSemver(t.version, current.version) > 0 ||
      (compareSemver(t.version, current.version) === 0 && t.createdAt > current.createdAt)
    ) {
      byId.set(t.manifestId, t)
    }
  }
  return [...byId.values()]
}

export type TemplateCategoryFilter = 'todas' | 'social' | 'slides' | 'pdf'
export type TemplateStatusFilter = 'todos' | 'novo' | 'recente' | 'ativo'
export type TemplateSort = 'recentes' | 'usados' | 'az' | 'importacao'

export type TemplateFilters = {
  search: string
  category: TemplateCategoryFilter
  tag: string | null
  status: TemplateStatusFilter
}

export const EMPTY_FILTERS: TemplateFilters = {
  search: '',
  category: 'todas',
  tag: null,
  status: 'todos',
}

function normalize(text: string): string {
  // NFD + remoção de diacríticos combinantes (busca insensível a acentos)
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function filterTemplates(
  templates: TemplateRecord[],
  filters: TemplateFilters,
  now = Date.now(),
): TemplateRecord[] {
  const query = normalize(filters.search.trim())
  return templates.filter((t) => {
    if (filters.category !== 'todas' && t.category !== filters.category) return false
    if (filters.tag && !(t.tags ?? []).includes(filters.tag)) return false
    if (filters.status === 'novo' && t.status !== 'novo') return false
    if (filters.status === 'ativo' && t.status !== 'ativo') return false
    if (filters.status === 'recente' && !isRecent(t, now)) return false
    if (query) {
      const haystack = normalize(`${t.name} ${t.description ?? ''} ${(t.tags ?? []).join(' ')}`)
      if (!haystack.includes(query)) return false
    }
    return true
  })
}

export function sortTemplates(templates: TemplateRecord[], sort: TemplateSort): TemplateRecord[] {
  const list = [...templates]
  switch (sort) {
    case 'recentes':
      // último uso (ou importação, se nunca usado) mais novo primeiro
      return list.sort((a, b) =>
        (b.lastUsedAt ?? b.createdAt).localeCompare(a.lastUsedAt ?? a.createdAt),
      )
    case 'usados':
      return list.sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name))
    case 'az':
      return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    case 'importacao':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

/** União de tags dos templates visíveis, ordenada, para o filtro. */
export function allTags(templates: TemplateRecord[]): string[] {
  const tags = new Set<string>()
  for (const t of templates) for (const tag of t.tags ?? []) tags.add(tag)
  return [...tags].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Seção "Recentes": usados na janela recente, mais novo primeiro. */
export function recentTemplates(
  templates: TemplateRecord[],
  limit = 4,
  now = Date.now(),
): TemplateRecord[] {
  return templates
    .filter((t) => isRecent(t, now))
    .sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''))
    .slice(0, limit)
}
