/**
 * 文本净化:清掉 Unicode 格式控制字符(Cf)。这类字符在界面上完全不可见,
 * 却会破坏「同一个人」的判定 —— 学号开头的 U+200B 零宽空格会让
 * `\u200b12632661` 与 `12632661` 变成两条不同的人,名单分组、复制都会跟着错。
 *
 * 关键坑:JS 的 String.prototype.trim() 与正则 \s 都不把 U+200B 当空白,
 * 所以它能穿过解析、trim、落库一路存活。唯一可靠的办法是显式清洗。
 *
 * 用显式集合而非 \p{Cf}:ZWJ/ZWNJ(U+200C/D)在部分文字系统里有语义,
 * 这里保留这个边界,便于日后按需收窄或放宽。
 */
const INVISIBLE_SOURCE = '[\\u00ad\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u2064\\ufeff]'

/** 非全局:供单字符判定,避免 /g 的 lastIndex 状态污染 */
const INVISIBLE_ANY = new RegExp(INVISIBLE_SOURCE)
/** 全局:供 replace/match,这两个 API 会自行重置 lastIndex */
const INVISIBLE_ALL = new RegExp(INVISIBLE_SOURCE, 'g')

/** 删除全部不可见格式字符 */
export function stripInvisible(s: string): string {
  return s.replace(INVISIBLE_ALL, '')
}

/** 是否含不可见格式字符 */
export function hasInvisible(s: string): boolean {
  return INVISIBLE_ANY.test(s)
}

/** 命中的不可见字符(去重、保序);doctor 用来展示「删掉了什么」 */
export function findInvisibles(s: string): string[] {
  return [...new Set(s.match(INVISIBLE_ALL) ?? [])]
}

/**
 * 多行文本归一化:CRLF/CR/U+2028/U+2029 → \n,并去掉不可见字符。
 * 解析粘贴名单前先过一遍,避免行分隔符变体把一行拆错。
 */
export function normalizeLines(s: string): string {
  return stripInvisible(s.replace(/\r\n?|[\u2028\u2029]/g, '\n'))
}

const INVISIBLE_NAMES: Record<string, string> = {
  '\u00ad': '软连字符',
  '\u200b': '零宽空格',
  '\u200c': '零宽不连字',
  '\u200d': '零宽连字',
  '\u200e': 'LTR 标记',
  '\u200f': 'RTL 标记',
  '\u2060': '词连接符',
  '\u2061': '函数应用',
  '\u2062': '不可见乘号',
  '\u2063': '不可见分隔符',
  '\u2064': '不可见加号',
  '\ufeff': 'BOM',
}

/** 不可见字符的人类可读名,用于界面高亮(U+XXXX 兜底) */
export function invisibleName(ch: string): string {
  const named = INVISIBLE_NAMES[ch]
  if (named) return named
  const cp = ch.codePointAt(0)
  return cp === undefined ? '?' : `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
}
