import JSZip from 'jszip'
import DOMPurify from 'dompurify'
import { TemplateManifestSchema, type TemplateManifest } from '@core/schemas'

export type ValidationIssue = {
  code: string
  message: string
}

export type EftplValidationResult = {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  manifest?: TemplateManifest
  /** HTML sanitizado por formatKey (pronto para o motor de render) */
  layouts: Record<string, string>
  /** Conteúdo dos CSS por caminho */
  styles: Record<string, string>
  /** Bytes por caminho (thumbnail, fontes, assets) */
  binaries: Record<string, ArrayBuffer>
  readme?: string
}

/** Slot especial preenchido automaticamente pelo app em templates PDF */
const SPECIAL_SLOTS = new Set(['page-number'])

/** Tipos de slot que não aparecem como data-slot no HTML */
const NON_DOM_SLOT_TYPES = new Set(['variant', 'color'])

const EXTERNAL_URL = /https?:\/\//i

function err(code: string, message: string): ValidationIssue {
  return { code, message }
}

/**
 * Normaliza a entrada para um tipo que o JSZip reconhece em qualquer realm.
 * (ArrayBuffer criado em outro realm — ex.: Node dentro do jsdom — falha no
 * `instanceof` interno do JSZip; um Uint8Array construído aqui não.)
 */
function toZipInput(data: ArrayBuffer | Uint8Array | Blob): Uint8Array | Blob {
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  if (data instanceof Blob) return data
  return new Uint8Array(data)
}

/**
 * Valida um pacote .eftpl (zip) conforme o Contrato 1 do CLAUDE.md.
 * Retorna erros/warnings com mensagens específicas em pt-BR.
 */
export async function validateEftpl(
  data: ArrayBuffer | Uint8Array | Blob,
): Promise<EftplValidationResult> {
  const result: EftplValidationResult = {
    ok: false,
    errors: [],
    warnings: [],
    layouts: {},
    styles: {},
    binaries: {},
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(toZipInput(data))
  } catch {
    result.errors.push(
      err('PACOTE_INVALIDO', 'O arquivo não é um pacote .eftpl válido (zip corrompido ou vazio).'),
    )
    return result
  }

  // 1. manifest.json
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) {
    result.errors.push(err('MANIFEST_AUSENTE', 'O pacote não contém manifest.json na raiz.'))
    return result
  }
  let manifestRaw: unknown
  try {
    manifestRaw = JSON.parse(await manifestFile.async('string'))
  } catch {
    result.errors.push(err('MANIFEST_JSON_INVALIDO', 'manifest.json não é um JSON válido.'))
    return result
  }
  const parsed = TemplateManifestSchema.safeParse(manifestRaw)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.length ? ` (campo: ${issue.path.join('.')})` : ''
      result.errors.push(err('MANIFEST_INVALIDO', `manifest.json inválido: ${issue.message}${path}`))
    }
    return result
  }
  const manifest = parsed.data
  result.manifest = manifest

  // 2. Arquivos obrigatórios
  const readmeFile = zip.file('README.md')
  if (!readmeFile) {
    result.errors.push(err('README_AUSENTE', 'O pacote não contém README.md (documentação obrigatória).'))
  } else {
    result.readme = await readmeFile.async('string')
  }

  const thumbFile = zip.file('thumbnail.png')
  if (!thumbFile) {
    result.errors.push(err('THUMBNAIL_AUSENTE', 'O pacote não contém thumbnail.png.'))
  } else {
    result.binaries['thumbnail.png'] = await thumbFile.async('arraybuffer')
  }

  // 3. Layouts declarados existem
  const layoutHtml: Record<string, string> = {}
  for (const format of manifest.formats) {
    const file = zip.file(format.file)
    if (!file) {
      result.errors.push(
        err(
          'LAYOUT_AUSENTE',
          `O layout "${format.file}" declarado para o formato "${format.key}" não existe no pacote.`,
        ),
      )
      continue
    }
    layoutHtml[format.key] = await file.async('string')
  }

  // 4. Fontes declaradas existem
  for (const font of manifest.fonts) {
    const file = zip.file(font.file)
    if (!file) {
      result.errors.push(
        err('FONTE_AUSENTE', `A fonte "${font.file}" (família ${font.family}) não existe no pacote.`),
      )
    } else {
      result.binaries[font.file] = await file.async('arraybuffer')
    }
  }

  // 5. CSS do pacote (styles/*) — checar URLs externas
  const cssFiles = zip.file(/^styles\/.+\.css$/)
  for (const file of cssFiles) {
    const css = await file.async('string')
    result.styles[file.name] = css
    if (EXTERNAL_URL.test(css)) {
      result.errors.push(
        err('URL_EXTERNA_PROIBIDA', `O CSS "${file.name}" referencia URL externa (http/https) — templates devem ser autocontidos.`),
      )
    }
  }

  // 6. Assets (imagens fixas do design)
  const assetFiles = zip.file(/^assets\//)
  for (const file of assetFiles) {
    result.binaries[file.name] = await file.async('arraybuffer')
  }

  // 7. Análise dos HTML de layout
  const slotsInHtml = new Set<string>()
  for (const [formatKey, html] of Object.entries(layoutHtml)) {
    analyzeLayout(formatKey, html, result, slotsInHtml)
  }

  // 8. Cruzamento data-slot × manifest (faltante = erro; sobrando = warning)
  const declaredDomSlots = new Set<string>()
  for (const slot of manifest.slots) {
    if (NON_DOM_SLOT_TYPES.has(slot.type)) continue
    if (slot.type === 'page-group') {
      for (const inner of slot.slots) {
        if (!NON_DOM_SLOT_TYPES.has(inner.type)) declaredDomSlots.add(inner.key)
      }
      continue
    }
    declaredDomSlots.add(slot.key)
  }
  if (Object.keys(layoutHtml).length > 0) {
    for (const key of declaredDomSlots) {
      if (!slotsInHtml.has(key)) {
        result.errors.push(
          err('SLOT_FALTANDO_NO_LAYOUT', `O slot "${key}" está declarado no manifest mas não aparece em nenhum layout (data-slot).`),
        )
      }
    }
  }
  for (const key of slotsInHtml) {
    if (!declaredDomSlots.has(key) && !SPECIAL_SLOTS.has(key)) {
      result.warnings.push(
        err('SLOT_NAO_DECLARADO', `O layout usa data-slot="${key}" que não está declarado no manifest — será ignorado.`),
      )
    }
  }

  result.ok = result.errors.length === 0
  return result
}

