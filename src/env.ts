/**
 * 全部配置来自环境变量(.env.local / Pages 后台),不进 git、不写死在源码。
 * 注意:VITE_ 前缀的值仍会被打进前端产物,防线是 PBKDF2 迭代 + 密码强度本身,
 * env 化的收益是密文不入库、换密钥不用改代码。
 */
const raw = import.meta.env

export const SUPABASE_URL: string = raw.VITE_SUPABASE_URL ?? ''

export const SUPABASE_ENC = {
  salt: (raw.VITE_SUPABASE_ENC_SALT as string | undefined) ?? '',
  iv: (raw.VITE_SUPABASE_ENC_IV as string | undefined) ?? '',
  ct: (raw.VITE_SUPABASE_ENC_CT as string | undefined) ?? '',
  iter: Number(raw.VITE_SUPABASE_ENC_ITER) || 310_000,
}

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ENC.ct)
