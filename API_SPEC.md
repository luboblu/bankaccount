# BankHub — API 規格

> 版本：v1.0 | 日期：2026-09-20 | 撰寫：Orion (軟體架構)
> 參考：SPEC.md v1.0、ARCHITECTURE.md v1.0

---

## 共用規範

### 基礎 URL

```
https://bankhub.app/api
```

### 認證

所有端點（除 `/auth/*`）需附帶有效的 Session Cookie（NextAuth.js httpOnly JWT）。
未登入請求返回：

```json
HTTP 401
{ "error": { "code": "UNAUTHORIZED", "message": "請先登入" } }
```

### 錯誤回應格式

```typescript
interface ErrorResponse {
  error: {
    code: string;       // 機器可讀錯誤碼（大寫底線）
    message: string;    // 用戶可讀說明
    field?: string;     // 驗證錯誤時指定欄位名稱
  };
}
```

### 分頁格式

查詢列表端點返回：

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;       // 符合條件的總筆數
    page: number;        // 當前頁碼（1-based）
    pageSize: number;    // 每頁筆數
    hasMore: boolean;    // 是否有下一頁
  };
}
```

---

## AUTH — 認證

### POST /auth/signup

註冊新帳號（Email / Password）。

**Request Body**

```typescript
{
  email: string;    // 有效 email 格式
  password: string; // 最少 8 字元
  name?: string;
}
```

**Response 201**

```typescript
{
  user: {
    id: string;    // UUID
    email: string;
    name: string | null;
  }
}
```

**Errors**

| Code | HTTP | 說明 |
|---|---|---|
| EMAIL_ALREADY_EXISTS | 409 | 該 email 已被註冊 |
| INVALID_PASSWORD | 422 | 密碼不符格式 |

---

### POST /auth/login

登入並建立 Session（NextAuth 接管，此為文件說明）。

### POST /auth/logout

登出並清除 Session Cookie。

### GET /auth/session

返回當前 Session 資訊。

**Response 200**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null
}
```

---

## BANKS — 銀行連結管理

### GET /banks

列出當前用戶所有銀行連結。

**Response 200**

```typescript
{
  data: Array<{
    id: string;           // UUID
    bankName: string;
    provider: "plaid" | "taiwan_ob" | "mock";
    status: "active" | "expired" | "error";
    lastSyncedAt: string | null;  // ISO 8601
    createdAt: string;
    accountCount: number;         // 該連結下的帳戶數
  }>
}
```

---

### POST /banks/link-token

（Plaid 專用）取得 Plaid Link Token，供前端 Plaid Link SDK 初始化。

**Request Body**

```typescript
{
  provider: "plaid";
}
```

**Response 200**

```typescript
{
  linkToken: string;
}
```

---

### POST /banks

完成 OAuth 授權、儲存 bank connection。

**Request Body**

```typescript
{
  provider: "plaid" | "taiwan_ob" | "mock";
  bankName: string;
  authorizationCode: string;   // OAuth callback 的 code 參數
}
```

**Response 201**

```typescript
{
  connection: {
    id: string;
    bankName: string;
    provider: string;
    status: "active";
    accounts: Array<{
      id: string;
      name: string;
      type: "checking" | "savings";
      currency: string;
      balance: number;
      mask: string;
    }>
  }
}
```

**Errors**

| Code | HTTP | 說明 |
|---|---|---|
| BANK_AUTH_INVALID | 400 | authorization code 無效 |
| MAX_CONNECTIONS_REACHED | 422 | 已達 10 個連結上限 |
| BANK_CONNECTION_FAILED | 502 | 銀行 API 錯誤 |

---

### DELETE /banks/:id

移除指定銀行連結，同步刪除該連結下所有帳戶與交易。

**Response 204** （無 body）

**Errors**

| Code | HTTP | 說明 |
|---|---|---|
| CONNECTION_NOT_FOUND | 404 | 找不到或不屬於當前用戶 |

---

### POST /banks/:id/reauth

重新授權已過期的連結（`status = 'expired'`）。Request / Response 同 `POST /banks`，但更新現有 connection 而非新增。

---

