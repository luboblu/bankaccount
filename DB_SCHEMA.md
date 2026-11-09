# BankHub — 資料庫 Schema 設計說明

> 版本：v1.0 | 日期：2026-09-20 | 撰寫：Orion (軟體架構)
> Schema 來源：`database/schema.sql`

---

## 設計原則

1. **用戶隔離**：每張業務資料表均含 `user_id UUID NOT NULL`，所有查詢強制附加 `WHERE user_id = $1`
2. **CASCADE DELETE**：刪除 user 即清空所有關聯資料（符合個資法刪除請求）
3. **不存明文 Token**：`bank_connections.access_token_enc` 只存應用層 AES-256-GCM 加密後的密文
4. **CHECK constraints**：對枚舉型欄位、金額正負、日期格式做 DB 層防護

---

## 資料表：users

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| 欄位 | 說明 |
|---|---|
| `id` | 主鍵，UUID v4，所有外鍵參照此欄 |
| `email` | 唯一索引，Login 識別符 |
| `name` | 顯示名稱，可 null（Google OAuth 可自動填入） |
| `created_at` | 帳號建立時間 |

---

## 資料表：bank_connections

```sql
CREATE TABLE bank_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name        TEXT NOT NULL,
  provider         TEXT NOT NULL CHECK (provider IN ('plaid', 'taiwan_ob', 'mock')),
  access_token_enc TEXT NOT NULL,
  item_id          TEXT,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'expired', 'error')),
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bank_connections_user ON bank_connections(user_id);
```

| 欄位 | 說明 |
|---|---|
| `user_id` | 外鍵，帳戶擁有者 |
| `bank_name` | 用戶可識別的銀行名稱（如「玉山銀行」） |
| `provider` | 整合來源：`plaid` / `taiwan_ob` / `mock`；新增 provider 時需更新 CHECK constraint |
| `access_token_enc` | 應用層 AES-256-GCM 加密的 access token，格式：`base64(iv).base64(ciphertext).base64(authTag)` |
| `item_id` | Plaid 的 `item_id` 或 Open Banking 的 account item identifier；null 表示 provider 不需要 |
| `status` | `active`：連結正常；`expired`：token 過期需重新授權；`error`：連續同步失敗 |
| `last_synced_at` | 最後一次成功同步時間；null 表示從未同步 |

**業務規則**：單一用戶最多 10 個連結（在應用層強制，非 DB 約束）

---

## 資料表：accounts

```sql
CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('checking', 'savings')),
  currency      CHAR(3) NOT NULL DEFAULT 'TWD',
  balance       NUMERIC(15,2) NOT NULL DEFAULT 0,
  mask          VARCHAR(4) NOT NULL CHECK (mask ~ '^[0-9]{4}$'),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, external_id)
);
CREATE INDEX idx_accounts_user ON accounts(user_id);
```

| 欄位 | 說明 |
|---|---|
| `connection_id` | 所屬銀行連結；連結刪除時帳戶一併刪除 |
| `user_id` | 冗餘欄位，加速查詢（免 JOIN bank_connections） |
| `external_id` | 銀行端帳戶 ID，與 `connection_id` 聯合唯一 |
| `type` | `checking`：活期；`savings`：定存/儲蓄 |
| `currency` | ISO 4217 三字元幣別，預設 TWD |
| `balance` | 最新同步餘額，NUMERIC(15,2) 避免浮點誤差 |
| `mask` | 帳號末四碼，REGEX 確保恰好 4 位數字 |
| `updated_at` | 最後餘額更新時間（由應用層在同步時更新） |

---

## 資料表：transactions

```sql
CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id       TEXT NOT NULL,
  date              DATE NOT NULL,
  amount            NUMERIC(15,2) NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT,
  is_manual_category BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, external_id)
);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
```

