import { templatesRepo } from '@data/repositories'
import { analyzeEftpl, saveImportedTemplate } from './import-service'

/** Pacotes que acompanham o app em `public/fixtures/`. */
export const FIXTURE_IDS = [
  'ef-social-editorial-01',
  'ef-social-basico',
  'ef-slides-editorial-01',
  'ef-pdf-basico',
] as const

/**
 * Instala os pacotes de exemplo no primeiro acesso de um perfil que ainda não
 * tem nenhum template.
 *
 * Existe porque os dados do app vivem em IndexedDB, que é por navegador: sem
 * isto, cada navegador começa vazio e obriga a reimportar tudo na mão só para
 * testar. Só roda em desenvolvimento — no build de produção o usuário importa
 * os próprios pacotes (RF-G1).
 *
 * Nunca sobrescreve nada: se o perfil já tem qualquer template, não faz nada.
 */
export async function seedFixtureTemplates(ownerUserId: string): Promise<number> {
  if (!import.meta.env.DEV) return 0
  const existing = await templatesRepo.listByOwner(ownerUserId)
  if (existing.length > 0) return 0

  let instalados = 0
  for (const id of FIXTURE_IDS) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}fixtures/${id}.eftpl`)
      if (!res.ok) continue
      const analysis = await analyzeEftpl(await res.arrayBuffer(), ownerUserId)
      if (!analysis.validation.ok) continue
      await saveImportedTemplate(analysis, ownerUserId)
      instalados++
    } catch {
      // um fixture ausente ou inválido não pode impedir a entrada no app
    }
  }
  return instalados
}
