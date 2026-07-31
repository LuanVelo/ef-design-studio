import { useEffect, useState } from 'react'
import { Badge } from '@components/Badge'
import { Modal } from '@components/Modal'
import { PillButton } from '@components/PillButton'
import { useObjectUrl } from '@components/useObjectUrl'
import type { TemplateRecord } from '@data/types'
import {
  analyzeEftpl,
  saveImportedTemplate,
  type ImportAnalysis,
  type ImportMode,
} from './import-service'

type ImportTemplateDialogProps = {
  /** Arquivo .eftpl escolhido (picker ou drop). null = dialog fechado. */
  file: File | null
  ownerUserId: string
  onClose: () => void
  onImported: (template: TemplateRecord) => void
}

type Stage =
  | { kind: 'analisando' }
  | { kind: 'resultado'; analysis: ImportAnalysis }
  | { kind: 'gravando'; analysis: ImportAnalysis }
  | { kind: 'falha'; message: string }

/**
 * Fluxo de importação (RF-G1): validar → preview (metadados, formatos,
 * erros/warnings) → confirmar → gravar com status `novo`.
 * Conflito de id oferece "nova versão" / "importar como cópia".
 */
export function ImportTemplateDialog({
  file,
  ownerUserId,
  onClose,
  onImported,
}: ImportTemplateDialogProps) {
  const [stage, setStage] = useState<Stage>({ kind: 'analisando' })
  const [mode, setMode] = useState<ImportMode>('nova')

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setStage({ kind: 'analisando' })
    setMode('nova')
    void (async () => {
      try {
        const analysis = await analyzeEftpl(await file.arrayBuffer(), ownerUserId)
        if (cancelled) return
        setStage({ kind: 'resultado', analysis })
        if (analysis.conflict) {
          setMode(analysis.conflict.sameVersionInstalled ? 'copia' : 'nova-versao')
        }
      } catch (err) {
        if (!cancelled) setStage({ kind: 'falha', message: (err as Error).message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [file, ownerUserId])

  async function confirm(analysis: ImportAnalysis) {
    setStage({ kind: 'gravando', analysis })
    try {
      const template = await saveImportedTemplate(analysis, ownerUserId, mode)
      onImported(template)
    } catch (err) {
      setStage({ kind: 'falha', message: (err as Error).message })
    }
  }

  return (
    <Modal open={file !== null} onClose={onClose} title="Importar template" maxWidth="max-w-2xl">
      {stage.kind === 'analisando' ? (
        <p className="py-8 text-center text-sm text-ink-muted">Validando o pacote…</p>
      ) : null}

      {stage.kind === 'falha' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-red-700">{stage.message}</p>
          <div className="flex justify-end">
            <PillButton variant="ghost" onClick={onClose}>
              Fechar
            </PillButton>
          </div>
        </div>
      ) : null}

      {stage.kind === 'resultado' || stage.kind === 'gravando' ? (
        <ResultView
          analysis={stage.analysis}
          fileName={file?.name ?? ''}
          mode={mode}
          onModeChange={setMode}
          saving={stage.kind === 'gravando'}
          onCancel={onClose}
          onConfirm={() => void confirm(stage.analysis)}
        />
      ) : null}
    </Modal>
  )
}

function ResultView({
  analysis,
  fileName,
  mode,
  onModeChange,
  saving,
  onCancel,
  onConfirm,
}: {
  analysis: ImportAnalysis
  fileName: string
  mode: ImportMode
  onModeChange: (mode: ImportMode) => void
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { validation, conflict } = analysis
  const manifest = validation.manifest
  const thumbUrl = useObjectUrl(validation.binaries['thumbnail.png'])

  if (!validation.ok || !manifest) {
    return (
      <div className="flex flex-col gap-4" data-testid="import-errors">
        <p className="text-sm">
          O pacote <span className="font-medium">{fileName}</span> não pode ser importado:
        </p>
        <ul className="flex flex-col gap-2">
          {validation.errors.map((issue, i) => (
            <li
              key={`${issue.code}-${i}`}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span className="text-meta mr-2 font-semibold text-red-500">{issue.code}</span>
              {issue.message}
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <PillButton variant="ghost" onClick={onCancel}>
            Fechar
          </PillButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5" data-testid="import-preview">
      <div className="flex gap-5">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Thumbnail de ${manifest.name}`}
            className="h-40 w-32 shrink-0 rounded-xl border border-hairline object-cover"
          />
        ) : null}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight">{manifest.name}</h3>
            <Badge kind={manifest.category} />
            <span className="text-meta text-ink-muted">v{manifest.version}</span>
          </div>
          {manifest.description ? (
            <p className="text-sm text-ink-muted">{manifest.description}</p>
          ) : null}
          <p className="text-meta text-ink-muted uppercase">
            {manifest.id}
            {manifest.author ? ` · por ${manifest.author}` : ''}
          </p>
          {manifest.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {manifest.tags.map((tag) => (
                <span key={tag} className="text-meta rounded-full bg-ink/5 px-2 py-0.5 text-ink-muted">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <h4 className="text-meta mb-2 font-semibold text-ink-muted uppercase">Formatos</h4>
        <ul className="flex flex-wrap gap-2">
          {manifest.formats.map((f) => (
            <li key={f.key} className="rounded-full border border-hairline px-3 py-1 text-xs">
              {f.key} · {f.width}×{f.height}
              {f.pages === 'multi' ? ` · ${f.minPages ?? 2}–${f.maxPages ?? 10} págs` : ''}
            </li>
          ))}
        </ul>
      </div>

      {validation.warnings.length > 0 ? (
        <ul className="flex flex-col gap-2" data-testid="import-warnings">
          {validation.warnings.map((issue, i) => (
            <li
              key={`${issue.code}-${i}`}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900"
            >
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      {conflict ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4"
          data-testid="import-conflict"
        >
          <p className="text-sm">
            Você já tem <span className="font-medium">{conflict.latest.name}</span> (v
            {conflict.latest.version}) com este id. Como importar?
          </p>
          <label className={`flex items-start gap-2 text-sm ${conflict.sameVersionInstalled ? 'opacity-40' : 'cursor-pointer'}`}>
            <input
              type="radio"
              name="import-mode"
              className="mt-0.5 accent-ink"
              checked={mode === 'nova-versao'}
              disabled={conflict.sameVersionInstalled}
              onChange={() => onModeChange('nova-versao')}
            />
            <span>
              <span className="font-medium">Nova versão</span> — mantém o template e adiciona a v
              {manifest.version} ao histórico.
              {conflict.sameVersionInstalled ? (
                <span className="block text-xs text-ink-muted">
                  Indisponível: a v{manifest.version} já está instalada.
                </span>
              ) : null}
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="import-mode"
              className="mt-0.5 accent-ink"
              checked={mode === 'copia'}
              onChange={() => onModeChange('copia')}
            />
            <span>
              <span className="font-medium">Importar como cópia</span> — cria um template
              independente, sem afetar o existente.
            </span>
          </label>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <PillButton variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </PillButton>
        <PillButton onClick={onConfirm} disabled={saving} data-testid="import-confirm">
          {saving ? 'Importando…' : 'Importar template'}
        </PillButton>
      </div>
    </div>
  )
}