## ACCOUNTS — 帳戶

### GET /accounts

列出所有帳戶。

**Response 200**

```typescript
{
  data: Array<{
    id: string;
    connectionId: string;
    bankName: string;       // 來自 bank_connection.bank_name
    name: string;
    type: "checking" | "savings";
    currency: string;
    balance: number;
    mask: string;
    updatedAt: string;
  }>
}
```

---

### GET /accounts/summary

總資產摘要（Dashboard 主要資料來源）。

**Response 200**

```typescript
{
  totalBalance: number;       // 所有帳戶餘額加總（TWD）
  currency: "TWD";
  lastSyncedAt: string | null;
  accounts: Array<{
    id: string;
    bankName: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    mask: string;
    updatedAt: string;
    balancePercent: number;   // 佔總資產百分比，0-100
  }>
}
```

---

### POST /accounts/sync

手動觸發帳戶與交易同步。每用戶每 5 分鐘限呼叫 1 次。

**Response 202**

```typescript
{
  message: "同步已排入佇列",
  estimatedSeconds: 10
}
```

**Errors**

| Code | HTTP | 說明 |
|---|---|---|
| SYNC_RATE_LIMITED | 429 | 5 分鐘內已觸發過同步 |
| NO_ACTIVE_CONNECTIONS | 422 | 沒有任何 active 連結可同步 |

---

## TRANSACTIONS — 交易

### GET /transactions

查詢交易列表（含篩選、搜尋、分頁）。

**Query Parameters**

| 參數 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `from` | ISO date | 今天 -90 天 | 起始日期 |
| `to` | ISO date | 今天 | 結束日期 |
| `accountId` | UUID | - | 篩選特定帳戶 |
| `type` | `income` \| `expense` | - | 收入/支出篩選 |
| `category` | string | - | 篩選分類 |
| `q` | string | - | 描述關鍵字搜尋（300ms debounce 在前端處理） |
| `page` | integer | 1 | 頁碼 |
| `pageSize` | integer | 50 | 每頁筆數（最大 100） |

**Response 200**

```typescript
PaginatedResponse<{
  id: string;
  accountId: string;
  accountMask: string;
  bankName: string;
  date: string;           // YYYY-MM-DD
  amount: number;         // 正=收入, 負=支出
  type: "income" | "expense";
  description: string;
  category: string | null;
  isManualCategory: boolean;
}>
```

**Errors**

| Code | HTTP | 說明 |
|---|---|---|
| INVALID_DATE_RANGE | 400 | to < from 或範圍超過 12 個月 |

---

### PATCH /transactions/:id/category

手動修改交易分類。

**Request Body**

```typescript
{
  category: string;   // 非空字串
}
```

**Response 200**

```typescript
{
  id: string;
  category: string;
  isManualCategory: true;
}
```

---

## ANALYTICS — 收支分析

### GET /analytics/summary

指定月份的收支摘要。

**Query Parameters**

| 參數 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `month` | `YYYY-MM` | 當月 | 查詢月份 |
| `accountId` | UUID | - | 篩選帳戶（不指定=全部） |

**Response 200**

```typescript
{
  month: string;           // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  netBalance: number;      // totalIncome + totalExpense（支出為負）
  transactionCount: number;
}
```

---

### GET /analytics/trend

近 6 個月收支趨勢。

**Response 200**

```typescript
{
  data: Array<{
    month: string;        // YYYY-MM
    income: number;
    expense: number;
    net: number;
  }>
}
```

---

### GET /analytics/categories

支出依類別佔比。

**Query Parameters**

| 參數 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `month` | `YYYY-MM` | 當月 | 查詢月份 |

**Response 200**

```typescript
{
  month: string;
  totalExpense: number;
  categories: Array<{
    category: string;
    amount: number;
    percent: number;     // 0-100
    transactionCount: number;
  }>
}
```

---

### GET /analytics/recurring

偵測定期支出清單（連續出現 ≥ 2 次的週期性交易）。

**Response 200**

```typescript
{
  data: Array<{
    description: string;
    category: string | null;
    estimatedCycledays: number;   // 估計週期天數（7/30 等）
    lastAmount: number;
    lastDate: string;
    occurrences: number;
  }>
}
```

