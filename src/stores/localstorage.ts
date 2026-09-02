import type { Tx } from '../core/types'
import { todayISO } from '../core/format'
import { StoreError, type LedgerStore } from './interface'

const KEY = 'nova-ledger.transactions'

function load(): Tx[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Tx[]) : []
  } catch (e) {
    throw new StoreError('本地存储不可用或数据损坏', { cause: e })
  }
}

function save(rows: Tx[]): void {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

/** localStorage 实现:单设备持久化,无需任何凭据 */
export function createLocalstorageStore(): LedgerStore {
  return {
    kind: 'localstorage',
    requiresAuth: false,
    isUnlocked: () => Promise.resolve(true),
    authenticate: () => Promise.resolve(),
    lock: () => {},
    listTx: () => Promise.resolve(load()),
    async addTx(input) {
      const tx: Tx = {
        id: crypto.randomUUID(),
        type: input.type,
        amountCents: input.amountCents,
        category: input.category,
        note: input.note ?? null,
        occurredAt: input.occurredAt ?? todayISO(),
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
      }
      const rows = load()
      rows.push(tx)
      save(rows)
      return tx
    },
    async updateTx(id, patch) {
      const rows = load()
      const tx = rows.find((r) => r.id === id)
      if (!tx) throw new StoreError(`记录不存在: ${id}`)
      Object.assign(tx, patch)
      save(rows)
    },
    async deleteTx(id) {
      save(load().filter((r) => r.id !== id))
    },
  }
}
