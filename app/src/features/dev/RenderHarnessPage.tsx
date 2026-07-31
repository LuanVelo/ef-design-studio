import { useEffect, useMemo, useRef, useState } from 'react'
import {
  captureElement,
  createResourceUrls,
  makeTestImage,
  sampleContentFor,
  TemplateRenderer,
  type RenderContent,
} from '@core/render'
import { validateEftpl, type EftplValidationResult } from '@core/validate/eftpl'
import { PillButton } from '@components/PillButton'

/**
 * Harness de desenvolvimento do motor de render (F1.3/F1.4).
 * Acessar /dev/render?pkg=<id> — ids disponíveis em public/fixtures/:
 * ef-slides-editorial-01 (default) · ef-social-basico · ef-pdf-basico
 */

export function RenderHarnessPage() {
  const pkg =
    new URLSearchParams(window.location.search).get('pkg') ?? 'ef-slides-editorial-01'
  const [validation, setValidation] = useState<EftplValidationResult | null>(null)
  const [resourceUrls, setResourceUrls] = useState<Record<string, string>>({})
  const [formatKey, setFormatKey] = useState<string | null>(null)
  const [variant, setVariant] = useState<string | null>(null)
  const [capture, setCapture] = useState<{ url: string; ms: number; ratio: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const [testImage] = useState(makeTestImage)

  useEffect(() => {
    let revoke: (() => void) | undefined
    void (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}fixtures/${pkg}.eftpl`)
        if (!res.ok) throw new Error(`Fixture "${pkg}" não encontrado (${res.status})`)
        const result = await validateEftpl(await res.arrayBuffer())
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
  }, [pkg])

  const manifest = validation?.ok ? validation.manifest : undefined
  const sampleValues = useMemo(
    () => (manifest ? sampleContentFor(manifest) : {}),
    [manifest],
  )

  if (error) return <p className="p-8 text-sm text-red-700">Erro: {error}</p>
  if (!validation) return <p className="p-8 text-sm text-ink-muted">Carregando fixture…</p>
  if (!validation.ok || !manifest) {
    return <pre className="p-8 text-xs">{JSON.stringify(validation.errors, null, 2)}</pre>
  }

  const format = manifest.formats.find((f) => f.key === formatKey) ?? manifest.formats[0]
  const variantSlot = manifest.slots.find((s) => s.type === 'variant')
  const options = variantSlot?.type === 'variant' ? variantSlot.options : []
  const imageSlots = manifest.slots.filter((s) => s.type === 'image')
  const content: RenderContent = {
    values: sampleValues,
    variant: variant ?? undefined,
    images: Object.fromEntries(imageSlots.map((s) => [s.key, testImage])),
    pageNumber: 1,
  }

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
      <h1 className="text-xl font-bold">
        Harness do motor — {manifest.name}{' '}
        <span className="text-sm font-normal text-ink-muted">({pkg})</span>
      </h1>

      {manifest.formats.length > 1 ? (
        <div className="flex flex-wrap gap-1">
          {manifest.formats.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFormatKey(f.key)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ${
                format.key === f.key ? 'bg-accent-slides text-white' : 'bg-ink/5 hover:bg-ink/10'
              }`}
            >
              {f.key} ({f.width}×{f.height})
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setVariant(opt)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ${
              (variant ?? (variantSlot?.type === 'variant' && variantSlot.default)) === opt
                ? 'bg-ink text-white'
                : 'bg-ink/5 text-ink hover:bg-ink/10'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="max-w-4xl rounded-(--radius-card) border border-hairline bg-white p-2 shadow-(--shadow-soft)">
        <TemplateRenderer
          key={`${pkg}-${format.key}`}
          manifest={manifest}
          layoutHtml={validation.layouts[format.key]}
          styles={validation.styles}
          resourceUrls={resourceUrls}
          width={format.width}
          height={format.height}
          content={content}
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
