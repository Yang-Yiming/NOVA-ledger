import type { Tx } from '../core/types'
import type { LedgerStore } from './interface'

/** 内存实现:测试与演示用,刷新即失 */
export function createMemoryStore(): LedgerStore {
  const rows: Tx[] = []

  return {
    kind: 'memory',
    requiresAuth: false,
    isUnlocked: () => Promise.resolve(true),
    authenticate: () => Promise.resolve(),
    lock: () => {},
    listTx: () => Promise.resolve([...rows]),
    async addTx(input) {
      const d = new Date()
      const tx: Tx = {
        id: crypto.randomUUID(),
        type: input.type,
        amountCents: input.amountCents,
        category: input.category,
        note: input.note ?? null,
        occurredAt:
          input.occurredAt ??
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
      }
      rows.push(tx)
      return tx
    },
    async updateTx(id, patch) {
      const tx = rows.find((r) => r.id === id)
      if (!tx) throw new Error(`tx not found: ${id}`)
      Object.assign(tx, patch)
    },
    async deleteTx(id) {
      const i = rows.findIndex((r) => r.id === id)
      if (i >= 0) rows.splice(i, 1)
    },
  }
}
