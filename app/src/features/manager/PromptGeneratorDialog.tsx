import { useMemo, useState } from 'react'
import { Modal } from '@components/Modal'
import { PillButton } from '@components/PillButton'
import { CANONICAL_FORMATS, type TemplateCategory } from '@core/schemas'
import { buildTemplatePrompt, CANONICAL_TAGS } from './prompt-generator'

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'social', label: 'Social' },
  { value: 'slides', label: 'Slides' },
  { value: 'pdf', label: 'PDF' },
]

/**
 * Gerador de prompt para IA (RF-G6): formulário → prompt com a spec .eftpl
 * embutida → copiar. O usuário cola numa IA e importa o pacote resultante.
 */
export function PromptGeneratorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('social')
  const [formatKeys, setFormatKeys] = useState<string[]>([])
  const [designDescription, setDesignDescription] = useState('')
  const [slotsDescription, setSlotsDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [prompt, setPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const categoryFormats = useMemo(
    () => CANONICAL_FORMATS.filter((f) => f.category === category),
    [category],
  )
  const canGenerate = name.trim().length > 0 && formatKeys.length > 0

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  async function copyPrompt() {
    if (!prompt) return
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const chipClass = (selected: boolean) =>
    `cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      selected ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
    }`

  return (
    <Modal open={open} onClose={onClose} title="Gerar template com IA" maxWidth="max-w-3xl">
      {prompt === null ? (
        <div className="flex flex-col gap-5" data-testid="prompt-form">
          <p className="text-sm text-ink-muted">
            Descreva o template desejado. O app monta um prompt com a especificação técnica do
            pacote <code className="rounded bg-ink/5 px-1">.eftpl</code> — cole numa IA (ex.:
            Claude) e importe o arquivo que ela gerar.
          </p>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Nome do template</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex.: Lançamento Verão"
              className="rounded-xl border border-ink/15 bg-card px-3 py-2 text-sm outline-none focus:border-ink/40"
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Categoria</span>
            <div className="flex gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={chipClass(category === c.value)}
                  onClick={() => {
                    setCategory(c.value)
                    setFormatKeys([])
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Formatos</span>
            <div className="flex flex-wrap gap-1">
              {categoryFormats.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={chipClass(formatKeys.includes(f.key))}
                  onClick={() => setFormatKeys((keys) => toggle(keys, f.key))}
                >
                  {f.key} · {f.width}×{f.height}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Descrição do design</span>
            <textarea
              value={designDescription}
              onChange={(e) => setDesignDescription(e.target.value)}
              rows={3}
              placeholder="Direção visual, cores, referências, personalidade…"
              className="resize-y rounded-xl border border-ink/15 bg-card px-3 py-2 text-sm outline-none focus:border-ink/40"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Conteúdo editável (slots)</span>
            <textarea
              value={slotsDescription}
              onChange={(e) => setSlotsDescription(e.target.value)}
              rows={2}
              placeholder="ex.: título curto, subtítulo, imagem de destaque, lista de benefícios…"
              className="resize-y rounded-xl border border-ink/15 bg-card px-3 py-2 text-sm outline-none focus:border-ink/40"
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              Tags <span className="font-normal text-ink-muted">(opcional)</span>
            </span>
            {Object.entries(CANONICAL_TAGS).map(([group, groupTags]) => (
              <div key={group} className="flex flex-wrap items-center gap-1">
                <span className="text-meta w-12 text-ink-muted uppercase">{group}</span>
                {groupTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={chipClass(tags.includes(tag))}
                    onClick={() => setTags((t) => toggle(t, tag))}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <PillButton variant="ghost" onClick={onClose}>
              Cancelar
            </PillButton>
            <PillButton
              disabled={!canGenerate}
              onClick={() =>
                setPrompt(
                  buildTemplatePrompt({
                    name: name.trim(),
                    category,
                    formatKeys,
                    designDescription,
                    slotsDescription,
                    tags,
                  }),
                )
              }
              data-testid="generate-prompt"
            >
              Gerar prompt
            </PillButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="prompt-result">
          <p className="text-sm text-ink-muted">
            Copie o prompt abaixo, cole numa IA e depois importe o <code>.eftpl</code> gerado na
            tela de templates.
          </p>
          <textarea
            readOnly
            value={prompt}
            rows={14}
            className="resize-y rounded-xl border border-ink/15 bg-surface px-3 py-2 font-mono text-xs leading-relaxed outline-none"
          />
          <div className="flex justify-end gap-2">
            <PillButton variant="ghost" onClick={() => setPrompt(null)}>
              Voltar
            </PillButton>
            <PillButton onClick={() => void copyPrompt()} data-testid="copy-prompt">
              {copied ? 'Copiado ✓' : 'Copiar prompt'}
            </PillButton>
          </div>
        </div>
      )}
    </Modal>
  )
}
