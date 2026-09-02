/**
 * 生成 .env.local 内容(Pages 部署时把同名变量填到 Pages 环境变量):
 *   bun scripts/encrypt.ts <supabase-url> <anon-key> <password>
 */
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto'

const [url, anonKey, password] = process.argv.slice(2)
if (!url || !anonKey || !password) {
  console.error('用法: bun scripts/encrypt.ts <supabase-url> <anon-key> <password>')
  process.exit(1)
}

const ITER = 310_000
const salt = randomBytes(16)
const iv = randomBytes(12)
const key = pbkdf2Sync(password.normalize('NFKC'), salt, ITER, 32, 'sha256')
const cipher = createCipheriv('aes-256-gcm', key, iv)
const ct = Buffer.concat([cipher.update(anonKey, 'utf8'), cipher.final(), cipher.getAuthTag()])

const env = `VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ENC_SALT=${salt.toString('hex')}
VITE_SUPABASE_ENC_IV=${iv.toString('hex')}
VITE_SUPABASE_ENC_CT=${ct.toString('hex')}
VITE_SUPABASE_ENC_ITER=${ITER}
`
console.log('--- 粘贴到 .env.local(本地)/ Pages Settings → Environment variables(部署)---\n')
console.log(env)
console.log('--- Supabase SQL Editor 执行(建表) ---\n')
console.log(`create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('income', 'expense')),
  amount_cents integer not null check (amount_cents > 0),
  category     text not null,
  note         text,
  occurred_at  date not null,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);`)
console.log('\n注意:VITE_ 变量会打进前端产物,防线 = PBKDF2 迭代 + 密码强度,请设长密码;')
console.log('换密码 = 重跑本脚本并更新环境变量后重新部署。')
