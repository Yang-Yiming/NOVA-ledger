import type { Tx, TxInput } from '../core/types'

/**
 * 账本存储的统一抽象。业务逻辑(core/ui)只认识这个接口;
 * 具体后端(memory/localstorage/supabase/…)各自实现。
 *
 * 纪律:月份筛选、分组、统计一律由前端 core 完成,适配器只做
 * 「取全部、收增量」的笨 CRUD,保证新增后端永远是一百行以内。
 */
export interface LedgerStore {
  readonly kind: 'memory' | 'localstorage' | 'supabase'
  /** 是否需要密码解锁(supabase 的密码解密 anon key 方案) */
  readonly requiresAuth: boolean
  /** 已有缓存凭据时为 true(刷新后无需重新输密码) */
  isUnlocked(): Promise<boolean>
  /** 验证密码并缓存凭据;错误时 reject */
  authenticate(password: string): Promise<void>
  /** 清除缓存凭据,回到锁定态 */
  lock(): void
  listTx(): Promise<Tx[]>
  addTx(input: TxInput): Promise<Tx>
  updateTx(id: string, patch: Partial<TxInput>): Promise<void>
  deleteTx(id: string): Promise<void>
}

export class StoreError extends Error {}
