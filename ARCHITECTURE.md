# BankHub — 系統架構設計

> 版本：v1.0 | 日期：2026-09-20 | 撰寫：Orion (軟體架構)
> 參考：SPEC.md v1.0、IMPLEMENTATION_PLAN.md v1.0

---

## 1. 系統拓撲

```
┌─────────────────────────────────────────────────────────────┐
│  Browser / Mobile PWA                                       │
│  Next.js 14 App Router (SSR + Client Components)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / TLS 1.3
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js Application Layer (Vercel Edge)                    │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │  Page Routes │  │  API Routes (/api/*)                 │ │
│  │  /dashboard  │  │  auth / banks / accounts /           │ │
│  │  /transactions│  │  transactions / analytics /          │ │
│  │  /analytics  │  │  budget / alerts / export            │ │
│  │  /budget     │  └──────────────┬───────────────────────┘ │
│  │  /settings   │                 │                          │
│  └──────────────┘                 ▼                          │
│                    ┌──────────────────────────────────────┐  │
│                    │  Bank Adapter Layer                  │  │
│                    │  BankAdapter (interface)             │  │
│                    │  ├─ PlaidAdapter                     │  │
│                    │  ├─ TaiwanOpenBankingAdapter (Beta)  │  │
│                    │  └─ MockBankAdapter (Dev/Test)       │  │
│                    └──────────────┬───────────────────────┘  │
└──────────────────────────────────┼──────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               │                                       │
               ▼                                       ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│  PostgreSQL (Supabase)   │         │  Redis (Upstash)         │
│  users                   │         │  account_balance:{uid}   │
│  bank_connections        │         │  txn_list:{uid}:{acct}   │
│  accounts                │         │  sync_lock:{uid}         │
│  transactions            │         │  rate_limit:{uid}        │
│  budgets                 │         └──────────────────────────┘
│  alert_settings          │
└──────────────────────────┘
          ▲
          │ (Background Sync)
┌──────────────────────────┐
│  Vercel Cron Jobs        │
│  /api/internal/sync      │
└──────────────────────────┘
```

---

## 2. 元件職責

| 元件 | 技術 | 職責 |
|---|---|---|
| Page Routes | Next.js App Router + Server Components | UI 渲染；Server Component 直接讀 DB，減少 client round-trip |
| API Routes | Next.js Route Handlers | RESTful 端點；Session 驗證；業務邏輯協調 |
| Bank Adapter Layer | TypeScript 介面 + 各實作 | 隔離外部銀行 API 細節；標準化資料模型 |
| Background Sync | Vercel Cron + `/api/internal/sync` | 定時拉取銀行最新帳戶與交易；非同步觸發提醒邏輯 |
| PostgreSQL | Supabase | 持久化所有業務資料；Row-Level Security 強制用戶隔離 |
| Redis | Upstash | 短效快取（帳戶餘額、交易列表）；同步鎖；速率限制計數器 |

---

## 3. 關鍵資料流

### 3.1 OAuth 銀行連結流程

```
Browser                  Next.js API              BankAdapter           銀行 OAuth Server
  │                          │                        │                        │
  │── POST /api/banks ──────>│                        │                        │
  │   { provider, bankName } │                        │                        │
  │                          │── getAuthUrl() ───────>│                        │
  │                          │<─ authorizationUrl ────│                        │
  │<─ { authorizationUrl } ──│                        │                        │
  │                          │                        │                        │
  │── redirect ─────────────────────────────────────────────────────────────>│
  │<─ callback ?code=XXX ───────────────────────────────────────────────────│
  │                          │                        │                        │
  │── GET /api/auth/callback │                        │                        │
  │   ?code=XXX ────────────>│                        │                        │
  │                          │── exchangeAuthorizationCode(code) ────────────>│
  │                          │<─ BankAuthorization ──────────────────────────│
  │                          │                        │                        │
  │                          │ encrypt(accessToken) → access_token_enc        │
  │                          │ INSERT bank_connections                         │
  │                          │── getAccounts(auth) ──>│                        │
  │                          │<─ BankAccount[] ───────│                        │
  │                          │ INSERT accounts                                 │
  │<─ redirect /dashboard ───│                        │                        │
```

### 3.2 背景同步流程

```
Vercel Cron (每 6 小時)
  │
  │── POST /api/internal/sync (internal secret header)
  │
  ├─ 讀取所有 status='active' 的 bank_connections
  ├─ 依 connection 逐一執行：
  │    ├─ 取得 Redis 同步鎖 sync_lock:{connectionId}（防重複執行）
  │    ├─ decrypt(access_token_enc) → accessToken
  │    ├─ adapter.getAccounts(auth) → 更新 accounts.balance
  │    ├─ adapter.getTransactions(auth, { from: last_synced_at, to: now })
  │    │    → INSERT INTO transactions (ON CONFLICT DO NOTHING)
  │    │    → 自動分類（categorizer）
  │    ├─ 執行提醒檢查（低餘額、大額交易、超支）
  │    ├─ 更新 bank_connections.last_synced_at
  │    ├─ 清除 Redis 快取：account_balance:{userId}
  │    └─ 釋放同步鎖
  └─ 返回 200 { synced: N, errors: [...] }
```

