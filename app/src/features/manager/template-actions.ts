import { saveFile } from '@data/fs-adapter'
import { projectsRepo, templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import { compareSemver } from './template-meta'

export async function archiveTemplate(id: string): Promise<TemplateRecord> {
  return templatesRepo.update(id, { status: 'arquivado' })
}

export async function unarchiveTemplate(id: string): Promise<TemplateRecord> {
  return templatesRepo.update(id, { status: 'ativo' })
}

export type DeleteBlock = {
  blocked: true
  /** Projetos (não excluídos) que apontam para este template */
  projectCount: number
}

/**
 * Exclusão definitiva (RF-G3): bloqueada quando há projetos vinculados —
 * neste caso retorna o bloqueio para a UI oferecer arquivar.
 */
export async function deleteTemplate(
  record: TemplateRecord,
): Promise<DeleteBlock | { blocked: false }> {
  const linked = await projectsRepo.listByTemplate(record.ownerUserId, record.id)
  const activeLinks = linked.filter((p) => p.status !== 'lixeira')
  if (activeLinks.length > 0) {
    return { blocked: true, projectCount: activeLinks.length }
  }
  await templatesRepo.remove(record.id)
  return { blocked: false }
}

/** Exporta o pacote original .eftpl (RF-G5) via fs-adapter. */
export async function exportTemplate(record: TemplateRecord): Promise<boolean> {
  if (!record.packageBytes) throw new Error('Este registro não tem o pacote armazenado.')
  const blob = new Blob([record.packageBytes], {
    type: record.packageMime ?? 'application/zip',
  })
  return saveFile(blob, `${record.manifestId}-v${record.version}.eftpl`, {
    accept: { 'application/zip': ['.eftpl'] },
    description: 'Pacote de template (.eftpl)',
  })
}

/** Gera um manifestId livre para cópia/duplicação: <id>-copia, <id>-copia-2, ... */
export async function nextCopyManifestId(ownerUserId: string, baseId: string): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? `${baseId}-copia` : `${baseId}-copia-${n}`
    const existing = await templatesRepo.listByManifestId(ownerUserId, candidate)
    if (existing.length === 0) return candidate
  }
}

/** Duplica o template (RF-G7): novo manifestId derivado, origem marcada, status novo. */
export async function duplicateTemplate(record: TemplateRecord): Promise<TemplateRecord> {
  const manifestId = await nextCopyManifestId(record.ownerUserId, record.manifestId)
  return templatesRepo.create({
    ownerUserId: record.ownerUserId,
    manifestId,
    name: `${record.name} (cópia)`,
    category: record.category,
    version: record.version,
    status: 'novo',
    usageCount: 0,
    description: record.description,
    tags: record.tags,
    manifest: record.manifest,
    copiedFrom: record.manifestId,
    packageBytes: record.packageBytes,
    packageMime: record.packageMime,
    thumbnailBytes: record.thumbnailBytes,
    thumbnailMime: record.thumbnailMime,
  })
}

/**
 * Versão mais nova disponível que a do registro dado (RF-G4).
 * Projetos seguem apontando para a versão original; a UI usa isto para o
 * aviso "versão mais nova disponível".
 */
export async function newerVersionOf(record: TemplateRecord): Promise<TemplateRecord | null> {
  const versions = await templatesRepo.listByManifestId(record.ownerUserId, record.manifestId)
  const newer = versions
    .filter((v) => compareSemver(v.version, record.version) > 0)
    .sort((a, b) => compareSemver(b.version, a.version))
  return newer[0] ?? null
}
