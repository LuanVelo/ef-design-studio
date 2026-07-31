import { z } from 'zod'

/** Campos comuns a todo slot */
const slotBase = {
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional().default(false),
}

export const TextSlotSchema = z.object({
  ...slotBase,
  type: z.literal('text'),
  maxChars: z.number().int().positive().optional(),
  multiline: z.boolean().optional().default(false),
})

export const RichtextSlotSchema = z.object({
  ...slotBase,
  type: z.literal('richtext'),
  maxChars: z.number().int().positive().optional(),
  multiline: z.boolean().optional().default(true),
})

export const ImageSlotSchema = z.object({
  ...slotBase,
  type: z.literal('image'),
  aspectHint: z.string().optional(),
  fit: z.enum(['cover', 'contain']).optional().default('cover'),
})

export const VariantSlotSchema = z.object({
  ...slotBase,
  type: z.literal('variant'),
  options: z.array(z.string().min(1)).min(1),
  default: z.string().optional(),
})

export const ColorSlotSchema = z.object({
  ...slotBase,
  type: z.literal('color'),
  default: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
    .optional(),
})

export const ListSlotSchema = z.object({
  ...slotBase,
  type: z.literal('list'),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().positive().optional(),
  itemMaxChars: z.number().int().positive().optional(),
})

/** Slots permitidos dentro de um page-group (sem aninhar outro page-group) */
export const InnerSlotSchema = z.discriminatedUnion('type', [
  TextSlotSchema,
  RichtextSlotSchema,
  ImageSlotSchema,
  VariantSlotSchema,
  ColorSlotSchema,
  ListSlotSchema,
])

export const PageGroupSlotSchema = z.object({
  ...slotBase,
  type: z.literal('page-group'),
  /** Slots de cada página do grupo */
  slots: z.array(InnerSlotSchema).min(1),
})

export const SlotDefSchema = z.discriminatedUnion('type', [
  TextSlotSchema,
  RichtextSlotSchema,
  ImageSlotSchema,
  VariantSlotSchema,
  ColorSlotSchema,
  ListSlotSchema,
  PageGroupSlotSchema,
])

export type SlotDef = z.infer<typeof SlotDefSchema>
export type InnerSlotDef = z.infer<typeof InnerSlotSchema>
export type TextSlotDef = z.infer<typeof TextSlotSchema>
export type RichtextSlotDef = z.infer<typeof RichtextSlotSchema>
export type ImageSlotDef = z.infer<typeof ImageSlotSchema>
export type VariantSlotDef = z.infer<typeof VariantSlotSchema>
export type ColorSlotDef = z.infer<typeof ColorSlotSchema>
export type ListSlotDef = z.infer<typeof ListSlotSchema>
export type PageGroupSlotDef = z.infer<typeof PageGroupSlotSchema>
