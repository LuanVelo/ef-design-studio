import { db } from './db'
import { Repository } from './repository'
import type {
  ExportHistoryRecord,
  ProjectRecord,
  SettingRecord,
  TemplateRecord,
  UserRecord,
} from './types'

class UsersRepository extends Repository<UserRecord> {
  async getByUsername(username: string): Promise<UserRecord | undefined> {
    return this.table.where('username').equals(username).first()
  }

  async listAll(): Promise<UserRecord[]> {
    return this.table.toArray()
  }
}

class TemplatesRepository extends Repository<TemplateRecord> {
  async listByStatus(ownerUserId: string, status: TemplateRecord['status']) {
    return this.table
      .where('ownerUserId')
      .equals(ownerUserId)
      .and((t) => t.status === status)
      .toArray()
  }
}

class ProjectsRepository extends Repository<ProjectRecord> {
  async listByTemplate(ownerUserId: string, templateId: string) {
    return this.table
      .where('templateId')
      .equals(templateId)
      .and((p) => p.ownerUserId === ownerUserId)
      .toArray()
  }
}

class SettingsRepository extends Repository<SettingRecord> {
  async getByKey(ownerUserId: string, key: string): Promise<SettingRecord | undefined> {
    return this.table.where('[ownerUserId+key]').equals([ownerUserId, key]).first()
  }

  async setByKey(ownerUserId: string, key: string, value: unknown): Promise<SettingRecord> {
    const existing = await this.getByKey(ownerUserId, key)
    if (existing) return this.update(existing.id, { value } as Partial<SettingRecord>)
    return this.create({ ownerUserId, key, value })
  }
}

export const usersRepo = new UsersRepository(db.users)
export const templatesRepo = new TemplatesRepository(db.templates)
export const projectsRepo = new ProjectsRepository(db.projects)
export const exportsRepo = new Repository<ExportHistoryRecord>(db.exports_history)
export const settingsRepo = new SettingsRepository(db.settings)