/** Analisa um layout: segurança (scripts, handlers, URLs) + coleta de data-slots + sanitização */
function analyzeLayout(
  formatKey: string,
  html: string,
  result: EftplValidationResult,
  slotsInHtml: Set<string>,
) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  if (doc.querySelector('script')) {
    result.errors.push(
      err('SCRIPT_PROIBIDO', `O layout do formato "${formatKey}" contém <script> — não permitido.`),
    )
  }

  for (const el of doc.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      const name = attr.name.toLowerCase()
      const value = attr.value
      if (name.startsWith('on')) {
        result.errors.push(
          err('HANDLER_PROIBIDO', `O layout do formato "${formatKey}" contém handler "${attr.name}" — não permitido.`),
        )
      }
      if (/^javascript:/i.test(value.trim())) {
        result.errors.push(
          err('URL_JAVASCRIPT_PROIBIDA', `O layout do formato "${formatKey}" contém URL javascript: — não permitido.`),
        )
      }
      if (['src', 'href', 'srcset', 'style'].includes(name) && EXTERNAL_URL.test(value)) {
        result.errors.push(
          err('URL_EXTERNA_PROIBIDA', `O layout do formato "${formatKey}" referencia URL externa em "${name}" — templates devem ser autocontidos.`),
        )
      }
    }
    if (el.hasAttribute('data-slot')) {
      const key = el.getAttribute('data-slot')!
      if (key) slotsInHtml.add(key)
    }
  }

  for (const styleEl of doc.querySelectorAll('style')) {
    if (EXTERNAL_URL.test(styleEl.textContent ?? '')) {
      result.errors.push(
        err('URL_EXTERNA_PROIBIDA', `O layout do formato "${formatKey}" tem <style> com URL externa — templates devem ser autocontidos.`),
      )
    }
  }

  // Sanitização (defesa em profundidade além das checagens acima)
  result.layouts[formatKey] = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta'],
    ADD_ATTR: ['data-slot'],
  })
}
