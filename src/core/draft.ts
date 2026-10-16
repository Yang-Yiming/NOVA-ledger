import { CATEGORIES } from './categories'
import { DANCES, feeMembers, isCourseFeeGroup, isDance, type CourseFeeGroup } from './fees'
import { centsToYuan } from './format'
import type { Tx, TxType } from './types'

/** 缴费人草稿行;与记账表单的成员字段一致 */
export interface MemberDraft {
  name: string
  sid: string
  dance: string
}

/**
 * 记账表单的完整草稿。创建时为空、编辑时由 txToDraft 从一条流水反推。
 * 字段与 EntryForm 的 useState 一一对应,让同一份表单既能新建也能编辑。
 */
export interface TxDraft {
  type: TxType
  /** 元字符串,与输入框一致(yuanToCents 负责校验) */
  amount: string
  /** 命中 CATEGORIES 的预设分类 */
  category: string | null
  /** 未命中预设时用户手写的分类 */
  custom: string
  note: string
  date: string
  incomeMode: 'fee' | 'free'
  expenseMode: 'course' | 'free'
  feeGroup: CourseFeeGroup | null
  singleDance: string | null
  trioScope: 'one' | 'all' | null
  members: MemberDraft[]
  expenseDance: (typeof DANCES)[number] | null
}

/**
 * 流水 → 表单草稿(创建的逆向映射)。纯函数,可单测。
 *
 * 与 EntryForm 提交时的约定严格对称:
 * - 分类「缴费收入」= 课程缴费模式,「课程费用」= 课程费用模式,其余走自由表单
 * - 课程费用必须带一个可用的单个舞种,否则退回自由模式 —— 避免卡在无法提交的状态
 */
export function txToDraft(tx: Tx): TxDraft {
  const draft: TxDraft = {
    type: tx.type,
    amount: centsToYuan(tx.amountCents),
    category: null,
    custom: '',
    note: tx.note ?? '',
    date: tx.occurredAt,
    incomeMode: 'free',
    expenseMode: 'free',
    feeGroup: null,
    singleDance: null,
    trioScope: null,
    members: [],
    expenseDance: null,
  }

  // 预设分类直接选中,否则当作自定义分类
  if (CATEGORIES[tx.type].includes(tx.category)) draft.category = tx.category
  else draft.custom = tx.category

  const meta = tx.metadata as { kind?: unknown; group?: unknown; dance?: unknown }

  // 课程缴费:重建档位、单/抱团与缴费人名单
  if (tx.type === 'income' && tx.category === '缴费收入') {
    draft.incomeMode = 'fee'
    const members = feeMembers(tx)
    if (isCourseFeeGroup(meta.group)) {
      draft.feeGroup = meta.group
      if (meta.group === 'single') draft.singleDance = members[0]?.dance ?? null
      else if (meta.group === 'trio')
        draft.trioScope = members.length === 3 && members.every(m => m.dance === 'all') ? 'all' : 'one'
      draft.members = members.map(m => ({ name: m.name, sid: m.sid, dance: m.dance }))
    }
    return draft
  }

  // 课程费用:metadata 里有可用的单个舞种才进课程模式
  if (tx.type === 'expense' && tx.category === '课程费用') {
    if (
      meta.kind === 'course-expense' &&
      typeof meta.dance === 'string' &&
      isDance(meta.dance) &&
      meta.dance !== 'all'
    ) {
      draft.expenseMode = 'course'
      draft.expenseDance = meta.dance
    }
    return draft
  }

  return draft
}