---

## BUDGET — 預算管理

### GET /budget

查詢預算列表（含本月實際支出）。

**Query Parameters**

| 參數 | 型別 | 預設 |
|---|---|---|
| `month` | `YYYY-MM` | 當月 |

**Response 200**

```typescript
{
  month: string;
  budgets: Array<{
    id: string;
    category: string;
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    usedPercent: number;      // 0~100+（超支時 > 100）
    isOverBudget: boolean;
  }>
}
```

---

### POST /budget

新增或更新某類別預算（同月份 + 類別組合 upsert）。

**Request Body**

```typescript
{
  category: string;
  amount: number;       // > 0
  month: string;        // YYYY-MM
}
```

**Response 200 / 201**

```typescript
{
  id: string;
  category: string;
  amount: number;
  month: string;
}
```

---

### DELETE /budget/:id

刪除預算設定。

**Response 204**

---

### POST /budget/copy-previous

複製上月預算至指定月份。

**Request Body**

```typescript
{
  targetMonth: string;   // YYYY-MM，目標月份
}
```

**Response 200**

```typescript
{
  copied: number;   // 成功複製的類別數
}
```

**Errors**

| Code | HTTP | 說明 |
|---|---|---|
| NO_PREVIOUS_BUDGET | 404 | 上月沒有預算設定 |

---

## ALERTS — 智慧提醒設定

### GET /alerts

列出提醒設定。

**Response 200**

```typescript
{
  data: Array<{
    id: string;
    type: "low_balance" | "large_txn" | "budget_exceed";
    threshold: number | null;
    enabled: boolean;
    accountId: string | null;   // null = 套用全帳戶
    accountMask: string | null;
  }>
}
```

---

### POST /alerts

新增提醒設定。

**Request Body**

```typescript
{
  type: "low_balance" | "large_txn" | "budget_exceed";
  threshold: number;     // low_balance / large_txn 必填
  enabled?: boolean;     // 預設 true
  accountId?: string;    // 僅特定帳戶時填入
}
```

**Response 201**

```typescript
{
  id: string;
  type: string;
  threshold: number | null;
  enabled: boolean;
  accountId: string | null;
}
```

---

### PUT /alerts/:id

更新提醒設定（整筆更新）。Request Body 同 POST。

**Response 200**

---

### DELETE /alerts/:id

刪除提醒設定。

**Response 204**

---

## EXPORT — 資料匯出

### GET /export/csv

匯出交易記錄為 CSV。

**Query Parameters**

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `from` | ISO date | 是 | 起始日期 |
| `to` | ISO date | 是 | 結束日期 |
| `accountId` | UUID | 否 | 篩選帳戶 |

**Response 200**

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="bankhub_YYYYMM_export.csv"

日期,銀行,帳號末四碼,說明,分類,金額,收支類型
2026-09-19,玉山銀行,1234,午餐,餐飲,-180,支出
2026-09-05,玉山銀行,1234,薪資入帳,薪資,68000,收入
```

**Errors**

| Code | HTTP | 說明 |
|---|---|---|
| INVALID_DATE_RANGE | 400 | 範圍超過 12 個月 |
| EXPORT_RATE_LIMITED | 429 | 每分鐘限 3 次 |

---

### GET /export/pdf

產生月結報告 PDF。

**Query Parameters**

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `month` | `YYYY-MM` | 是 | 報告月份 |

**Response 200**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="bankhub_202609_report.pdf"
```

PDF 內容：
1. 月份標題 + 帳戶列表
2. 總覽數字（總收入 / 總支出 / 淨餘額）
3. 支出類別圓餅圖
4. 前 10 大支出交易明細

---

## INTERNAL — 內部端點（不對外）

### POST /internal/sync

由 Vercel Cron 觸發背景同步，需附帶 `X-Internal-Secret` header。

**Headers**

```
X-Internal-Secret: {CRON_SECRET}
```

**Response 200**

```typescript
{
  synced: number;
  errors: Array<{
    connectionId: string;
    error: string;
  }>
}
```
