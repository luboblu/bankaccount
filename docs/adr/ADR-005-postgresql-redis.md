# ADR-005 — PostgreSQL + Redis 技術組合

> 狀態：已採用 | 日期：2026-09-20

## 背景

需選擇持久化資料庫與快取層技術。

## 決策

- **持久化**：PostgreSQL（Supabase 託管）
- **快取 / 鎖**：Redis（Upstash Serverless Redis）

## 理由

### PostgreSQL

- 金融資料高度結構化（帳戶、交易、預算），關聯式模型最自然
- `NUMERIC(15,2)` 避免 JavaScript 浮點誤差，對金額計算至關重要
- UNIQUE constraints 保護交易不重複入庫
- Supabase 提供 Row-Level Security 作為額外的資料隔離層
- CHECK constraints 在 DB 層強制枚舉值（provider、status 等）

### Redis

- 帳戶餘額與交易列表是高頻讀取、低頻寫入的資料，TTL 快取效果顯著
- SETNX 實作分散式鎖（同步鎖、速率限制），原子操作語意清楚
- Upstash Serverless 相容 Vercel Serverless Functions（連線池問題已解決）

## 取捨

- PostgreSQL 需管理 Schema migration（vs. NoSQL 無 schema 的靈活性）；金融資料結構穩定，此取捨合理
- Redis 為單點快取，不可用時降級直讀 DB；已在 ARCHITECTURE.md 中設計降級路徑

## 替代方案（排除）

- **MongoDB**：金融資料不適合文件型資料庫，JOIN 查詢效率差
- **PlanetScale (MySQL)**：缺少 `gen_random_uuid()`，NUMERIC 支援不如 PostgreSQL 完整
- **無 Redis**：Dashboard 載入完全依賴 DB，1,000 concurrent users 時 DB 壓力過大
