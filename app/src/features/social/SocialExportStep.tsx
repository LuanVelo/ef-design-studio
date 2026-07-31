import { useState } from 'react'
import { Card } from '@components/Card'
import { PillButton } from '@components/PillButton'
import type { EftplValidationResult } from '@core/validate/eftpl'
import { saveFile } from '@data/fs-adapter'
import { exportsRepo, projectsRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import {
  buildExportPlan,
  exportSocialProject,
  type ExportOptions,
  type SocialExportResult,
} from '@export/social-export'
import type { SocialProjectData } from './social-project'

type SocialExportStepProps = {
  project: ProjectRecord
  template: TemplateRecord
  validation: EftplValidationResult
  resourceUrls: Record<string, string>
  data: SocialProjectData
  onBack: () => void
  onFinalized: (project: ProjectRecord) => void
}

/**
 * Etapa 4 (RF-S1): export PNG/JPG @1x/@2x, todos os formatos num zip com
 * nomes padronizados; Web Share quando disponível; registra exports_history
 * e marca o projeto como finalizado. Qualidade JPG fixa em 90 (§12.4).
 */
export function SocialExportStep({
  project,
  template,
  validation,
  resourceUrls,
  data,
  onBack,
  onFinalized,
}: SocialExportStepProps) {
  const manifest = template.manifest!
  const [options, setOptions] = useState<ExportOptions>({ fileType: 'png', pixelRatio: 2 })
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<SocialExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const plan = buildExportPlan(project.name, data, manifest, options.fileType)
  const canShare =
    typeof navigator !== 'undefined' &&
    'canShare' in navigator &&
    navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })

  async function runExport() {
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: plan.length })
    try {
      const exported = await exportSocialProject({
        projectName: project.name,
        data,
        manifest,
        validation,
        resourceUrls,
        options,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      setResult(exported)
      // download: zip quando múltiplos arquivos, arquivo direto quando um só
      if (exported.zipBlob && exported.zipName) {
        await saveFile(exported.zipBlob, exported.zipName, {
          accept: { 'application/zip': ['.zip'] },
          description: 'Peças exportadas (.zip)',
        })
      } else if (exported.files.length === 1) {
        const file = exported.files[0]
        await saveFile(file.blob, file.fileName)
      }
      // histórico por formato (RF: registro em exports_history)
      const byFormat = new Map<string, number>()
      for (const f of exported.files) byFormat.set(f.formatKey, (byFormat.get(f.formatKey) ?? 0) + 1)
      for (const [formatKey, fileCount] of byFormat) {
        await exportsRepo.create({
          ownerUserId: project.ownerUserId,
          projectId: project.id,
          formatKey,
          fileType: options.fileType,
          fileCount,
        })
      }
      const finalized = await projectsRepo.update(project.id, { status: 'finalizado' })
      onFinalized(finalized)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setProgress(null)
    }
  }

  async function share() {
    if (!result) return
    const files = result.files.map(
      (f) => new File([f.blob], f.fileName, { type: options.fileType === 'jpg' ? 'image/jpeg' : 'image/png' }),
    )
    try {
      await navigator.share({ files, title: project.name })
    } catch {
      // cancelamento do usuário — sem erro
    }
  }

  const slowest = result
    ? Math.max(...result.files.map((f) => f.durationMs))
    : null

  return (
    <Card bordered className="flex flex-col gap-5 p-6" data-testid="export-step">
      <h2 className="text-lg font-semibold tracking-tight">Exportar</h2>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Tipo de arquivo</span>
        <div className="flex gap-1">
          {(['png', 'jpg'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOptions((o) => ({ ...o, fileType: t }))}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                options.fileType === t ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
              }`}
            >
              {t.toUpperCase()}
              {t === 'jpg' ? ' · qualidade 90' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Resolução</span>
        <div className="flex gap-1">
          {([1, 2] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setOptions((o) => ({ ...o, pixelRatio: r }))}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                options.pixelRatio === r ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
              }`}
            >
              @{r}x{r === 2 ? ' · recomendado' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-surface p-3 text-sm text-ink-muted">
        {plan.length === 0
          ? 'Nada para exportar — selecione formatos na etapa 2.'
          : `${plan.length} ${plan.length === 1 ? 'arquivo' : 'arquivos'}: ${plan
              .map((p) => p.fileName)
              .join(' · ')}`}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PillButton variant="ghost" onClick={onBack}>
          ← Conteúdo
        </PillButton>
        <PillButton
          disabled={plan.length === 0 || progress !== null}
          onClick={() => void runExport()}
          data-testid="export-run"
        >
          {progress
            ? `Exportando ${progress.done}/${progress.total}…`
            : plan.length > 1
              ? 'Exportar tudo (.zip)'
              : 'Exportar'}
        </PillButton>
        {result && canShare ? (
          <PillButton variant="ghost" onClick={() => void share()}>
            Compartilhar
          </PillButton>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-1 text-sm" data-testid="export-result">
          <p>
            ✅ {result.files.length} {result.files.length === 1 ? 'arquivo' : 'arquivos'} em{' '}
            {(result.totalMs / 1000).toFixed(1)}s — projeto marcado como finalizado.
          </p>
          {slowest !== null ? (
            <p className="text-meta text-ink-muted uppercase">
              peça mais lenta: {Math.round(slowest)}ms{' '}
              {options.pixelRatio === 2 ? (slowest < 5000 ? '· dentro do RNF (<5s)' : '· ACIMA do RNF!') : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
