import { z } from 'zod'

/** Valor de um slot num documento de conteúdo (texto, lista de itens, etc.) */
export const SlotValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.null(),
])
export type SlotValue = z.infer<typeof SlotValueSchema>

export const ContentPageSchema = z.object({
  suggestedVariant: z.string().optional(),
  slots: z.record(z.string(), SlotValueSchema),
})
export type ContentPage = z.infer<typeof ContentPageSchema>

/** Contrato 2 — content.json (o que a IA gera para Slides/PDF) */
export const ContentDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().min(1),
  language: z.string().optional().default('pt-BR'),
  pages: z.array(ContentPageSchema).min(1),
})
export type ContentDocument = z.infer<typeof ContentDocumentSchema>

/** Override de um slot num formato específico (Social usa conteúdo compartilhado + overrides) */
export const SlotOverrideSchema = z.object({
  formatKey: z.string().min(1),
  slotKey: z.string().min(1),
  value: SlotValueSchema,
})
export type SlotOverride = z.infer<typeof SlotOverrideSchema>