| 欄位 | 說明 |
|---|---|
| `account_id` | 所屬帳戶；帳戶刪除時交易一併刪除 |
| `user_id` | 冗餘欄位，加速查詢 |
| `external_id` | 命名規則：`{provider}_{rawId}`（如 `plaid_TxnABC`、`taiwan_ob_TXN9876`）；與 `account_id` 聯合唯一，防重複入庫 |
| `date` | 交易日（DATE 型別，非 TIMESTAMPTZ），避免時區混淆 |
| `amount` | 正數 = 收入；負數 = 支出；NUMERIC(15,2) 避免浮點誤差 |
| `description` | 交易說明（原始銀行文字），分類規則引擎的輸入 |
| `category` | 分類標籤（餐飲、交通、薪資⋯），null 表示未分類 |
| `is_manual_category` | `true` 表示用戶手動改過分類，同步時不覆蓋 |

**索引說明**：`idx_transactions_user_date (user_id, date DESC)` 支援最常見的查詢模式——依用戶取最近 N 筆交易，date DESC 對應 ORDER BY date DESC 掃描。

---

## 資料表：budgets

```sql
CREATE TABLE budgets (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount   NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  month    DATE NOT NULL CHECK (month = date_trunc('month', month)::date),
  UNIQUE (user_id, category, month)
);
```

| 欄位 | 說明 |
|---|---|
| `category` | 與 `transactions.category` 使用相同字串值（如「餐飲」） |
| `amount` | 月度預算金額，CHECK 強制必須 > 0 |
| `month` | 永遠存月份第一天（`YYYY-MM-01`），CHECK constraint 防止非月份首日的值寫入 |

**聯合唯一**：`(user_id, category, month)` 確保每用戶每月每類別只有一筆預算（應用層可做 upsert）。

---

## 資料表：alert_settings

```sql
CREATE TABLE alert_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('low_balance', 'large_txn', 'budget_exceed')),
  threshold  NUMERIC(15,2) CHECK (threshold IS NULL OR threshold >= 0),
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX idx_alert_settings_user ON alert_settings(user_id);
```

| 欄位 | 說明 |
|---|---|
| `type` | 提醒類型：`low_balance`（低餘額）/ `large_txn`（大額交易）/ `budget_exceed`（超支） |
| `threshold` | 觸發閾值；`budget_exceed` 類型不需要 threshold（null），應用層負責與預算比對 |
| `enabled` | 可個別關閉通知 |
| `account_id` | null = 套用全帳戶；指定 UUID = 僅監控該帳戶（低餘額與大額交易適用） |

---

## Entity-Relationship 概覽

```
users
  └── bank_connections (user_id FK, CASCADE)
        └── accounts (connection_id FK, user_id FK, CASCADE)
              └── transactions (account_id FK, user_id FK, CASCADE)
  └── budgets (user_id FK, CASCADE)
  └── alert_settings (user_id FK, CASCADE)
                └── [account_id FK → accounts, nullable]
```

---

## 索引策略

| 索引 | 表 | 目的 |
|---|---|---|
| `idx_bank_connections_user` | bank_connections | 列出用戶連結；同步時載入 active 連結 |
| `idx_accounts_user` | accounts | Dashboard 載入全帳戶；總資產計算 |
| `idx_transactions_user_date` | transactions | 交易列表（user_id 過濾 + date DESC 排序） |
| `idx_alert_settings_user` | alert_settings | 同步後載入提醒設定觸發檢查 |

---

## Migration 策略

- 初始建立：直接執行 `database/schema.sql`
- 後續變更：使用有序遷移腳本（`database/migrations/001_xxx.sql`），不直接修改 schema.sql
- `provider` CHECK constraint 新增 provider 時需對應 migration：`ALTER TABLE bank_connections DROP CONSTRAINT ...; ALTER TABLE ... ADD CONSTRAINT ... CHECK (provider IN ('plaid', 'taiwan_ob', 'mock', 'new_provider'));`
- Supabase：使用 Supabase Migration CLI 管理版本，`supabase db push` 套用至遠端
