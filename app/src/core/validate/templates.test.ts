import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { composeSrcdoc } from '@core/render/compose'
import { applyContent } from '@core/render/inject'
import { validateEftpl } from './eftpl'

const distDir = resolve(process.cwd(), '../templates/dist')

describe('templates de marca — pacotes de templates/dist', () => {
  describe('ef-social-editorial-01 (Social Editorial)', () => {
    const buffer = readFileSync(resolve(distDir, 'ef-social-editorial-01.eftpl'))

    it('valida sem erros', async () => {
      const result = await validateEftpl(buffer)
      expect(result.errors, JSON.stringify(result.errors, null, 2)).toEqual([])
      expect(result.ok).toBe(true)
      expect(result.manifest?.id).toBe('ef-social-editorial-01')
      expect(result.manifest?.category).toBe('social')
      expect(result.manifest?.formats.map((f) => f.key)).toEqual(['feed-square'])
    })

    it('injeta a manchete e aplica as cores editáveis no raiz', async () => {
      const result = await validateEftpl(buffer)
      const manifest = result.manifest!
      const srcdoc = composeSrcdoc({
        layoutHtml: result.layouts['feed-square'],
        styles: result.styles,
        resourceUrls: {},
      })
      const doc = new DOMParser().parseFromString(srcdoc, 'text/html')
      const report = applyContent(doc, manifest, {
        values: { titulo: 'Vulgarização do termo “facista” afasta injúria em texto jornalístico' },
      })

      const root = doc.body.firstElementChild as HTMLElement
      expect(report.truncated).toEqual([])
      expect(root.classList.contains('variant-manchete')).toBe(true)
      expect(doc.querySelector('[data-slot="titulo"]')?.textContent).toContain('Vulgarização')
      expect(root.style.getPropertyValue('--cor-fundo')).toBe('#01233C')
      expect(root.style.getPropertyValue('--cor-marca')).toBe('#BEA57C')
    })

    it('mantém o logo SVG inline temático depois da sanitização', async () => {
      const result = await validateEftpl(buffer)
      const doc = new DOMParser().parseFromString(result.layouts['feed-square'], 'text/html')
      const svg = doc.querySelector('.logo svg')
      expect(svg).not.toBeNull()
      const fills = [...svg!.querySelectorAll('path')].map((p) => p.getAttribute('fill'))
      expect(fills).toContain('var(--cor-marca)')
      expect(fills).toContain('var(--cor-texto)')
    })

    it('trunca manchete acima de maxChars', async () => {
      const result = await validateEftpl(buffer)
      const srcdoc = composeSrcdoc({
        layoutHtml: result.layouts['feed-square'],
        styles: result.styles,
        resourceUrls: {},
      })
      const doc = new DOMParser().parseFromString(srcdoc, 'text/html')
      const report = applyContent(doc, result.manifest!, { values: { titulo: 'a'.repeat(200) } })
      expect(report.truncated).toEqual(['titulo'])
      expect(doc.querySelector('[data-slot="titulo"]')?.textContent).toHaveLength(140)
    })
  })
})
