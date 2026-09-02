import type { TxType } from './types'

/** 分类写死在前端;等真的频繁增删再挪进数据库 */
export const CATEGORIES: Record<TxType, string[]> = {
  expense: ['餐饮', '场地', '器材', '物料', '报销', '其他'],
  income: ['缴费收入', '活动收入', '其他'],
}

export const TYPE_LABEL: Record<TxType, string> = {
  expense: '支出',
  income: '收入',
}
