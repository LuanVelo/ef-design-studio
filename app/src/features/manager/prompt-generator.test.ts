import { ALL_CANONICAL_TAGS, buildTemplatePrompt, CANONICAL_TAGS } from './prompt-generator'

describe('F2.5 — gerador de prompt (RF-G6)', () => {
  const base = {
    name: 'Café Notícias',
    category: 'social' as const,
    formatKeys: ['stories', 'carousel-square'],
    designDescription: 'Visual quente, tipografia serifada grande.',
    slotsDescription: 'Título, subtítulo, imagem de fundo.',
    tags: ['bold', 'produto'],
  }

  it('embute id em kebab-case derivado do nome', () => {
    const prompt = buildTemplatePrompt(base)
    expect(prompt).toContain('ef-cafe-noticias-01')
  })

  it('inclui os formatos escolhidos com dimensões e limites de páginas', () => {
    const prompt = buildTemplatePrompt(base)
    expect(prompt).toContain('| `stories` | 1080×1920 | única |')
    expect(prompt).toContain('| `carousel-square` | 1080×1080 | multi (2–10 páginas) |')
    expect(prompt).toContain('"minPages": 2, "maxPages": 10')
    expect(prompt).not.toContain('feed-square')
  })

  it('embute as regras duras do contrato (sem script, sem URL externa, data-slot)', () => {
    const prompt = buildTemplatePrompt(base)
    expect(prompt).toContain('sem `<script>`')
    expect(prompt).toContain('sem URLs externas')
    expect(prompt).toContain('data-slot')
    expect(prompt).toContain('variant-<option>')
    expect(prompt).toContain('## Visão geral')
    expect(prompt).toContain('## Changelog')
  })

  it('inclui a taxonomia canônica de tags (§12.3)', () => {
    const prompt = buildTemplatePrompt(base)
    for (const tag of ALL_CANONICAL_TAGS) expect(prompt).toContain(tag)
    expect(CANONICAL_TAGS.estilo).toContain('minimalista')
    expect(CANONICAL_TAGS.tema).toContain('relatorio')
    expect(CANONICAL_TAGS.tom).toContain('escuro')
  })

  it('menciona page-number apenas para categoria pdf', () => {
    expect(buildTemplatePrompt(base)).not.toContain('page-number')
    expect(
      buildTemplatePrompt({ ...base, category: 'pdf', formatKeys: ['pdf-a4-portrait'] }),
    ).toContain('page-number')
  })
})
