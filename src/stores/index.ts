import { SUPABASE_CONFIGURED } from '../env'
import type { LedgerStore } from './interface'
import { createMemoryStore } from './memory'
import { createLocalstorageStore } from './localstorage'
import { createSupabaseStore } from './supabase'

export type { LedgerStore } from './interface'

export type BackendKind = 'memory' | 'localstorage' | 'supabase'

/** URL 参数 ?backend=… 可覆盖默认选择,用于演示/测试 */
function resolveKind(): BackendKind {
  const q = new URLSearchParams(window.location.search).get('backend')
  if (q === 'memory' || q === 'localstorage' || q === 'supabase') return q
  if (q === 'local') return 'localstorage'
  return SUPABASE_CONFIGURED ? 'supabase' : 'localstorage'
}

let instance: LedgerStore | null = null

export function getStore(): LedgerStore {
  instance ??= resolveKind() === 'supabase'
    ? createSupabaseStore()
    : resolveKind() === 'memory'
      ? createMemoryStore()
      : createLocalstorageStore()
  return instance
}