### 3.3 交易查詢流程

```
Browser                  Next.js API              Redis           PostgreSQL
  │                          │                      │                  │
  │── GET /api/transactions  │                      │                  │
  │   ?from=&to=&q=&page= ──>│                      │                  │
  │                          │ 1. 驗證 Session       │                  │
  │                          │ 2. 組裝 cache key     │                  │
  │                          │── GET txn_list:uid ──>│                  │
  │                          │                      │                  │
  │                          │  [Cache Miss]         │                  │
  │                          │── SELECT transactions ──────────────────>│
  │                          │<─ rows ─────────────────────────────────│
  │                          │── SET txn_list:uid TTL:5min ──>│         │
  │                          │                               │         │
  │<─ { data, pagination } ──│                               │         │
```

---

## 4. 安全架構

### 4.1 Token 加密方案

銀行 OAuth access token 屬最高敏感度，必須在應用層加密後再寫入 DB，金鑰不進入資料庫。

**演算法：AES-256-GCM**

```
加密流程：
  plaintext = accessToken
  key       = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')  // 32 bytes
  iv        = crypto.randomBytes(12)                           // 96-bit nonce
  cipher    = createCipheriv('aes-256-gcm', key, iv)
  ciphertext = cipher.update(plaintext) + cipher.final()
  authTag   = cipher.getAuthTag()                              // 16 bytes
  stored    = base64(iv) + '.' + base64(ciphertext) + '.' + base64(authTag)

解密流程（逆向）：
  [iv, ciphertext, authTag] = stored.split('.')
  decipher  = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  plaintext = decipher.update(ciphertext) + decipher.final()
  // authTag 驗證失敗 → 拋出錯誤，不返回任何 token 片段
```

**金鑰管理原則：**
- `ENCRYPTION_KEY` 從環境變數注入（Vercel Environment Variables），32 bytes hex 字串
- 開發 / Staging / Production 使用不同金鑰，不得共用
- 金鑰輪換：新舊金鑰並存期間，`access_token_enc` 加前綴版本號 `v1.xxx`，解密時依版本選擇金鑰

### 4.2 認證與授權

- **Session 管理**：NextAuth.js，Session 存 JWT（httpOnly Cookie），不存 localStorage
- **API 端點保護**：所有 `/api/*`（除 `/api/auth/*`）需驗證 Session，未登入返回 401
- **Row-Level 隔離**：每張表含 `user_id` 欄位；所有 DB 查詢強制附加 `WHERE user_id = session.userId`，禁止 cross-user 存取
- **Internal Sync API**：`/api/internal/sync` 需驗證 `X-Internal-Secret` header（與 `CRON_SECRET` 環境變數比對）

### 4.3 傳輸安全

- 全程 HTTPS / TLS 1.3（Vercel 預設）
- 銀行 OAuth redirect URI 必須白名單化，且只允許 `https://` scheme
- 敏感日誌：API Route 絕對不 log `access_token`、`access_token_enc`、`ENCRYPTION_KEY`

---

## 5. 快取策略

| 快取鍵 | TTL | 失效觸發 |
|---|---|---|
| `account_balance:{userId}` | 5 分鐘 | 同步完成 / 手動重整 |
| `txn_list:{userId}:{accountId}:{dateRange}` | 5 分鐘 | 同步完成 / 手動重整 |
| `analytics_summary:{userId}:{month}` | 30 分鐘 | 交易分類修改 / 同步完成 |
| `sync_lock:{connectionId}` | 10 分鐘 | 同步任務結束自動釋放 |
| `rate_limit:sync:{userId}` | 5 分鐘 | 自然過期 |

**策略說明：**
- Dashboard 與交易查詢讀快取（DB 快取），背景同步更新資料後主動清除
- 手動重整（`POST /api/accounts/sync`）先寫 rate limit key，5 分鐘內同一用戶第二次呼叫返回 429
- Redis 不可用時（降級）：直接查 PostgreSQL，不影響功能，僅影響效能

---

## 6. 背景任務設計

### 6.1 定時同步（Vercel Cron）

```
# vercel.json
{
  "crons": [
    { "path": "/api/internal/sync", "schedule": "0 */6 * * *" }
  ]
}
```

- 執行頻率：每 6 小時
- 同一 connection 使用 Redis SETNX 取鎖（`sync_lock:{connectionId}`，TTL 10 分鐘），防止並發重複同步
- 失敗處理：連續 3 次同步失敗 → `bank_connections.status = 'error'`，觸發 in-app 重新授權提醒

### 6.2 交易分類（同步中執行）

```
新交易入庫 → categorizer.classify(description)
  ├─ is_manual_category = false → 套用規則分類
  └─ is_manual_category = true → 保留手動分類，不覆蓋
```

分類規則存於 `src/lib/categorizer.ts`，關鍵字 → 類別 mapping，可熱更新不需重新部署（未來可移至 DB 設定表）。

