import { z } from 'zod'

export const FormatDefSchema = z.object({
  key: z.string().min(1),
  file: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  pages: z.enum(['single', 'multi']),
  /** Limites de páginas para formatos multi (ex.: carousel 2–10) */
  minPages: z.number().int().positive().optional(),
  maxPages: z.number().int().positive().optional(),
})

export type FormatDef = z.infer<typeof FormatDefSchema>

export type CanonicalFormat = Omit<FormatDef, 'file'> & {
  category: 'social' | 'slides' | 'pdf'
}

/** Catálogo de formatos canônicos (tabela do CLAUDE.md). O manifest pode declarar customizados. */
export const CANONICAL_FORMATS: readonly CanonicalFormat[] = [
  { key: 'stories', category: 'social', width: 1080, height: 1920, pages: 'single' },
  { key: 'feed-square', category: 'social', width: 1080, height: 1080, pages: 'single' },
  { key: 'feed-portrait', category: 'social', width: 1080, height: 1350, pages: 'single' },
  {
    key: 'carousel-square',
    category: 'social',
    width: 1080,
    height: 1080,
    pages: 'multi',
    minPages: 2,
    maxPages: 10,
  },
  {
    key: 'carousel-portrait',
    category: 'social',
    width: 1080,
    height: 1350,
    pages: 'multi',
    minPages: 2,
    maxPages: 10,
  },
  { key: 'slide-16x9', category: 'slides', width: 1920, height: 1080, pages: 'multi' },
  { key: 'slide-4x3', category: 'slides', width: 1440, height: 1080, pages: 'multi' },
  { key: 'pdf-a4-portrait', category: 'pdf', width: 794, height: 1123, pages: 'multi' },
  { key: 'pdf-a4-landscape', category: 'pdf', width: 1123, height: 794, pages: 'multi' },
] as const

export function getCanonicalFormat(key: string): CanonicalFormat | undefined {
  return CANONICAL_FORMATS.find((f) => f.key === key)
}
