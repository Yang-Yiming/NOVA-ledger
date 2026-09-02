import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Tx, TxInput } from '../core/types'
import { todayISO } from '../core/format'
import { SUPABASE_ENC, SUPABASE_URL } from '../env'
import { decryptPayload } from './crypto'
import { StoreError, type LedgerStore } from './interface'

const KEY_CACHE = 'nova-ledger.supabase.key'

interface Row {
  id: string
  type: string
  amount_cents: number
  category: string
  note: string | null
  occurred_at: string
  metadata: Record<string, unknown>
  created_at: string
}

function toTx(r: Row): Tx {
  return {
    id: r.id,
    type: r.type as Tx['type'],
    amountCents: r.amount_cents,
    category: r.category,
    note: r.note,
    occurredAt: r.occurred_at,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
  }
}

function toRow(input: TxInput) {
  return {
    type: input.type,
    amount_cents: input.amountCents,
    category: input.category,
    note: input.note ?? null,
    occurred_at: input.occurredAt ?? todayISO(),
    metadata: input.metadata ?? {},
  }
}

/**
 * Supabase 实现。访问权 = anon key 的保密性:
 * anon key 用密码 PBKDF2/AES-GCM 加密后写死在前端配置里,
 * 输对密码才解出 key;解出的 key 缓存到 localStorage(刷新免输)。
 * 表不开 RLS —— 侧信道是「拿不到 key 就调不了 API」。
 */
export function createSupabaseStore(): LedgerStore {
  let client: SupabaseClient | null = null

  async function getClient(): Promise<SupabaseClient> {
    if (client) return client
    const key = localStorage.getItem(KEY_CACHE)
    if (!key) throw new StoreError('尚未解锁')
    client = createClient(SUPABASE_URL, key)
    return client
  }

  return {
    kind: 'supabase',
    requiresAuth: true,
    async isUnlocked() {
      return localStorage.getItem(KEY_CACHE) !== null
    },
    async authenticate(password) {
      const key = await decryptPayload(SUPABASE_ENC, password)
      localStorage.setItem(KEY_CACHE, key)
      client = createClient(SUPABASE_URL, key)
    },
    lock() {
      localStorage.removeItem(KEY_CACHE)
      client = null
    },
    async listTx() {
      const db = await getClient()
      const { data, error } = await db
        .from('transactions')
        .select('*')
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error)
        throw new StoreError('读取失败(凭据可能已失效,请到「更多」页锁定后重新解锁)', {
          cause: error,
        })
      return (data as Row[]).map(toTx)
    },
    async addTx(input) {
      const db = await getClient()
      const { data, error } = await db.from('transactions').insert(toRow(input)).select().single()
      if (error) throw new StoreError('写入失败', { cause: error })
      return toTx(data as Row)
    },
    async updateTx(id, patch) {
      const db = await getClient()
      const row: Record<string, unknown> = {}
      if (patch.type !== undefined) row.type = patch.type
      if (patch.amountCents !== undefined) row.amount_cents = patch.amountCents
      if (patch.category !== undefined) row.category = patch.category
      if (patch.note !== undefined) row.note = patch.note
      if (patch.occurredAt !== undefined) row.occurred_at = patch.occurredAt
      if (patch.metadata !== undefined) row.metadata = patch.metadata
      const { error } = await db.from('transactions').update(row).eq('id', id)
      if (error) throw new StoreError('更新失败', { cause: error })
    },
    async deleteTx(id) {
      const db = await getClient()
      const { error } = await db.from('transactions').delete().eq('id', id)
      if (error) throw new StoreError('删除失败', { cause: error })
    },
  }
}
