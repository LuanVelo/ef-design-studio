import type { SlotValue } from '@core/schemas'
import { projectsRepo, templatesRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import { nowIso } from '@data/repository'

/** Conteúdo de um slide: variant + valores por slot + imagens (dataURL). */
export type SlideContent = {
  variant?: string
  values: Record<string, SlotValue>
  images: Record<string, string>
}

export function emptySlide(): SlideContent {
  return { values: {}, images: {} }
}

/** Item de conteúdo importado que não casou com nenhum slot do template. */
export type UnmappedItem = {
  /** Índice do slide de origem no documento importado */
  slideIndex: number
  key: string
  value: SlotValue
}

export type SlidesProjectData = {
  schemaVersion: 1
  kind: 'slides'
  /** Formato único escolhido na entrada (slide-16x9, pdf-a4-portrait, …) */
  formatKey: string
  /** null = conteúdo ainda não definido (mostrar tela de entrada) */
  slides: SlideContent[] | null
  /** Cores editáveis do template (globais à apresentação) */
  colors: Record<string, string>
  /** Painel "Conteúdo não mapeado" (drag manual para slots) */
  unmapped: UnmappedItem[]
}

export function emptySlidesData(formatKey: string): SlidesProjectData {
  return {
    schemaVersion: 1,
    kind: 'slides',
    formatKey,
    slides: null,
    colors: {},
    unmapped: [],
  }
}

export function slidesDataOf(project: ProjectRecord): SlidesProjectData {
  const data = project.data as Partial<SlidesProjectData> | undefined
  if (data?.kind === 'slides') {
    return { ...emptySlidesData(''), ...data }
  }
  return emptySlidesData('')
}

/** Cria o projeto rascunho na entrada (RF-SL2) e marca o uso do template. */
export async function createSlidesProject(
  template: TemplateRecord,
  formatKey: string,
): Promise<ProjectRecord> {
  const project = await projectsRepo.create({
    ownerUserId: template.ownerUserId,
    name: `${template.name} — ${new Date().toLocaleDateString('pt-BR')}`,
    templateId: template.id,
    status: 'rascunho',
    data: emptySlidesData(formatKey),
  })
  await templatesRepo.update(template.id, {
    lastUsedAt: nowIso(),
    usageCount: template.usageCount + 1,
  })
  return project
}

/** Autosave: aplica um patch nos dados (e opcionalmente o nome) do projeto. */
export async function saveSlidesProject(
  project: ProjectRecord,
  patch: Partial<SlidesProjectData>,
  meta: { name?: string } = {},
): Promise<ProjectRecord> {
  const data: SlidesProjectData = { ...slidesDataOf(project), ...patch }
  return projectsRepo.update(project.id, { data, ...meta })
}

/** Lista "Meus projetos" do fluxo slides/pdf (fora da lixeira), mais recente primeiro. */
export async function listSlidesProjects(ownerUserId: string): Promise<ProjectRecord[]> {
  const all = await projectsRepo.listByOwner(ownerUserId)
  return all
    .filter(
      (p) =>
        p.status !== 'lixeira' &&
        (p.data as Partial<SlidesProjectData> | undefined)?.kind === 'slides',
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
