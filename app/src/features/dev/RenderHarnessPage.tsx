import { useEffect, useRef, useState } from 'react'
import {
  captureElement,
  createResourceUrls,
  TemplateRenderer,
  type RenderContent,
} from '@core/render'
import { validateEftpl, type EftplValidationResult } from '@core/validate/eftpl'
import { PillButton } from '@components/PillButton'

/**
 * Harness de desenvolvimento do motor de render (F1.3).
 * Carrega o fixture ef-slides-editorial-01, renderiza cada variant e
 * mede a captura @1x/@2x. Sem link na navegação — acessar /dev/render.
 */

const SAMPLE_CONTENT: RenderContent = {
  values: {
    titulo: 'Institucional',
    menu: ['Visão', 'Escopo', 'Equipe'],
    destaque: 'Um parágrafo de <b>destaque</b> para apresentar a seção com clareza.',
    'texto-1':
      'Primeira coluna de texto corrido, com conteúdo suficiente para avaliar o ritmo tipográfico do template.',
    'texto-2':
      'Segunda coluna de texto, mantendo o tom editorial e as margens generosas do layout original.',
    'texto-3': 'Terceira coluna, usada apenas na variação de três colunas.',
    'destaque-grande':
      'Uma frase grande que resume a ideia central do slide em <b>quarenta e oito pixels</b>.',
    'titulo-grande': 'Proposta<br>Comercial',
  },
}

/** Imagem de teste gerada em runtime (gradiente com marcações) */
function makeTestImage(): string {
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 900
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 1200, 900)
  grad.addColorStop(0, '#DF8F3E')
  grad.addColorStop(1, '#4E96A8')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1200, 900)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 6
  ctx.strokeRect(40, 40, 1120, 820)
  ctx.fillStyle = '#fff'
  ctx.font = '700 80px sans-serif'
  ctx.fillText('IMG 1200×900', 80, 470)
  return c.toDataURL('image/png')
}

export function RenderHarnessPage() {
  const [validation, setValidation] = useState<EftplValidationResult | null>(null)
  const [resourceUrls, setResourceUrls] = useState<Record<string, string>>({})
  const [variant, setVariant] = useState<string>('duas-colunas-img-direita')
  const [capture, setCapture] = useState<{ url: string; ms: number; ratio: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const [testImage] = useState(makeTestImage)

  useEffect(() => {
    let revoke: (() => void) | undefined
    void (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}fixtures/ef-slides-editorial-01.eftpl`)
        const bytes = await res.arrayBuffer()
        const result = await validateEftpl(bytes)
        setValidation(result)
        if (result.ok) {
          const resources = createResourceUrls(result.binaries)
          revoke = resources.revoke
          setResourceUrls(resources.urls)
        }
      } catch (err) {
        setError((err as Error).message)
      }
    })()
    return () => revoke?.()
  }, [])

  if (error) return <p className="p-8 text-sm text-red-700">Erro: {error}</p>
  if (!validation) return <p className="p-8 text-sm text-ink-muted">Carregando fixture…</p>
  if (!validation.ok || !validation.manifest) {
    return (
      <pre className="p-8 text-xs">{JSON.stringify(validation.errors, null, 2)}</pre>
    )
  }

  const manifest = validation.manifest
  const format = manifest.formats[0]
  const variantSlot = manifest.slots.find((s) => s.type === 'variant')
  const options = variantSlot?.type === 'variant' ? variantSlot.options : []

  async function doCapture(ratio: 1 | 2) {
    if (!rootRef.current) return
    const { blob, durationMs } = await captureElement(rootRef.current, {
      pixelRatio: ratio,
      width: format.width,
      height: format.height,
    })
    setCapture({ url: URL.createObjectURL(blob), ms: Math.round(durationMs), ratio })
  }

  return (
    <div className="flex flex-col gap-4 p-6" data-testid="render-harness">
      <h1 className="text-xl font-bold">Harness do motor de render — {manifest.name}</h1>

      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setVariant(opt)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ${
              variant === opt ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="max-w-4xl rounded-(--radius-card) border border-hairline bg-white p-2 shadow-(--shadow-soft)">
        <TemplateRenderer
          manifest={manifest}
          layoutHtml={validation.layouts[format.key]}
          styles={validation.styles}
          resourceUrls={resourceUrls}
          width={format.width}
          height={format.height}
          content={{ ...SAMPLE_CONTENT, variant, images: { imagem: testImage } }}
          onRootReady={(root) => {
            rootRef.current = root
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <PillButton onClick={() => void doCapture(1)}>Capturar @1x</PillButton>
        <PillButton onClick={() => void doCapture(2)}>Capturar @2x</PillButton>
        {capture ? (
          <span className="text-sm text-ink-muted" data-testid="capture-info">
            @{capture.ratio}x em {capture.ms}ms
          </span>
        ) : null}
      </div>

      {capture ? (
        <img
          src={capture.url}
          alt={`Captura @${capture.ratio}x`}
          className="max-w-2xl rounded-lg border border-hairline"
          data-testid="capture-img"
        />
      ) : null}
    </div>
  )
}
