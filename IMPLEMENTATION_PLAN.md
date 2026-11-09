# BankHub — 實作計畫

> 版本：v1.0 | 日期：2026-09-20 | 參考：SPEC.md v1.0

---

## 1. 建議技術棧

| 層級 | 建議技術 | 理由 |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR 利於 SEO；App Router 支援 Server Components 降低 bundle |
| UI 元件 | shadcn/ui + Tailwind CSS | 輕量、可客製、響應式 |
| 圖表 | Recharts | React 生態系，輕量，支援響應式 |
| Backend API | Next.js API Routes 或 Node.js (Express/Fastify) | 視規模選擇；初期 Next.js monorepo 可行 |
| 資料庫 | PostgreSQL (Supabase 或 Railway) | 結構化金融資料；支援加密欄位 |
| 快取 | Redis | API 回應快取；Session 存儲 |
| 認證 | NextAuth.js (Auth.js) | 支援 OAuth providers；Session 管理完整 |
| 銀行 API（MVP） | Plaid SDK / Mock API | 快速驗證，不需 TPP 資格 |
| 部署 | Vercel (Frontend) + Supabase (DB) | 最低維運成本 |
| PDF 生成 | @react-pdf/renderer 或 Puppeteer | PDF 報告 |

---

## 2. 系統架構概覽

```
Browser (Next.js)
    |
    |  HTTPS
    v
Next.js App (Vercel)
    ├── /app (Page Routes)
    │    ├── /dashboard
    │    ├── /transactions
    │    ├── /analytics
    │    ├── /budget
    │    └── /settings
    │
    └── /api (API Routes)
         ├── /auth          ← NextAuth.js
         ├── /banks         ← 連結管理
         ├── /accounts      ← 帳戶資料
         ├── /transactions  ← 交易查詢
         ├── /analytics     ← 分析計算
         ├── /budget        ← 預算 CRUD
         ├── /alerts        ← 提醒設定
         └── /export        ← 匯出

         |
         | (Internal calls)
         v
Bank Adapter Layer
    ├── PlaidAdapter
    ├── TaiwanOpenBankingAdapter  (Phase 2)
    └── MockBankAdapter           (Dev/Test)

         |
         v
PostgreSQL (Supabase)
    ├── users
    ├── bank_connections
    ├── accounts
    ├── transactions
    ├── budgets
    └── alert_settings

Redis (Cache)
    ├── account_balance:{userId}
    └── transactions:{userId}:{accountId}
```

---

## 3. 子任務分解（交架構師執行）

### Phase 0 — 基礎建設（架構師優先處理）

| 任務ID | 子任務 | 輸出物 | 相依 |
|---|---|---|---|
| P0-1 | 建立 Next.js 14 專案骨架（TypeScript + ESLint + Tailwind） | 可運行的空白專案 | - |
| P0-2 | 設計並建立 PostgreSQL Schema（6 張資料表 + 索引） | `schema.sql` / Prisma schema | P0-1 |
| P0-3 | 設定 NextAuth.js（Email/Password + Google OAuth） | 可登入的 auth 流程 | P0-1 |
| P0-4 | 建立 Bank Adapter 介面（Interface + MockBankAdapter） | `src/adapters/` 目錄 | P0-1 |
| P0-5 | 設定 Redis 連線與快取 helper | `src/lib/cache.ts` | P0-1 |

### Phase 1 — 銀行連結（F1）

| 任務ID | 子任務 | 輸出物 | 相依 |
|---|---|---|---|
| P1-1 | 整合 Plaid Link（前端 OAuth 流程） | Plaid 連結 UI 可運行 | P0-3, P0-4 |
| P1-2 | 實作 PlaidAdapter（換 token、取帳戶、取交易） | `src/adapters/PlaidAdapter.ts` | P0-4 |
| P1-3 | `/api/banks` CRUD（新增/列出/刪除連結） | API endpoints | P0-2, P1-2 |
| P1-4 | Token 加密存儲（AES-256 加密 access_token） | 加密 util + DB 欄位 | P0-2 |
| P1-5 | 後台同步 Job（定期抓取新交易，存入 DB） | Cron 或 Vercel Cron Job | P1-3 |

