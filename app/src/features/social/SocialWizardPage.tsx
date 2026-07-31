import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@components/Badge'
import { Card } from '@components/Card'
import { PillButton } from '@components/PillButton'
import { useDevice } from '@components/useDevice'
import { useObjectUrl } from '@components/useObjectUrl'
import { useSession } from '@auth/session'
import { createResourceUrls } from '@core/render'
import { validateEftpl, type EftplValidationResult } from '@core/validate/eftpl'
import { nowIso } from '@data/repository'
import { projectsRepo, templatesRepo } from '@data/repositories'
import type { ProjectRecord, TemplateRecord } from '@data/types'
import { newerVersionOf } from '@features/manager/template-actions'
import { TemplateSelectorModal } from '@features/manager/TemplateSelectorModal'
import { SocialContentStep } from './SocialContentStep'
import { saveSocialProject, socialDataOf, type SocialProjectData } from './social-project'

const STEPS = [
  { n: 1, label: 'Template' },
  { n: 2, label: 'Formatos' },
  { n: 3, label: 'Conteúdo' },
  { n: 4, label: 'Exportar' },
]

/** Wizard social (RF-S1): linear com navegação livre entre etapas, autosave contínuo. */
export function SocialWizardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useSession((s) => s.user)
  const [project, setProject] = useState<ProjectRecord | null | 'nao-encontrado'>(null)
  const [template, setTemplate] = useState<TemplateRecord | null>(null)
  const [newerVersion, setNewerVersion] = useState<TemplateRecord | null>(null)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [validation, setValidation] = useState<EftplValidationResult | null>(null)
  const [resourceUrls, setResourceUrls] = useState<Record<string, string>>({})
  const device = useDevice()
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<ProjectRecord | null>(null)

  // Flush do autosave pendente ao sair da página
  useEffect(
    () => () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
      if (pendingRef.current) void saveSocialProject(pendingRef.current, {})
    },
    [],
  )

  useEffect(() => {
    if (!projectId || !user) return
    void (async () => {
      const rec = await projectsRepo.get(projectId)
      if (!rec || rec.ownerUserId !== user.id) {
        setProject('nao-encontrado')
        return
      }
      setProject(rec)
      const tpl = await templatesRepo.get(rec.templateId)
      setTemplate(tpl ?? null)
      setNewerVersion(tpl ? await newerVersionOf(tpl) : null)
    })()
  }, [projectId, user])

  // Abre o pacote para o preview da etapa 3 (motor único de render)
  useEffect(() => {
    if (!template?.packageBytes) return
    let revoke: (() => void) | undefined
    void (async () => {
      const result = await validateEftpl(template.packageBytes!)
      setValidation(result)
      if (result.ok) {
        const resources = createResourceUrls(result.binaries)
        revoke = resources.revoke
        setResourceUrls(resources.urls)
      }
    })()
    return () => revoke?.()
  }, [template])

  // Autosave (RF-S2): estado atualiza na hora; persistência com debounce curto
  function save(
    patch: Partial<SocialProjectData>,
    meta: { name?: string; templateId?: string } = {},
  ) {
    if (!project || project === 'nao-encontrado') return
    const optimistic: ProjectRecord = {
      ...project,
      ...meta,
      data: { ...socialDataOf(project), ...patch },
    }
    setProject(optimistic)
    pendingRef.current = optimistic
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      pendingRef.current = null
      void saveSocialProject(optimistic, {}, meta).then((saved) => setSavedAt(saved.updatedAt))
    }, 400)
  }

  if (!user) return null
  if (project === 'nao-encontrado') {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-ink-muted">Projeto não encontrado.</p>
        <Link to="/social" className="text-sm font-medium underline">
          Voltar para Meus projetos
        </Link>
      </div>
    )
  }
  if (!project) {
    return <p className="py-24 text-center text-sm text-ink-muted">Carregando projeto…</p>
  }

  const data = socialDataOf(project)
  const step = data.step

  return (
    <div className="flex flex-col gap-6 pt-6" data-testid="social-wizard">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/social" className="text-meta text-ink-muted uppercase hover:text-ink">
          ← Meus projetos
        </Link>
        {savedAt ? (
          <span className="text-meta ml-auto text-ink-muted" data-testid="autosave-indicator">
            Salvo automaticamente ·{' '}
            {new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
      </div>

      <input
        value={nameDraft ?? project.name}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => {
          if (nameDraft !== null && nameDraft.trim() && nameDraft !== project.name) {
            void save({}, { name: nameDraft.trim() })
          }
          setNameDraft(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        aria-label="Nome do projeto"
        className="w-full max-w-lg rounded-xl border border-transparent bg-transparent px-1 py-0.5 text-2xl font-bold tracking-tight outline-none hover:border-ink/10 focus:border-ink/30"
      />

      {/* Stepper com navegação livre */}
      <nav className="flex flex-wrap items-center gap-1" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1">
            {i > 0 ? <span className="mx-1 h-px w-5 bg-ink/15" /> : null}
            <button
              type="button"
              onClick={() => void save({ step: s.n })}
              aria-current={step === s.n ? 'step' : undefined}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                step === s.n ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
              }`}
            >
              {s.n}. {s.label}
            </button>
          </div>
        ))}
      </nav>

      {step === 1 ? (
        <StepTemplate
          template={template}
          newerVersion={newerVersion}
          onSwap={() => setSelectorOpen(true)}
          onNext={() => void save({ step: 2 })}
        />
      ) : null}

      {step === 2 ? (
        <StepFormats
          template={template}
          formatKeys={data.formatKeys}
          onToggle={(key) =>
            void save({
              formatKeys: data.formatKeys.includes(key)
                ? data.formatKeys.filter((k) => k !== key)
                : [...data.formatKeys, key],
            })
          }
          onBack={() => void save({ step: 1 })}
          onNext={() => void save({ step: 3 })}
        />
      ) : null}

      {step === 3 ? (
        template?.manifest && validation?.ok ? (
          <SocialContentStep
            template={template}
            validation={validation}
            resourceUrls={resourceUrls}
            data={data}
            onChange={(patch) => save(patch)}
            device={device}
            onBack={() => save({ step: 2 })}
            onNext={() => save({ step: 4 })}
          />
        ) : (
          <p className="py-12 text-center text-sm text-ink-muted">Abrindo o template…</p>
        )
      ) : null}

      {step === 4 ? (
        <Card bordered className="flex flex-col gap-3 p-6">
          <h2 className="text-lg font-semibold tracking-tight">Exportar</h2>
          <p className="text-sm text-ink-muted">O export PNG/JPG/zip chega na etapa F3.3.</p>
          <PillButton variant="ghost" onClick={() => void save({ step: 3 })}>
            ← Conteúdo
          </PillButton>
        </Card>
      ) : null}

      <TemplateSelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        category="social"
        onSelect={(t) => {
          setSelectorOpen(false)
          setTemplate(t)
          setNewerVersion(null)
          // trocar template zera formatos (podem não existir no novo) e marca uso
          void templatesRepo.update(t.id, {
            lastUsedAt: nowIso(),
            usageCount: t.usageCount + 1,
          })
          void save({ formatKeys: [] }, { templateId: t.id })
          void newerVersionOf(t).then(setNewerVersion)
        }}
      />
    </div>
  )
}

function StepTemplate({
  template,
  newerVersion,
  onSwap,
  onNext,
}: {
  template: TemplateRecord | null
  newerVersion: TemplateRecord | null
  onSwap: () => void
  onNext: () => void
}) {
  const thumbUrl = useObjectUrl(template?.thumbnailBytes, template?.thumbnailMime)
  return (
    <Card bordered className="flex flex-col gap-4 p-6" data-testid="step-template">
      <h2 className="text-lg font-semibold tracking-tight">Template escolhido</h2>
      {template ? (
        <div className="flex flex-wrap items-center gap-4">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={`Thumbnail de ${template.name}`}
              className="h-28 w-24 rounded-xl border border-hairline object-cover"
            />
          ) : null}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{template.name}</span>
              <Badge kind={template.category} />
              <span className="text-meta text-ink-muted">v{template.version}</span>
            </div>
            {newerVersion ? (
              <span
                className="text-meta w-fit rounded-full bg-retro-amarelo px-2.5 py-1 text-ink"
                data-testid="newer-version-warning"
              >
                Versão mais nova disponível (v{newerVersion.version})
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-red-700">
          O template deste projeto foi removido — escolha outro para continuar.
        </p>
      )}
      <div className="flex gap-2">
        <PillButton variant="ghost" onClick={onSwap}>
          Trocar template
        </PillButton>
        {template ? <PillButton onClick={onNext}>Formatos →</PillButton> : null}
      </div>
    </Card>
  )
}

function StepFormats({
  template,
  formatKeys,
  onToggle,
  onBack,
  onNext,
}: {
  template: TemplateRecord | null
  formatKeys: string[]
  onToggle: (key: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const formats = template?.manifest?.formats ?? []
  return (
    <Card bordered className="flex flex-col gap-4 p-6" data-testid="step-formats">
      <h2 className="text-lg font-semibold tracking-tight">Formatos da peça</h2>
      <p className="text-sm text-ink-muted">
        Uma peça, múltiplas saídas — selecione todos os formatos que quiser exportar.
      </p>
      <div className="flex flex-wrap gap-2">
        {formats.map((f) => {
          const selected = formatKeys.includes(f.key)
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onToggle(f.key)}
              aria-pressed={selected}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selected ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
              }`}
            >
              {f.key} · {f.width}×{f.height}
              {f.pages === 'multi' ? ` · ${f.minPages ?? 2}–${f.maxPages ?? 10} págs` : ''}
            </button>
          )
        })}
      </div>
      {formatKeys.length === 0 ? (
        <p className="text-sm text-ink-muted">Selecione pelo menos um formato para continuar.</p>
      ) : null}
      <div className="flex gap-2">
        <PillButton variant="ghost" onClick={onBack}>
          ← Template
        </PillButton>
        <PillButton disabled={formatKeys.length === 0} onClick={onNext}>
          Conteúdo →
        </PillButton>
      </div>
    </Card>
  )
}
