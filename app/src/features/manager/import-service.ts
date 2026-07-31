import { validateEftpl, type EftplValidationResult } from '@core/validate/eftpl'
import { templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import { nextCopyManifestId } from './template-actions'
import { compareSemver } from './template-meta'

export { compareSemver }

export type ImportConflict = {
  /** Versões já instaladas com o mesmo manifestId, mais recente primeiro */
  versions: TemplateRecord[]
  latest: TemplateRecord
  /** A versão exata do pacote já está instalada */
  sameVersionInstalled: boolean
}

export type ImportAnalysis = {
  bytes: ArrayBuffer
  validation: EftplValidationResult
  conflict: ImportConflict | null
}

/** Modo de gravação quando há conflito de id: nova versão ou cópia independente. */
export type ImportMode = 'nova' | 'nova-versao' | 'copia'

/** Valida o pacote e detecta conflito de id com templates já instalados do usuário. */
export async function analyzeEftpl(
  bytes: ArrayBuffer,
  ownerUserId: string,
): Promise<ImportAnalysis> {
  const validation = await validateEftpl(bytes)
  let conflict: ImportConflict | null = null
  if (validation.ok && validation.manifest) {
    const manifest = validation.manifest
    const versions = (await templatesRepo.listByManifestId(ownerUserId, manifest.id)).sort(
      (a, b) => compareSemver(b.version, a.version),
    )
    if (versions.length > 0) {
      conflict = {
        versions,
        latest: versions[0],
        sameVersionInstalled: versions.some((v) => v.version === manifest.version),
      }
    }
  }
  return { bytes, validation, conflict }
}

/**
 * Grava o template importado com status `novo` (RF-G1).
 * `nova-versao` mantém o manifestId (novo registro = nova versão);
 * `copia` recebe manifestId derivado e marca a origem.
 */
export async function saveImportedTemplate(
  analysis: ImportAnalysis,
  ownerUserId: string,
  mode: ImportMode = 'nova',
): Promise<TemplateRecord> {
  const { validation, bytes, conflict } = analysis
  if (!validation.ok || !validation.manifest) {
    throw new Error('Pacote inválido — corrija os erros antes de importar.')
  }
  const manifest = validation.manifest
  if (mode !== 'copia' && conflict?.sameVersionInstalled) {
    throw new Error(
      `A versão ${manifest.version} de "${manifest.id}" já está instalada. Importe como cópia ou gere uma versão maior.`,
    )
  }

  let manifestId = manifest.id
  let copiedFrom: string | undefined
  if (mode === 'copia') {
    copiedFrom = manifest.id
    manifestId = await nextCopyManifestId(ownerUserId, manifest.id)
  }

  return templatesRepo.create({
    ownerUserId,
    manifestId,
    name: manifest.name,
    category: manifest.category,
    version: manifest.version,
    status: 'novo',
    usageCount: 0,
    description: manifest.description,
    tags: manifest.tags,
    manifest,
    copiedFrom,
    packageBytes: bytes,
    packageMime: 'application/zip',
    thumbnailBytes: validation.binaries['thumbnail.png'],
    thumbnailMime: 'image/png',
  })
}