### Phase 2 — Dashboard 與帳戶總覽（F2）

| 任務ID | 子任務 | 輸出物 | 相依 |
|---|---|---|---|
| P2-1 | `/dashboard` 頁面 Layout + 帳戶卡片元件 | `AccountCard` component | P0-1 |
| P2-2 | 總資產計算 API（`/api/accounts/summary`） | API endpoint | P1-3 |
| P2-3 | 餘額比例圓餅圖（Recharts） | `BalancePieChart` component | P2-1 |
| P2-4 | 手動重整按鈕（觸發 API 同步 + 清快取） | UI + API | P1-5, P0-5 |

### Phase 3 — 交易查詢（F3）

| 任務ID | 子任務 | 輸出物 | 相依 |
|---|---|---|---|
| P3-1 | `/api/transactions` 查詢 API（含篩選/搜尋/分頁） | API endpoint | P0-2 |
| P3-2 | 交易列表頁面 + 篩選列 UI | `/transactions` page | P3-1 |
| P3-3 | 關鍵字搜尋（debounce 300ms） | 搜尋 input component | P3-2 |
| P3-4 | 無限捲動分頁 | `useInfiniteQuery` hook | P3-2 |

### Phase 4 — 收支分析（F4）

| 任務ID | 子任務 | 輸出物 | 相依 |
|---|---|---|---|
| P4-1 | 交易分類規則引擎（關鍵字 → 類別 mapping） | `src/lib/categorizer.ts` | P0-2 |
| P4-2 | 分類批次更新（新交易入庫時自動分類） | DB trigger / service | P4-1, P1-5 |
| P4-3 | `/api/analytics/summary` 月度收支 API | API endpoint | P0-2 |
| P4-4 | 月度收支摘要 UI（總收入/支出/淨餘額卡片） | `/analytics` page | P4-3 |
| P4-5 | 近 6 個月趨勢長條圖 | `TrendBarChart` component | P4-4 |
| P4-6 | 支出類別圓餅圖 + 月份切換 | `CategoryPieChart` component | P4-4 |
| P4-7 | 手動修改分類 UI（點選交易 → 選類別） | `CategoryEditModal` | P3-2, P4-4 |

### Phase 5 — 預算管理（F5）

| 任務ID | 子任務 | 輸出物 | 相依 |
|---|---|---|---|
| P5-1 | `/api/budget` CRUD | API endpoints | P0-2 |
| P5-2 | 預算設定 UI（每類別輸入金額） | `/budget` page | P5-1 |
| P5-3 | 預算進度條元件（含超支變紅邏輯） | `BudgetProgressBar` | P5-1, P4-3 |
| P5-4 | 複製上月預算功能 | API + UI button | P5-1 |

### Phase 6 — 智慧提醒（F6）

| 任務ID | 子任務 | 輸出物 | 相依 |
|---|---|---|---|
| P6-1 | Alert 設定 CRUD API 與 UI | `/settings/alerts` | P0-2 |
| P6-2 | 餘額檢查 Job（同步後觸發，低餘額寫 notification） | Service | P1-5, P6-1 |
| P6-3 | 大額交易偵測（入庫時比對閾值） | Service | P1-5, P6-1 |
| P6-4 | 定期支出偵測演算法（滑動視窗比對） | `src/lib/recurringDetector.ts` | P0-2 |
| P6-5 | In-app 通知中心 UI（bell icon + 列表） | `NotificationCenter` | P6-2, P6-3 |

### Phase 7 — 資料匯出（F7）

| 任務ID | 子任務 | 輸出物 | 相依 |
|---|---|---|---|
| P7-1 | CSV 匯出 API（`/api/export/csv`） | API endpoint | P3-1 |
| P7-2 | CSV 下載按鈕 UI + 參數選擇 Modal | UI | P7-1 |
| P7-3 | PDF 月結報告生成（@react-pdf/renderer） | API endpoint + template | P4-3, P4-5 |

---

## 4. 資料表設計（參考）

