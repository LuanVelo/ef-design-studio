/**
 * Tipos da camada de dados. O manifest embutido em TemplateRecord vem dos
 * schemas zod de core/ (fonte dos tipos do contrato .eftpl).
 */

import type { TemplateManifest } from '@core/schemas'

/** Convenção do CLAUDE.md: todo registro persistido carrega estes campos. */
export type BaseRecord = {
  id: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  ownerUserId: string
}

export type UserRecord = BaseRecord & {
  username: string
  /** Credenciais PBKDF2 (F0.4). Senha nunca é armazenada. */
  credentials?: {
    algorithm: 'PBKDF2-SHA256'
    iterations: number
    saltB64: string
    hashB64: string
  }
  /** Expiração de sessão por inatividade, em minutos (default 480 = 8h) */
  sessionTimeoutMinutes?: number
}

export type TemplateStatus = 'novo' | 'ativo' | 'arquivado'

export type TemplateRecord = BaseRecord & {
  /** id declarado no manifest do pacote (difere do id do registro) */
  manifestId: string
  name: string
  category: 'social' | 'slides' | 'pdf'
  version: string
  status: TemplateStatus
  lastUsedAt?: string
  usageCount: number
  description?: string
  tags?: string[]
  /** Snapshot do manifest validado (evita reabrir o zip para grid/detalhe) */
  manifest?: TemplateManifest
  /** manifestId de origem quando este registro é uma cópia */
  copiedFrom?: string
  /** Bytes do pacote .eftpl (ArrayBuffer: portátil entre navegadores e testável) */
  packageBytes?: ArrayBuffer
  packageMime?: string
  thumbnailBytes?: ArrayBuffer
  thumbnailMime?: string
}

export type ProjectStatus = 'rascunho' | 'finalizado' | 'lixeira'

export type ProjectRecord = BaseRecord & {
  name: string
  templateId: string
  status: ProjectStatus
  /** Conteúdo do projeto — formalizado com zod no F1 */
  data?: unknown
  deletedAt?: string
}

export type ExportHistoryRecord = BaseRecord & {
  projectId: string
  formatKey: string
  fileType: 'png' | 'jpg' | 'pdf' | 'zip'
  fileCount: number
}

export type SettingRecord = BaseRecord & {
  key: string
  value: unknown
}
