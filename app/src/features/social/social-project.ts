import { projectsRepo, templatesRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import { nowIso } from '@data/repository'

/**
 * Dados do projeto social persistidos em ProjectRecord.data.
 * O conteúdo dos slots entra na F3.2; aqui vive a estrutura do wizard.
 */
export type SocialProjectData = {
  schemaVersion: 1
  kind: 'social'
  /** Formatos escolhidos na etapa 2 (keys do manifest do template) */
  formatKeys: string[]
  /** Etapa atual do wizard (1–4) para retomada */
  step: number
}

export function emptySocialData(): SocialProjectData {
  return { schemaVersion: 1, kind: 'social', formatKeys: [], step: 2 }
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