### 6.3 提醒邏輯（同步中執行）

```
同步完成後依序執行：
  1. checkLowBalance(accounts, alertSettings)
  2. checkLargeTransactions(newTransactions, alertSettings)
  3. checkBudgetExceed(newTransactions, budgets)
  → 寫入 notifications 表（若日後加）或 in-app 通知機制
```

---

## 7. 速率限制

| 端點 | 限制 | 機制 |
|---|---|---|
| `POST /api/accounts/sync` | 每用戶每 5 分鐘 1 次 | Redis SETNX `rate_limit:sync:{userId}` |
| `POST /api/banks` | 每用戶每分鐘 5 次 | Redis sliding window |
| `GET /api/export/*` | 每用戶每分鐘 3 次 | Redis sliding window |
| 其他 GET 端點 | 每用戶每分鐘 120 次 | Vercel Edge Rate Limiting |

---

## 8. 錯誤處理

### 8.1 API 層錯誤分類

```typescript
// 統一錯誤回應格式
{
  "error": {
    "code": "BANK_AUTH_EXPIRED",   // 機器可讀錯誤碼
    "message": "銀行授權已過期，請重新連結",  // 用戶可讀訊息
    "connectionId": "uuid"          // 僅相關欄位，不含 token
  }
}
```

| BankAdapterError.code | HTTP Status | API error.code |
|---|---|---|
| INVALID_AUTHORIZATION | 400 | BANK_AUTH_INVALID |
| AUTHORIZATION_EXPIRED | 401 | BANK_AUTH_EXPIRED |
| INVALID_DATE_RANGE | 400 | INVALID_DATE_RANGE |
| UNKNOWN_ACCOUNT | 404 | ACCOUNT_NOT_FOUND |

### 8.2 銀行 API 失敗處理

- 網路超時（預設 10 秒）：捕捉後標記該 connection 為 `error`，不影響其他 connections 的同步
- token 過期（401）：`status = 'expired'`，推送重新授權通知
- 銀行 API 5xx：等待下次 Cron 重試，連續 3 次失敗轉 `error`

---

## 9. Adapter 擴充合約

所有 BankAdapter 實作必須遵守以下不變量：

1. **`exchangeAuthorizationCode`**：成功返回含 `accessToken` 的 `BankAuthorization`；失敗丟出 `BankAdapterError`
2. **`getAccounts`**：返回的 `balance` 單位統一為原幣別最小計算單位（TWD 為元）
3. **`getTransactions`**：`amount` 正數為收入，負數為支出；`date` 為交易日（非入帳日）；結果依 `date DESC` 排序
4. **`revoke`**：呼叫後，使用相同 token 的任何操作必須拋出 `AUTHORIZATION_EXPIRED`
5. **`external_id` 命名規則**：`{provider}_{rawId}`（例：`plaid_TxnABC123`、`taiwan_ob_TXN9876`），確保跨 provider 不衝突

**新增 Adapter 清單：**
- 複製 `MockBankAdapter.ts` 作為模板
- 實作 `BankAdapter` 介面全部 4 個方法
- 在 `src/adapters/index.ts` 依 `provider` 字串導出
- 在 `database/schema.sql` 的 `provider CHECK constraint` 中新增 provider 名稱

---

## 10. Provider 遷移策略

| 階段 | Provider | 遷移方式 |
|---|---|---|
| MVP | `mock` + `plaid` | 直接啟用 |
| Beta | `taiwan_ob`（2-3 家） | 新 adapter，舊連結不受影響 |
| GA | 全台灣 Open Banking | 舊 Plaid 連結可選移轉 |

**Plaid → Taiwan Open Banking 遷移流程：**
1. 新 `TaiwanOpenBankingAdapter` 上線後，UI 提供「升級連結」按鈕
2. 使用者重新授權，建立新 `bank_connection`（`provider = 'taiwan_ob'`）
3. 依 `external_id` 比對歷史交易，避免重複入庫（`UNIQUE(account_id, external_id)` 保護）
4. 舊 Plaid connection 保留 30 天後由用戶手動刪除或自動撤銷

---

## 11. 非功能需求對應

| 需求 | 目標 | 設計對應 |
|---|---|---|
| Dashboard 載入 < 3s | P95 < 3s | Server Component 直讀 DB（繞過 API 跳躍）；Redis 快取餘額 |
| 交易首屏 < 2s | P95 < 2s | `idx_transactions_user_date` 索引；分頁 50 筆；Redis 快取 |
| 1,000 concurrent users | 支撐峰值 | Vercel Serverless 自動擴展；Redis 降低 DB 壓力 |
| 可用率 99.5% | 月計 | Vercel / Supabase SLA；同步失敗不影響讀取（讀 DB 快照） |
| 個資法合規 | 刪除帳戶 | 所有表 `user_id` FK + CASCADE DELETE；刪除 user 即清空全部資料 |
| 響應式 | 375px ~ 1280px+ | Tailwind breakpoints；Recharts responsive container |
