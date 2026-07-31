import type { SlotValue } from '@core/schemas'
import { projectsRepo, templatesRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import { nowIso } from '@data/repository'

/** Conteúdo de uma peça/página: valores por slot + variant + cores + imagens (dataURL). */
export type SocialContent = {
  values: Record<string, SlotValue>
  variant?: string
  colors: Record<string, string>
  images: Record<string, string>
}

export function emptyContent(): SocialContent {
  return { values: {}, colors: {}, images: {} }
}

/** Dados do projeto social persistidos em ProjectRecord.data. */
export type SocialProjectData = {
  schemaVersion: 1
  kind: 'social'
  /** Formatos escolhidos na etapa 2 (keys do manifest do template) */
  formatKeys: string[]
  /** Etapa atual do wizard (1–4) para retomada */
  step: number
  /** Conteúdo compartilhado entre todos os formatos */
  content: SocialContent
  /** Overrides por formato (campo fixado sobrescreve o compartilhado) */
  overrides: Record<string, Partial<SocialContent>>
  /** Páginas por formato multi (carousel); cada página sobrepõe o compartilhado */
  pages: Record<string, SocialContent[]>
}

export function emptySocialData(): SocialProjectData {
  return {
    schemaVersion: 1,
    kind: 'social',
    formatKeys: [],
    step: 2,
    content: emptyContent(),
    overrides: {},
    pages: {},
  }
}

/**
 * Conteúdo efetivo de um formato: compartilhado ← override do formato ← página
 * (quando multi). Merge por slot (valores individuais sobrescrevem).
 */
export function effectiveContent(
  data: SocialProjectData,
  formatKey: string,
  pageIndex?: number,
): SocialContent {
  const ov = data.overrides[formatKey] ?? {}
  const base: SocialContent = {
    values: { ...data.content.values, ...ov.values },
    variant: ov.variant ?? data.content.variant,
    colors: { ...data.content.colors, ...ov.colors },
    images: { ...data.content.images, ...ov.images },
  }
  const page = pageIndex != null ? data.pages[formatKey]?.[pageIndex] : undefined
  if (!page) return base
  return {
    values: { ...base.values, ...page.values },
    variant: page.variant ?? base.variant,
    colors: { ...base.colors, ...page.colors },
    images: { ...base.images, ...page.images },
  }
}

/** Operações do gerenciador de páginas do carousel (imutáveis). */
export function pagesOf(data: SocialProjectData, formatKey: string): SocialContent[] {
  return data.pages[formatKey] ?? []
}

export function withPages(
  data: SocialProjectData,
  formatKey: string,
  pages: SocialContent[],
): Pick<SocialProjectData, 'pages'> {
  return { pages: { ...data.pages, [formatKey]: pages } }
}

export function addPage(data: SocialProjectData, formatKey: string) {
  return withPages(data, formatKey, [...pagesOf(data, formatKey), emptyContent()])
}

export function duplicatePage(data: SocialProjectData, formatKey: string, index: number) {
  const pages = pagesOf(data, formatKey)
  const copy = structuredClone(pages[index]) ?? emptyContent()
  return withPages(data, formatKey, [...pages.slice(0, index + 1), copy, ...pages.slice(index + 1)])
}

export function removePage(data: SocialProjectData, formatKey: string, index: number) {
  const pages = pagesOf(data, formatKey)
  return withPages(data, formatKey, pages.filter((_, i) => i !== index))
}

export function movePage(data: SocialProjectData, formatKey: string, from: number, to: number) {
  const pages = [...pagesOf(data, formatKey)]
  if (from < 0 || from >= pages.length || to < 0 || to >= pages.length) {
    return withPages(data, formatKey, pages)
  }
  const [moved] = pages.splice(from, 1)
  pages.splice(to, 0, moved)
  return withPages(data, formatKey, pages)
}

export function socialDataOf(project: ProjectRecord): SocialProjectData {
  const data = project.data as Partial<SocialProjectData> | undefined
  if (data?.kind === 'social') {
    return { ...emptySocialData(), ...data }
  }
  return emptySocialData()
}

/**
 * Cria o projeto rascunho na entrada do wizard (RF-S2) e marca o 1º uso do
 * template (lastUsedAt + usageCount — alimenta badges recente e "mais usados").
 */
export async function createSocialProject(template: TemplateRecord): Promise<ProjectRecord> {
  const project = await projectsRepo.create({
    ownerUserId: template.ownerUserId,
    name: `${template.name} — ${new Date().toLocaleDateString('pt-BR')}`,
    templateId: template.id,
    status: 'rascunho',
    data: emptySocialData(),
  })
  await templatesRepo.update(template.id, {
    lastUsedAt: nowIso(),
    usageCount: template.usageCount + 1,
  })
  return project
}

/** Autosave: aplica um patch nos dados (e opcionalmente nome/template) do rascunho. */
export async function saveSocialProject(
  project: ProjectRecord,
  patch: Partial<SocialProjectData>,
  meta: { name?: string; templateId?: string } = {},
): Promise<ProjectRecord> {
  const data: SocialProjectData = { ...socialDataOf(project), ...patch }
  return projectsRepo.update(project.id, { data, ...meta })
}

/** Lista "Meus projetos" do fluxo social (fora da lixeira), mais recente primeiro. */
export async function listSocialProjects(ownerUserId: string): Promise<ProjectRecord[]> {
  const all = await projectsRepo.listByOwner(ownerUserId)
  return all
    .filter(
      (p) =>
        p.status !== 'lixeira' &&
        (p.data as Partial<SocialProjectData> | undefined)?.kind === 'social',
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** "editado há X" para os cards de projeto (padrão R4). */
export function relativeTime(iso: string, now = Date.now()): string {
  const diffMs = now - Date.parse(iso)
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}
