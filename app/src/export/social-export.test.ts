import type { TemplateManifest } from '@core/schemas'
import { emptyContent, emptySocialData } from '@features/social/social-project'
import { buildExportPlan, JPG_QUALITY, slugifyName } from './social-export'

const manifest = {
  schemaVersion: 1,
  id: 'ef-x',
  name: 'X',
  category: 'social',
  version: '1.0.0',
  tags: [],
  fonts: [],
  formats: [
    { key: 'stories', file: 'layouts/stories.html', width: 1080, height: 1920, pages: 'single' },
    {
      key: 'carousel-square',
      file: 'layouts/carousel.html',
      width: 1080,
      height: 1080,
      pages: 'multi',
      minPages: 2,
      maxPages: 10,
    },
  ],
  slots: [
    { key: 'titulo', type: 'text', label: 'Título', required: true },
  ],
} as unknown as TemplateManifest

describe('F3.3 — plano de export', () => {
  it('nomes padronizados <projeto>-<formato>[-<página>].<ext>', () => {
    const data = emptySocialData()
    data.formatKeys = ['stories', 'carousel-square']
    data.pages['carousel-square'] = [emptyContent(), emptyContent(), emptyContent()]

    const plan = buildExportPlan('Promoção de Agosto!', data, manifest, 'png')
    expect(plan.map((p) => p.fileName)).toEqual([
      'promocao-de-agosto-stories.png',
      'promocao-de-agosto-carousel-square-1.png',
      'promocao-de-agosto-carousel-square-2.png',
      'promocao-de-agosto-carousel-square-3.png',
    ])
    expect(plan[1].pageIndex).toBe(0)
  })

  it('formato desconhecido no data é ignorado; ext jpg respeitada', () => {
    const data = emptySocialData()
    data.formatKeys = ['stories', 'formato-removido']
    const plan = buildExportPlan('X', data, manifest, 'jpg')
    expect(plan).toHaveLength(1)
    expect(plan[0].fileName).toBe('x-stories.jpg')
  })

  it('decisão §12.4: qualidade JPG fixa em 90', () => {
    expect(JPG_QUALITY).toBe(0.9)
  })

  it('slugifyName remove acentos e caracteres especiais', () => {
    expect(slugifyName('Peça — çãõ é!')).toBe('peca-cao-e')
    expect(slugifyName('   ')).toBe('peca')
  })
})
