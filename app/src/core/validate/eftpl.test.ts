import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'
import { validateEftpl } from './eftpl'

const eftplPath = resolve(process.cwd(), '../templates/dist/ef-slides-editorial-01.eftpl')
const realBytes = readFileSync(eftplPath)

/** Gera uma cópia do pacote real com uma mutação aplicada */
async function patched(mutate: (zip: JSZip) => void | Promise<void>): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(realBytes)
  await mutate(zip)
  return zip.generateAsync({ type: 'uint8array' })
}

async function layoutOf(zip: JSZip): Promise<string> {
  return zip.file('layouts/slide-16x9.html')!.async('string')
}

function codes(issues: { code: string }[]): string[] {
  return issues.map((i) => i.code)
}

describe('validateEftpl — pacote real', () => {
  it('aceita o ef-slides-editorial-01 sem erros', async () => {
    const result = await validateEftpl(realBytes)
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.manifest?.id).toBe('ef-slides-editorial-01')
    expect(result.layouts['slide-16x9']).toContain('data-slot')
    expect(result.layouts['slide-16x9']).not.toContain('<script')
    expect(result.binaries['thumbnail.png']).toBeInstanceOf(ArrayBuffer)
    expect(result.binaries['fonts/roboto-var.woff2']).toBeInstanceOf(ArrayBuffer)
    expect(result.styles['styles/base.css']).toContain('--cor-texto')
    expect(result.readme).toContain('#')
  })
})

describe('validateEftpl — pacotes quebrados', () => {
  it('rejeita arquivo que não é zip', async () => {
    const result = await validateEftpl(new Uint8Array([1, 2, 3, 4]))
    expect(codes(result.errors)).toContain('PACOTE_INVALIDO')
  })

  it('manifest ausente', async () => {
    const bytes = await patched((zip) => void zip.remove('manifest.json'))
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('MANIFEST_AUSENTE')
  })

  it('manifest com JSON quebrado', async () => {
    const bytes = await patched((zip) => void zip.file('manifest.json', '{ quebrado'))
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('MANIFEST_JSON_INVALIDO')
  })

  it('manifest inválido pelo schema (categoria inexistente)', async () => {
    const bytes = await patched(async (zip) => {
      const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
      manifest.category = 'banner'
      zip.file('manifest.json', JSON.stringify(manifest))
    })
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('MANIFEST_INVALIDO')
    expect(result.errors[0].message).toMatch(/manifest\.json inválido/)
  })

  it('layout declarado mas ausente', async () => {
    const bytes = await patched((zip) => void zip.remove('layouts/slide-16x9.html'))
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('LAYOUT_AUSENTE')
    expect(result.errors.find((e) => e.code === 'LAYOUT_AUSENTE')?.message).toContain('slide-16x9')
  })

  it('thumbnail ausente', async () => {
    const bytes = await patched((zip) => void zip.remove('thumbnail.png'))
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('THUMBNAIL_AUSENTE')
  })

  it('README ausente', async () => {
    const bytes = await patched((zip) => void zip.remove('README.md'))
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('README_AUSENTE')
  })

  it('fonte declarada mas ausente', async () => {
    const bytes = await patched((zip) => void zip.remove('fonts/roboto-var.woff2'))
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('FONTE_AUSENTE')
  })

  it('layout com <script>', async () => {
    const bytes = await patched(async (zip) => {
      const html = await layoutOf(zip)
      zip.file('layouts/slide-16x9.html', html.replace('</body>', '<script>alert(1)</script></body>'))
    })
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('SCRIPT_PROIBIDO')
    // sanitização remove o script mesmo assim
    expect(result.layouts['slide-16x9']).not.toContain('<script')
  })

  it('layout com handler on*', async () => {
    const bytes = await patched(async (zip) => {
      const html = await layoutOf(zip)
      zip.file('layouts/slide-16x9.html', html.replace('<body', '<body onload="x()"'))
    })
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('HANDLER_PROIBIDO')
  })

  it('layout com URL externa', async () => {
    const bytes = await patched(async (zip) => {
      const html = await layoutOf(zip)
      zip.file(
        'layouts/slide-16x9.html',
        html.replace('</body>', '<img src="https://evil.com/x.png"></body>'),
      )
    })
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('URL_EXTERNA_PROIBIDA')
  })

  it('CSS com URL externa', async () => {
    const bytes = await patched(async (zip) => {
      const css = await zip.file('styles/base.css')!.async('string')
      zip.file('styles/base.css', css + '\n.x { background: url(https://evil.com/bg.png); }')
    })
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('URL_EXTERNA_PROIBIDA')
  })

  it('data-slot no HTML não declarado no manifest = warning (não bloqueia)', async () => {
    const bytes = await patched(async (zip) => {
      const html = await layoutOf(zip)
      zip.file('layouts/slide-16x9.html', html.replace('</body>', '<div data-slot="fantasma"></div></body>'))
    })
    const result = await validateEftpl(bytes)
    expect(result.ok).toBe(true)
    expect(codes(result.warnings)).toContain('SLOT_NAO_DECLARADO')
  })

  it('slot declarado que não aparece em nenhum layout = erro', async () => {
    const bytes = await patched(async (zip) => {
      const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
      manifest.slots.push({ key: 'sumido', type: 'text', label: 'Sumido' })
      zip.file('manifest.json', JSON.stringify(manifest))
    })
    const result = await validateEftpl(bytes)
    expect(codes(result.errors)).toContain('SLOT_FALTANDO_NO_LAYOUT')
    expect(result.errors.find((e) => e.code === 'SLOT_FALTANDO_NO_LAYOUT')?.message).toContain('sumido')
  })

  it('slot especial page-number não gera warning', async () => {
    const bytes = await patched(async (zip) => {
      const html = await layoutOf(zip)
      zip.file('layouts/slide-16x9.html', html.replace('</body>', '<div data-slot="page-number"></div></body>'))
    })
    const result = await validateEftpl(bytes)
    expect(codes(result.warnings)).not.toContain('SLOT_NAO_DECLARADO')
  })
})
