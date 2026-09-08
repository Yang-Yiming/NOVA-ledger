import { centsToYuan } from './format'

/**
 * 课程缴费的价格档、舞种与明细约定。写死在前端;
 * 等收费结构真的常变,再挪进数据库(与 CATEGORIES 同一策略)。
 */

export const DANCES = ['popping', 'hiphop', 'locking', 'waacking', 'house', 'breaking', 'jazz'] as const

export type Dance = (typeof DANCES)[number] | 'all'

export const DANCE_LABEL: Record<Dance, string> = {
  all: '全舞种',
  popping: 'Popping',
  hiphop: 'HipHop',
  locking: 'Locking',
  waacking: 'Waacking',
  house: 'House',
  breaking: 'Breaking',
  jazz: 'Jazz',
}

/** 缴费入口:HyperNova 成员卡 / 单人卡 / 三人抱团卡(严格 3 人,舞社规定) */
export type CourseFeeGroup = 'hypernova' | 'single' | 'trio'

/** 价格档,单位:分。all = 全舞种;hypernova 固定全舞种、不参与抱团 */
export const COURSE_FEE_CENTS = {
  hypernova: 45600,
  'single:all': 54800,
  'single:one': 39800,
  'trio:all': 139900,
  'trio:one': 99900,
} as const

/** 支出侧的课程费用(请老师课时费),按舞种一口价,单位:分 */
export const COURSE_EXPENSE_CENTS: Record<Exclude<Dance, 'all'>, number> = {
  popping: 40000,
  hiphop: 45000,
  locking: 45000,
  waacking: 43000,
  house: 40000,
  breaking: 40000,
  jazz: 45000,
}
export interface CourseFeeMember {
  name: string
  sid: string
  dance: Dance
}

/** transactions.metadata 的课程缴费约定:一笔支付 = 一条记录,人明细进 members */
export interface CourseFeeMeta {
  kind: 'course-fee'
  group: CourseFeeGroup
  members: CourseFeeMember[]
}

export function isDance(v: string): v is Dance {
  return v === 'all' || (DANCES as readonly string[]).includes(v)
}

/** 45600 → "456";非整元才带小数。金额预填与 chip 标价共用 */
export function feeYuan(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : centsToYuan(cents)
}

/** 粘贴格式模板:占位符 {sid} {name} {dance},其余字符为字面量;默认即规范格式 */
export function defaultMemberTemplate(withDance: boolean): string {
  return withDance ? '{sid},{name},{dance}' : '{sid},{name}'
}

const TEMPLATE_FIELDS = ['sid', 'name', 'dance'] as const

/**
 * 校验格式模板:{sid}/{name} 恰好一次;{dance} 仅 withDance 允许且恰好一次;未知 {xxx} 报错。
 * 返回给用户看的错误文案,null 表示可用。
 */
export function validateMemberTemplate(template: string, withDance: boolean): string | null {
  const counts: Partial<Record<(typeof TEMPLATE_FIELDS)[number], number>> = {}
  for (const m of template.matchAll(/\{(\w+)\}/g)) {
    const field = m[1] as (typeof TEMPLATE_FIELDS)[number]
    if (!TEMPLATE_FIELDS.includes(field)) return `未知占位符 {${field}}`
    counts[field] = (counts[field] ?? 0) + 1
  }
  if ((counts.sid ?? 0) !== 1) return '格式需要恰好一个 {sid}'
  if ((counts.name ?? 0) !== 1) return '格式需要恰好一个 {name}'
  if (withDance !== ((counts.dance ?? 0) === 1))
    return withDance ? '该档位格式需要恰好一个 {dance}' : '该档位不需要 {dance}'
  return null
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 模板 → 行正则:{sid}/{name} 匹配非空白段,{dance} 用舞种枚举锚定;
 * 字面量逗号(含全角)兼容尾随空白,空白段匹配 \s+;不锚定行首尾,容忍「1. 」编号等杂讯。
 */
function templateToRegex(template: string, withDance: boolean): RegExp | null {
  if (validateMemberTemplate(template, withDance) !== null) return null
  const tokens = template.split(/(\{\w+\})/).filter(Boolean)
  /** 模板字面量里出现过的分隔符字符;字段值不得包含,防止 (\S+) 跨过分隔符吃进下一段 */
  const seps = new Set<string>()
  for (const tok of tokens) {
    if (/^\{\w+\}$/.test(tok)) continue
    for (const seg of tok.split(/(\s+)/)) {
      if (!seg || /^\s+$/.test(seg)) continue
      if (seg === ',' || seg === '，') seps.add(',').add('，')
      else for (const ch of seg) seps.add(ch)
    }
  }
  const field = seps.size
    ? `([^${[...seps].map(c => c.replace(/[\\^\]-]/g, '\\$&')).join('')}\\s]+)`
    : '(\\S+)'
  const parts = tokens.map(tok => {
    if (/^\{\w+\}$/.test(tok)) return tok === '{dance}' ? `\\b(all|${DANCES.join('|')})\\b` : field
    return tok
      .split(/(\s+)/)
      .map(seg => {
        if (!seg) return ''
        if (/^\s+$/.test(seg)) return '\\s+'
        if (seg === ',' || seg === '，') return '[,，\\t ]+'
        return escapeRegExp(seg)
      })
      .join('')
  })
  return new RegExp(parts.join(''), 'i')
}

/** 成员 → 粘贴文本:按模板一行一人;模板须先通过 validateMemberTemplate */
export function memberLines(
  members: ReadonlyArray<{ name: string; sid: string; dance: string }>,
  withDance: boolean,
  template = defaultMemberTemplate(withDance),
): string {
  return members
    .filter(m => m.name.trim() !== '' || m.sid.trim() !== '')
    .map(m =>
      template.split('{sid}').join(m.sid).split('{name}').join(m.name).split('{dance}').join(m.dance),
    )
    .join('\n')
}

export interface ParsedMemberLines {
  members: { name: string; sid: string; dance: string }[]
  errors: { line: number; text: string }[]
}

/** 解析粘贴名单:按模板逐行 search,空行跳过,匹配失败整行报错;模板无效时所有行报错 */
export function parseMemberLines(
  text: string,
  withDance: boolean,
  template = defaultMemberTemplate(withDance),
): ParsedMemberLines {
  const members: ParsedMemberLines['members'] = []
  const errors: ParsedMemberLines['errors'] = []
  const re = templateToRegex(template, withDance)
  const fields: string[] = []
  if (re) {
    for (const tok of template.split(/(\{\w+\})/)) {
      if (/^\{\w+\}$/.test(tok)) fields.push(tok.slice(1, -1))
    }
  }
  const trimPunct = (v: string) => v.replace(/^[,，、;；:．.]+|[,，、;；:．.]+$/g, '')
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const m = re?.exec(line)
    if (!m) {
      errors.push({ line: i + 1, text: line })
      return
    }
    const value = (field: string) => trimPunct(m[fields.indexOf(field) + 1] ?? '')
    const sid = value('sid')
    const name = value('name')
    if (!sid || !name) {
      errors.push({ line: i + 1, text: line })
      return
    }
    members.push({ name, sid, dance: withDance ? value('dance').toLowerCase() : 'all' })
  })
  return { members, errors }
}
