export type TxType = 'income' | 'expense'

/** 一条账目记录。金额一律以「分」为单位的整数存储,杜绝浮点误差。 */
export interface Tx {
  id: string
  type: TxType
  amountCents: number
  category: string
  note: string | null
  /** 业务发生日期,本地时区 YYYY-MM-DD */
  occurredAt: string
  /** 后端无关的扩展字段(如批量缴费的明细),由前端模块约定 */
  metadata: Record<string, unknown>
  createdAt: string
}

export interface TxInput {
  type: TxType
  amountCents: number
  category: string
  note?: string | null
  occurredAt?: string
  metadata?: Record<string, unknown>
}
