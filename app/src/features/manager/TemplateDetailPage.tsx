import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { Badge } from '@components/Badge'
import { Card } from '@components/Card'
import { Modal } from '@components/Modal'
import { PillButton } from '@components/PillButton'
import { useDevice } from '@components/useDevice'
import { useSession } from '@auth/session'
import {
  createResourceUrls,
  makeTestImage,
  sampleContentFor,
  TemplateRenderer,
  type RenderContent,
} from '@core/render'
import { validateEftpl, type EftplValidationResult } from '@core/validate/eftpl'
import { templatesRepo } from '@data/repositories'
import type { TemplateRecord } from '@data/types'
import {
  archiveTemplate,
  deleteTemplate,
  duplicateTemplate,
  exportTemplate,
  unarchiveTemplate,
} from './template-actions'
import { compareSemver, formatDateCaps, isRecent } from './template-meta'

/**
 * Detalhe do template (RF-G2): preview navegável de formatos/variants com o
 * motor de render, README renderizado, metadados e histórico de versões.
 */
export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useSession((s) => s.user)
  const navigate = useNavigate()
  const [record, setRecord] = useState<TemplateRecord | null | 'nao-encontrado'>(null)
  const [versions, setVersions] = useState<TemplateRecord[]>([])
  const [validation, setValidation] = useState<EftplValidationResult | null>(null)
  const [resourceUrls, setResourceUrls] = useState<Record<string, string>>({})
  const [formatKey, setFormatKey] = useState<string | null>(null)
  const [variant, setVariant] = useState<string | null>(null)
  const [testImage] = useState(makeTestImage)
  const device = useDevice()
  const readOnly = device === 'celular'
  // Exclusão: fluxo com confirmação dupla; 'bloqueada' quando há projetos vinculados
  const [deleteStage, setDeleteStage] = useState<
    null | { kind: 'confirmar-1' } | { kind: 'confirmar-2' } | { kind: 'bloqueada'; projectCount: number }
  >(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Carrega o registro + histórico de versões do mesmo manifestId
  useEffect(() => {
    if (!id || !user) return
    void (async () => {
      const rec = await templatesRepo.get(id)
      if (!rec || rec.ownerUserId !== user.id) {
        setRecord('nao-encontrado')
        return
      }
      setRecord(rec)
      const all = await templatesRepo.listByManifestId(user.id, rec.manifestId)
      setVersions(all.sort((a, b) => compareSemver(b.version, a.version)))
    })()
  }, [id, user])

  // Abre o pacote da versão exibida (motor único: mesmo validador da importação)
  useEffect(() => {
    if (!record || record === 'nao-encontrado' || !record.packageBytes) return
    let revoke: (() => void) | undefined
    void (async () => {
      const result = await validateEftpl(record.packageBytes!)
      setValidation(result)
      if (result.ok) {
        const resources = createResourceUrls(result.binaries)
        revoke = resources.revoke
        setResourceUrls(resources.urls)
      }
    })()
    return () => revoke?.()
  }, [record])

  const manifest = validation?.ok ? validation.manifest : undefined
  const sampleValues = useMemo(() => (manifest ? sampleContentFor(manifest) : {}), [manifest])
  const readmeHtml = useMemo(() => {
    if (!validation?.readme) return null
    return DOMPurify.sanitize(marked.parse(validation.readme, { async: false }))
  }, [validation])

  if (!user) return null
  if (record === 'nao-encontrado') {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-ink-muted">Template não encontrado.</p>
        <Link to="/templates" className="text-sm font-medium underline">
          Voltar para o gerenciador
        </Link>
      </div>
    )
  }
  if (!record || !validation) {
    return <p className="py-24 text-center text-sm text-ink-muted">Carregando template…</p>
  }
  if (!manifest) {
    return (
      <p className="py-24 text-center text-sm text-red-700">
        O pacote armazenado não pôde ser aberto — reimporte o template.
      </p>
    )
  }

  const format = manifest.formats.find((f) => f.key === formatKey) ?? manifest.formats[0]
  const variantSlot = manifest.slots.find((s) => s.type === 'variant')
  const variantOptions = variantSlot?.type === 'variant' ? variantSlot.options : []
  const activeVariant =
    variant ?? (variantSlot?.type === 'variant' ? (variantSlot.default ?? null) : null)
  const imageSlots = manifest.slots.filter((s) => s.type === 'image')
  const content: RenderContent = {
    values: sampleValues,
    variant: activeVariant ?? undefined,
    images: Object.fromEntries(imageSlots.map((s) => [s.key, testImage])),
    pageNumber: 1,
  }

  return (
    <div className="flex flex-col gap-6 pt-6" data-testid="template-detail">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/templates"
          className="text-meta text-ink-muted uppercase hover:text-ink"
          aria-label="Voltar para o gerenciador"
        >
          ← Templates
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{record.name}</h1>
        <Badge kind={record.category} />
        {record.status === 'novo' ? <Badge kind="novo" /> : null}
        {record.status === 'arquivado' ? <Badge kind="arquivado" /> : null}
        {record.status !== 'arquivado' && isRecent(record) ? <Badge kind="recente" /> : null}
        <span className="text-meta text-ink-muted">v{record.version}</span>
      </div>

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-2" data-testid="template-actions">
          <PillButton
            variant="ghost"
            onClick={() => {
              void (async () => {
                try {
                  const updated =
                    record.status === 'arquivado'
                      ? await unarchiveTemplate(record.id)
                      : await archiveTemplate(record.id)
                  setRecord(updated)
                } catch (err) {
                  setActionError((err as Error).message)
                }
              })()
            }}
          >
            {record.status === 'arquivado' ? 'Desarquivar' : 'Arquivar'}
          </PillButton>
          <PillButton
            variant="ghost"
            onClick={() => {
              void exportTemplate(record).catch((err: Error) => setActionError(err.message))
            }}
          >
            Exportar .eftpl
          </PillButton>
          <PillButton
            variant="ghost"
            onClick={() => {
              void duplicateTemplate(record)
                .then((copy) => navigate(`/templates/${copy.id}`))
                .catch((err: Error) => setActionError(err.message))
            }}
          >
            Duplicar
          </PillButton>
          <PillButton
            variant="ghost"
            className="!border-red-200 !text-red-700 hover:!bg-red-50"
            onClick={() => setDeleteStage({ kind: 'confirmar-1' })}
          >
            Excluir
          </PillButton>
          {actionError ? (
            <span className="text-sm text-red-700" role="alert">
              {actionError}
            </span>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Preview */}
        <Card bordered className="flex flex-col gap-4 p-5">
          {manifest.formats.length > 1 ? (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Formatos">
              {manifest.formats.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormatKey(f.key)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    format.key === f.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
                  }`}
                >
                  {f.key}
                </button>
              ))}
            </div>
          ) : null}
          {variantOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Variações">
              {variantOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setVariant(opt)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeVariant === opt
                      ? 'bg-accent-slides text-white'
                      : 'bg-ink/5 text-ink hover:bg-ink/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-hairline bg-white">
            <TemplateRenderer
              key={`${record.id}-${format.key}`}
              manifest={manifest}
              layoutHtml={validation.layouts[format.key]}
              styles={validation.styles}
              resourceUrls={resourceUrls}
              width={format.width}
              height={format.height}
              content={content}
            />
          </div>
          <p className="text-meta text-ink-muted uppercase">
            {format.key} · {format.width}×{format.height}
            {format.pages === 'multi'
              ? ` · ${format.minPages ?? 2}–${format.maxPages ?? 10} páginas`
              : ''}
            {' · conteúdo de amostra'}
          </p>
        </Card>

        {/* Metadados + versões */}
        <div className="flex flex-col gap-4">
          <Card bordered className="flex flex-col gap-3 p-5">
            <h2 className="text-meta font-semibold text-ink-muted uppercase">Metadados</h2>
            {record.description ? <p className="text-sm">{record.description}</p> : null}
            <dl className="flex flex-col gap-1.5 text-sm">
              <MetaRow label="ID">{record.manifestId}</MetaRow>
              {manifest.author ? <MetaRow label="Autor">{manifest.author}</MetaRow> : null}
              <MetaRow label="Importado">{formatDateCaps(record.createdAt)}</MetaRow>
              <MetaRow label="Uso">
                {record.usageCount > 0 ? `${record.usageCount}×` : 'nunca usado'}
              </MetaRow>
              {record.copiedFrom ? <MetaRow label="Cópia de">{record.copiedFrom}</MetaRow> : null}
            </dl>
            {(record.tags ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {(record.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="text-meta rounded-full bg-ink/5 px-2 py-0.5 text-ink-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </Card>

          <Card bordered className="flex flex-col gap-2 p-5" data-testid="version-history">
            <h2 className="text-meta font-semibold text-ink-muted uppercase">Versões</h2>
            <ul className="flex flex-col gap-1">
              {versions.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (v.id !== record.id) navigate(`/templates/${v.id}`)
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      v.id === record.id ? 'bg-ink/5 font-semibold' : 'hover:bg-ink/5'
                    }`}
                  >
                    <span>v{v.version}</span>
                    <span className="text-meta text-ink-muted uppercase">
                      {formatDateCaps(v.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {readmeHtml ? (
        <Card bordered className="p-6">
          <h2 className="text-meta mb-4 font-semibold text-ink-muted uppercase">Documentação</h2>
          <div
            data-testid="readme"
            className="text-sm leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-ink/5 [&_code]:px-1 [&_code]:text-[0.85em] [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-hairline [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-hairline [&_th]:bg-surface [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left"
            // README sanitizado com DOMPurify acima
            dangerouslySetInnerHTML={{ __html: readmeHtml }}
          />
        </Card>
      ) : null}

      <Modal
        open={deleteStage !== null}
        onClose={() => setDeleteStage(null)}
        title="Excluir template"
        maxWidth="max-w-md"
      >
        {deleteStage?.kind === 'confirmar-1' ? (
          <div className="flex flex-col gap-4" data-testid="delete-step-1">
            <p className="text-sm">
              Excluir <span className="font-semibold">{record.name}</span> (v{record.version})
              definitivamente? O pacote será removido do seu navegador.
            </p>
            <div className="flex justify-end gap-2">
              <PillButton variant="ghost" onClick={() => setDeleteStage(null)}>
                Cancelar
              </PillButton>
              <PillButton onClick={() => setDeleteStage({ kind: 'confirmar-2' })}>
                Continuar
              </PillButton>
            </div>
          </div>
        ) : null}
        {deleteStage?.kind === 'confirmar-2' ? (
          <div className="flex flex-col gap-4" data-testid="delete-step-2">
            <p className="text-sm">
              Esta ação <span className="font-semibold">não pode ser desfeita</span>. Confirmar a
              exclusão definitiva?
            </p>
            <div className="flex justify-end gap-2">
              <PillButton variant="ghost" onClick={() => setDeleteStage(null)}>
                Cancelar
              </PillButton>
              <PillButton
                className="!bg-red-700 hover:!bg-red-800"
                onClick={() => {
                  void (async () => {
                    try {
                      const result = await deleteTemplate(record)
                      if (result.blocked) {
                        setDeleteStage({ kind: 'bloqueada', projectCount: result.projectCount })
                      } else {
                        navigate('/templates')
                      }
                    } catch (err) {
                      setActionError((err as Error).message)
                      setDeleteStage(null)
                    }
                  })()
                }}
              >
                Excluir definitivamente
              </PillButton>
            </div>
          </div>
        ) : null}
        {deleteStage?.kind === 'bloqueada' ? (
          <div className="flex flex-col gap-4" data-testid="delete-blocked">
            <p className="text-sm">
              Este template não pode ser excluído: {deleteStage.projectCount}{' '}
              {deleteStage.projectCount === 1 ? 'projeto usa' : 'projetos usam'} ele. Você pode
              arquivá-lo — ele some do gerenciador, mas os projetos continuam funcionando.
            </p>
            <div className="flex justify-end gap-2">
              <PillButton variant="ghost" onClick={() => setDeleteStage(null)}>
                Cancelar
              </PillButton>
              <PillButton
                onClick={() => {
                  void archiveTemplate(record.id).then((updated) => {
                    setRecord(updated)
                    setDeleteStage(null)
                  })
                }}
              >
                Arquivar template
              </PillButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-meta shrink-0 text-ink-muted uppercase">{label}</dt>
      <dd className="truncate text-right">{children}</dd>
    </div>
  )
}
