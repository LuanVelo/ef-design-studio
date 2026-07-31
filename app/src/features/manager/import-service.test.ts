import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'
import { db } from '@data/db'
import { templatesRepo } from '@data/repositories'
import { analyzeEftpl, compareSemver, saveImportedTemplate } from './import-service'

const distDir = resolve(process.cwd(), '../templates/dist')
const OWNER = 'user-1'

function loadFixture(name: string): ArrayBuffer {
  const buf = readFileSync(resolve(distDir, name))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

/** Reempacota o fixture com a versão do manifest alterada (para testar nova versão). */
async function withVersion(bytes: ArrayBuffer, version: string): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(new Uint8Array(bytes))
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
  manifest.version = version
  zip.file('manifest.json', JSON.stringify(manifest))
  return zip.generateAsync({ type: 'arraybuffer' })
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('compareSemver', () => {
  it('ordena por major/minor/patch numericamente', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0)
    expect(compareSemver('1.2.0', '1.10.0')).toBeLessThan(0)
    expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0)
  })
})

describe('F2.1 — importação de .eftpl', () => {
  it('importa o fixture social: registro com status novo, manifest e bytes', async () => {
    const analysis = await analyzeEftpl(loadFixture('ef-social-basico.eftpl'), OWNER)
    expect(analysis.validation.errors, JSON.stringify(analysis.validation.errors)).toEqual([])
    expect(analysis.conflict).toBeNull()

    const record = await saveImportedTemplate(analysis, OWNER)
    expect(record).toMatchObject({
      ownerUserId: OWNER,
      manifestId: 'ef-social-basico',
      category: 'social',
      status: 'novo',
      usageCount: 0,
    })
    expect(record.manifest?.formats.length).toBeGreaterThan(0)
    expect(record.packageBytes?.byteLength).toBeGreaterThan(0)
    expect(record.thumbnailBytes?.byteLength).toBeGreaterThan(0)

    const loaded = await templatesRepo.get(record.id)
    expect(loaded?.manifest?.id).toBe('ef-social-basico')
  })

  it('os 3 fixtures importam com sucesso (aceite)', async () => {
    for (const file of [
      'ef-social-basico.eftpl',
      'ef-slides-editorial-01.eftpl',
      'ef-pdf-basico.eftpl',
    ]) {
      const analysis = await analyzeEftpl(loadFixture(file), OWNER)
      expect(analysis.validation.ok, file).toBe(true)
      await saveImportedTemplate(analysis, OWNER)
    }
    expect(await templatesRepo.listByOwner(OWNER)).toHaveLength(3)
  })

  it('pacote corrompido retorna erro específico e não grava', async () => {
    const analysis = await analyzeEftpl(new TextEncoder().encode('nao é zip').buffer, OWNER)
    expect(analysis.validation.ok).toBe(false)
    expect(analysis.validation.errors[0].code).toBe('PACOTE_INVALIDO')
    await expect(saveImportedTemplate(analysis, OWNER)).rejects.toThrow(/inválido/)
    expect(await templatesRepo.listByOwner(OWNER)).toHaveLength(0)
  })

  it('detecta conflito de id e sinaliza versão idêntica já instalada', async () => {
    const bytes = loadFixture('ef-social-basico.eftpl')
    await saveImportedTemplate(await analyzeEftpl(bytes, OWNER), OWNER)

    const again = await analyzeEftpl(bytes, OWNER)
    expect(again.conflict).not.toBeNull()
    expect(again.conflict!.sameVersionInstalled).toBe(true)
    await expect(saveImportedTemplate(again, OWNER, 'nova-versao')).rejects.toThrow(
      /já está instalada/,
    )
  })

  it('conflito não vaza entre usuários (isolamento por ownerUserId)', async () => {
    const bytes = loadFixture('ef-social-basico.eftpl')
    await saveImportedTemplate(await analyzeEftpl(bytes, OWNER), OWNER)
    const other = await analyzeEftpl(bytes, 'user-2')
    expect(other.conflict).toBeNull()
  })

  it('nova versão: mesmo manifestId, duas versões no histórico', async () => {
    const v1 = loadFixture('ef-social-basico.eftpl')
    await saveImportedTemplate(await analyzeEftpl(v1, OWNER), OWNER)

    const v2 = await withVersion(v1, '1.1.0')
    const analysis = await analyzeEftpl(v2, OWNER)
    expect(analysis.conflict!.sameVersionInstalled).toBe(false)
    const record = await saveImportedTemplate(analysis, OWNER, 'nova-versao')
    expect(record.manifestId).toBe('ef-social-basico')
    expect(record.version).toBe('1.1.0')

    const versions = await templatesRepo.listByManifestId(OWNER, 'ef-social-basico')
    expect(versions.map((v) => v.version).sort()).toEqual(['1.0.0', '1.1.0'])
  })

  it('cópia: manifestId derivado único e origem marcada', async () => {
    const bytes = loadFixture('ef-social-basico.eftpl')
    await saveImportedTemplate(await analyzeEftpl(bytes, OWNER), OWNER)

    const copy1 = await saveImportedTemplate(await analyzeEftpl(bytes, OWNER), OWNER, 'copia')
    expect(copy1.manifestId).toBe('ef-social-basico-copia')
    expect(copy1.copiedFrom).toBe('ef-social-basico')

    const copy2 = await saveImportedTemplate(await analyzeEftpl(bytes, OWNER), OWNER, 'copia')
    expect(copy2.manifestId).toBe('ef-social-basico-copia-2')
  })
})
