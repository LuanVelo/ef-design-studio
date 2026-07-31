import { useState } from 'react'
import { Modal } from '@components/Modal'
import { PillButton } from '@components/PillButton'
import type { EftplValidationResult } from '@core/validate/eftpl'
import { saveFile } from '@data/fs-adapter'
import { exportsRepo, projectsRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import {
  exportSlidesProject,
  type SlidesExportOptions,
  type SlidesExportResult,
} from '@export/slides-export'
import type { SlidesProjectData } from './slides-project'

/** Export F4.3: PDF composto @2x ou PNGs em zip; registra histórico e finaliza. */
export function SlidesExportDialog({
  open,
  onClose,
  project,
  template,
  validation,
  resourceUrls,
  data,
  onFinalized,
}: {
  open: boolean
  onClose: () => void
  project: ProjectRecord
  template: TemplateRecord
  validation: EftplValidationResult
  resourceUrls: Record<string, string>
  data: SlidesProjectData
  onFinalized: (project: ProjectRecord) => void
}) {
  const [options, setOptions] = useState<SlidesExportOptions>({ fileType: 'pdf', pixelRatio: 2 })
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<SlidesExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pageCount = data.slides?.length ?? 0

  async function run() {
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: pageCount })
    try {
      const exported = await exportSlidesProject({
        projectName: project.name,
        data,
        manifest: template.manifest!,
        validation,
        resourceUrls,
        options,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      setResult(exported)
      await saveFile(exported.blob, exported.fileName, {
        accept:
          options.fileType === 'pdf'
            ? { 'application/pdf': ['.pdf'] }
            : { 'application/zip': ['.zip'] },
        description: options.fileType === 'pdf' ? 'Apresentação (.pdf)' : 'Páginas (.zip)',
      })
      await exportsRepo.create({
        ownerUserId: project.ownerUserId,
        projectId: project.id,
        formatKey: data.formatKey,
        fileType: options.fileType === 'pdf' ? 'pdf' : 'zip',
        fileCount: exported.pageCount,
      })
      onFinalized(await projectsRepo.update(project.id, { status: 'finalizado' }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setProgress(null)
    }
  }

  const chip = (selected: boolean) =>
    `cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
      selected ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
    }`

  return (
    <Modal open={open} onClose={onClose} title="Exportar apresentação" maxWidth="max-w-md">
      <div className="flex flex-col gap-4" data-testid="slides-export">
        <div className="flex gap-1">
          <button
            type="button"
            className={chip(options.fileType === 'pdf')}
            onClick={() => setOptions({ fileType: 'pdf', pixelRatio: 2 })}
          >
            PDF · @2x
          </button>
          <button
            type="button"
            className={chip(options.fileType === 'png')}
            onClick={() => setOptions((o) => ({ ...o, fileType: 'png' }))}
          >
            PNGs (.zip)
          </button>
        </div>
        {options.fileType === 'png' ? (
          <div className="flex gap-1">
            {([1, 2] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={chip(options.pixelRatio === r)}
                onClick={() => setOptions((o) => ({ ...o, pixelRatio: r }))}
              >
                @{r}x
              </button>
            ))}
          </div>
        ) : null}
        <p className="text-sm text-ink-muted">
          {pageCount} {pageCount === 1 ? 'página' : 'páginas'} em {data.formatKey}.
        </p>
        <div className="flex justify-end gap-2">
          <PillButton variant="ghost" onClick={onClose} disabled={progress !== null}>
            Fechar
          </PillButton>
          <PillButton
            onClick={() => void run()}
            disabled={progress !== null || pageCount === 0}
            data-testid="slides-export-run"
          >
            {progress ? `Exportando ${progress.done}/${progress.total}…` : 'Exportar'}
          </PillButton>
        </div>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {result ? (
          <p className="text-sm" data-testid="slides-export-result">
            ✅ {result.fileName} · {result.pageCount} páginas em {(result.totalMs / 1000).toFixed(1)}s
            (pior página {Math.round(result.slowestMs)}ms) — projeto finalizado.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
