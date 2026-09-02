# NOVA Ledger

NOVA 社团账本:记账、流水、汇总、xlsx 导出。React + TS + Bun + Vite,后端可插拔(默认 Supabase,亦可纯本地运行)。

## 快速开始

```bash
bun install
bun dev            # http://localhost:5173/?backend=local 走本地存储,无需任何账号
```

`?backend=` 可选值:`local`(localStorage)/ `memory`(内存演示)/ `supabase`。
未配置 Supabase 时默认本地;配置后默认 Supabase。

## 接入 Supabase(一次性)

安全模型:**anon key 用密码 PBKDF2/AES-GCM 加密后,经环境变量内嵌前端**,输对密码才解出 key;
解出的 key 缓存 localStorage,刷新免输。表不开 RLS——拿不到密码就调不了 API。

1. [supabase.com](https://supabase.com) 建项目,SQL Editor 执行:

```sql
create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('income', 'expense')),
  amount_cents integer not null check (amount_cents > 0),
  category     text not null,
  note         text,
  occurred_at  date not null,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
```

2. 项目设置 → API,复制 Project URL 与 anon key,然后:

```bash
cp .env.local.example .env.local
bun scripts/encrypt.ts <project-url> <anon-key> "<一个足够长的密码>"
```

3. 把脚本输出的环境变量粘贴进 `.env.local`(本地开发);部署时把同名变量填到
   Cloudflare Pages 项目 **Settings → Environment variables**。
   换密码 = 重跑脚本 + 更新环境变量 + 重新部署,不需要改任何代码。
4. `bun run build` 后部署;干事们拿到的是同一个密码,输一次即可用。

注意:`VITE_` 变量会打进前端产物,防线 = PBKDF2 迭代 + 密码强度,请设长密码;
`.env.local` 已被 gitignore,密钥不会进 git 历史。

## 部署到 Cloudflare Pages

- 构建命令:`bun run build`;输出目录:`dist`
- Framework preset 选 None 或 Vite 均可;路由用 HashRouter,无需 `_redirects`
- 环境变量:`.env.local` 里的五个 `VITE_*` 变量
- 手机浏览器打开后「添加到主屏幕」即以 standalone PWA 运行

## 架构

```
src/
  core/      纯函数与类型:types / format / categories / stats / xlsx(不碰任何后端)
  env.ts     环境变量访问器(import.meta.env → 类型化常量)
  stores/    LedgerStore 接口 + memory / localstorage / supabase 适配器 + crypto
  state/     React context:解锁状态机 + 流水缓存
  ui/        Layout(底部 tab / 桌面侧栏)+ 记账 / 流水 / 更多 三页
```

约定:

- 金额一律 integer 分(`amountCents`),杜绝浮点;日期用本地 `YYYY-MM-DD` 字符串
- 月份筛选、分组、统计在前端 core 完成;适配器只做「取全部、收增量」的笨 CRUD
- 新后端 = 实现 `LedgerStore` 接口(见 `src/stores/interface.ts`)并在 `stores/index.ts` 注册

## 路线图

- [x] Phase 0/1:记账、流水、月度汇总、xlsx 导出、密码门、双后端
- [ ] Phase 2:缴费批量导入(`SID, feeType` 粘贴解析 → 一笔收入 + metadata 明细;反向复制名单)
- [ ] Phase 3:仪表盘(净流 heatmap、分类占比、月趋势)
- [ ] Phase 4:预设提醒(如「周四晚 locking 课 ¥450」一键记账)
