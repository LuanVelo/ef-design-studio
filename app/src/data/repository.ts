import { nanoid } from 'nanoid'
import type { EntityTable, IDType } from 'dexie'
import type { BaseRecord } from './types'

export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Repositório base: aplica as convenções id/createdAt/updatedAt/ownerUserId
 * em cima de uma store Dexie. Repositórios específicos compõem este.
 */
export class Repository<T extends BaseRecord> {
  protected table: EntityTable<T, 'id'>

  constructor(table: EntityTable<T, 'id'>) {
    this.table = table
  }

  // O genérico de chave do Dexie não reduz com T genérico; a chave é sempre string.
  private key(id: string): IDType<T, 'id'> {
    return id as unknown as IDType<T, 'id'>
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<T> {
    const now = nowIso()
    const record = {
      ...data,
      id: data.id ?? nanoid(),
      createdAt: now,
      updatedAt: now,
    } as T
    await this.table.add(record)
    return record
  }

  async get(id: string): Promise<T | undefined> {
    return this.table.get(this.key(id))
  }

  async update(id: string, patch: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T> {
    const existing = await this.table.get(this.key(id))
    if (!existing) throw new Error(`Registro não encontrado: ${id}`)
    const updated = { ...existing, ...patch, id, updatedAt: nowIso() } as T
    await this.table.put(updated)
    return updated
  }

  async remove(id: string): Promise<void> {
    await this.table.delete(this.key(id))
  }

  /** Isolamento por usuário: toda listagem é escopada ao dono. */
  async listByOwner(ownerUserId: string): Promise<T[]> {
    return this.table.where('ownerUserId').equals(ownerUserId).toArray() as Promise<T[]>
  }
}
