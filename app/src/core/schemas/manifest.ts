import { z } from 'zod'
import { FormatDefSchema } from './formats'
import { SlotDefSchema } from './slots'

export const TemplateCategorySchema = z.enum(['social', 'slides', 'pdf'])
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>

export const FontDefSchema = z.object({
  family: z.string().min(1),
  file: z.string().min(1),
  license: z.string().optional(),
})

export const EditableColorSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  default: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
})

export type EditableColor = z.infer<typeof EditableColorSchema>

export const TemplateManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9-]*$/, 'id deve ser kebab-case minúsculo'),
    name: z.string().min(1),
    category: TemplateCategorySchema,
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/, 'version deve ser semver x.y.z'),
    author: z.string().optional(),
    createdWith: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    formats: z.array(FormatDefSchema).min(1),
    slots: z.array(SlotDefSchema).min(1),
    fonts: z.array(FontDefSchema).optional().default([]),
    colors: z
      .object({ editable: z.array(EditableColorSchema).optional().default([]) })
      .optional(),
  })
  .superRefine((manifest, ctx) => {
    // keys únicas
    const formatKeys = new Set<string>()
    for (const f of manifest.formats) {
      if (formatKeys.has(f.key)) {
        ctx.addIssue({ code: 'custom', message: `Formato duplicado: "${f.key}"`, path: ['formats'] })
      }
      formatKeys.add(f.key)
    }
    const slotKeys = new Set<string>()
    for (const s of manifest.slots) {
      if (slotKeys.has(s.key)) {
        ctx.addIssue({ code: 'custom', message: `Slot duplicado: "${s.key}"`, path: ['slots'] })
      }
      slotKeys.add(s.key)
    }
    // default de variant precisa estar nas options
    for (const s of manifest.slots) {
      if (s.type === 'variant' && s.default && !s.options.includes(s.default)) {
        ctx.addIssue({
          code: 'custom',
          message: `Slot "${s.key}": default "${s.default}" não está entre as options`,
          path: ['slots'],
        })
      }
    }
  })

export type TemplateManifest = z.infer<typeof TemplateManifestSchema>
