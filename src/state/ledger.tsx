import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Tx, TxInput } from '../core/types'
import { getStore, type LedgerStore } from '../stores'

type Status = 'loading' | 'locked' | 'ready'

interface StoreCtxValue {
  store: LedgerStore
  status: Status
  /** 全部流水,ready 后非 null;初始为 null 表示加载中 */
  txs: Tx[] | null
  error: string | null
  unlock(password: string): Promise<boolean>
  lock(): void
  addTx(input: TxInput): Promise<void>
  deleteTx(id: string): Promise<void>
}

const StoreCtx = createContext<StoreCtxValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getStore(), [])
  const [status, setStatus] = useState<Status>('loading')
  const [txs, setTxs] = useState<Tx[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setTxs(await store.listTx())
  }, [store])

  useEffect(() => {
    let live = true
    void (async () => {
      if (!store.requiresAuth || (await store.isUnlocked())) {
        if (live) setStatus('ready')
        return
      }
      if (live) setStatus('locked')
    })()
    return () => {
      live = false
    }
  }, [store])

  useEffect(() => {
    if (status === 'ready') void refresh().catch((e) => setError(String(e)))
  }, [status, refresh])

  const value = useMemo<StoreCtxValue>(
    () => ({
      store,
      status,
      txs,
      error,
      unlock: async (password) => {
        setError(null)
        try {
          await store.authenticate(password)
          setStatus('ready')
          return true
        } catch {
          setError('密码错误')
          return false
        }
      },
      lock: () => {
        store.lock()
        setTxs(null)
        setStatus('locked')
      },
      addTx: async (input) => {
        await store.addTx(input)
        await refresh()
      },
      deleteTx: async (id) => {
        await store.deleteTx(id)
        await refresh()
      },
    }),
    [status, txs, error, store, refresh],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useLedger(): StoreCtxValue {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useLedger must be used within StoreProvider')
  return ctx
}
