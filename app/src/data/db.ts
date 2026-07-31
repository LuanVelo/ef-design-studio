import Dexie, { type EntityTable } from 'dexie'
import type {
  ExportHistoryRecord,
  ProjectRecord,
  SettingRecord,
  TemplateRecord,
  UserRecord,
} from './types'

export class EfDatabase extends Dexie {
  users!: EntityTable<UserRecord, 'id'>
  templates!: EntityTable<TemplateRecord, 'id'>
  projects!: EntityTable<ProjectRecord, 'id'>
  exports_history!: EntityTable<ExportHistoryRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'id'>

  constructor(name = 'ef-design-studio') {
    super(name)
    // Migrations versionadas: nunca editar uma versão publicada — criar a próxima.
    this.version(1).stores({
      users: 'id, username',
      templates: 'id, ownerUserId, manifestId, category, status, updatedAt',
      projects: 'id, ownerUserId, templateId, status, updatedAt',
      exports_history: 'id, ownerUserId, projectId, createdAt',
      settings: 'id, ownerUserId, key, [ownerUserId+key]',
    })
  }
}

export const db = new EfDatabase()