```sql
-- 使用者
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 銀行連結
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  provider TEXT NOT NULL,          -- 'plaid' | 'taiwan_ob' | 'mock'
  access_token_enc TEXT NOT NULL,  -- AES-256 加密
  item_id TEXT,                    -- Plaid item_id 等
  status TEXT DEFAULT 'active',    -- 'active' | 'expired' | 'error'
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 帳戶
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES bank_connections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  external_id TEXT NOT NULL,       -- 銀行端帳戶 ID
  name TEXT,
  type TEXT,                       -- 'checking' | 'savings'
  currency TEXT DEFAULT 'TWD',
  balance NUMERIC(15,2),
  mask TEXT,                       -- 帳號末四碼
  updated_at TIMESTAMPTZ
);

-- 交易
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  external_id TEXT,
  date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,   -- 正數=收入, 負數=支出
  description TEXT,
  category TEXT,
  is_manual_category BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, external_id)
);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- 預算
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  month DATE NOT NULL,             -- 月份 (YYYY-MM-01)
  UNIQUE(user_id, category, month)
);

-- 提醒設定
CREATE TABLE alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,              -- 'low_balance' | 'large_txn' | 'budget_exceed'
  threshold NUMERIC(15,2),
  enabled BOOLEAN DEFAULT TRUE,
  account_id UUID REFERENCES accounts(id)  -- null = 全帳戶
);
```

---

## 5. API 端點總覽

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/accounts` | 列出所有帳戶 |
| GET | `/api/accounts/summary` | 總資產 + 各帳戶餘額 |
| POST | `/api/accounts/sync` | 手動觸發同步 |
| GET | `/api/banks` | 列出銀行連結 |
| POST | `/api/banks` | 新增連結（exchange token） |
| DELETE | `/api/banks/:id` | 移除連結 |
| GET | `/api/transactions` | 查詢交易（含篩選/搜尋/分頁） |
| PATCH | `/api/transactions/:id/category` | 手動改類別 |
| GET | `/api/analytics/summary` | 月度收支摘要 |
| GET | `/api/analytics/trend` | 6 個月趨勢 |
| GET | `/api/analytics/categories` | 支出類別佔比 |
| GET | `/api/analytics/recurring` | 定期支出清單 |
| GET/POST/PUT/DELETE | `/api/budget` | 預算 CRUD |
| GET/POST/PUT/DELETE | `/api/alerts` | 提醒設定 CRUD |
| GET | `/api/export/csv` | 匯出 CSV |
| GET | `/api/export/pdf` | 匯出 PDF |

---

## 6. 開發里程碑建議

| 里程碑 | 內容 | 完成條件 |
|---|---|---|
| M1 — MVP | P0 + P1 + P2（基礎 + 連結 + 總覽） | 可連 Plaid 並看到帳戶餘額 |
| M2 — 核心功能 | P3 + P4（交易查詢 + 收支分析） | 可查詢交易並看圖表 |
| M3 — 進階功能 | P5 + P6 + P7（預算 + 提醒 + 匯出） | 功能完整可 Beta 測試 |
| M4 — 台灣 OB | 替換 PlaidAdapter → TaiwanOpenBankingAdapter | 接通台灣 Open Banking |

---

## 7. 架構師注意事項

1. **Adapter 隔離**：所有銀行 API 呼叫必須透過 `BankAdapter` 介面，禁止在 API Route 直接呼叫 Plaid SDK，確保後續替換 Adapter 不影響上層。

2. **Token 安全**：`access_token_enc` 欄位必須在應用層加密/解密（非 DB 加密），金鑰從環境變數注入（`ENCRYPTION_KEY`）。

3. **非同步同步**：銀行 API 呼叫不應阻塞用戶請求，建議用 Background Job（Vercel Cron / BullMQ）執行，前端讀取 DB 快取資料。

4. **Rate Limit 保護**：`/api/accounts/sync` 需限制呼叫頻率（每用戶每 5 分鐘 1 次），避免打爆銀行 API 配額。

5. **遷移策略**：Plaid 與 Taiwan Open Banking 欄位不完全一致，`transactions.external_id` 應為 `{provider}_{raw_id}` 格式，避免衝突。
