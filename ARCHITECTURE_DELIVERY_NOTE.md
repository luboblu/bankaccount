# 備援派工｜軟體架構

## 1. 交付結論

本階段完成 BankHub 現況的架構交付核對。現有可執行交付物是 TypeScript 銀行 Adapter core、Mock Bank adapter、Node 測試、PostgreSQL schema 與本機 Compose 設定；`ARCHITECTURE.md`、`API_SPEC.md`、`DB_SCHEMA.md` 及 ADR/營運文件則是後續產品實作的設計基線。

目前不可宣稱已交付 Web UI、HTTP API server、OAuth 使用者流程、真實銀行整合、背景同步、預算/提醒/分析或 CSV/PDF 匯出。這些能力在 `SPEC.md` 與實作計畫中屬於規劃範圍，未在本工作單新增實作。

## 2. 架構與實作邊界

| 面向 | 已核對結果 | 依據 |
|---|---|---|
| Adapter 介面 | 已存在；支援授權交換、帳戶、交易查詢、撤銷 | `src/adapters/BankAdapter.ts` |
| Mock provider | 已存在，含授權隔離、日期範圍、帳戶過濾與撤銷 | `src/adapters/MockBankAdapter.ts` |
| 持久化模型 | 已設計，含 users、bank_connections、accounts、transactions、budgets、alert_settings | `database/schema.sql`, `DB_SCHEMA.md` |
| 目標 API 契約 | 已文件化，尚無對應 server entrypoint | `API_SPEC.md` |
| 目標部署拓撲 | 已文件化為 Next.js + PostgreSQL + Redis + Cron 的目標方案 | `ARCHITECTURE.md` |
| 可啟動應用程式 | 尚未存在；`package.json` 無 `start`/`dev`，`src/` 無 HTTP/UI 入口 | `package.json`, `src/` |

## 3. 技術決策與取捨

- 沿用 TypeScript 與既有 `BankAdapter` 介面，將銀行供應商差異隔離在 adapter 層，保留 Mock → Plaid → 台灣 Open Banking 的替換路徑。
- PostgreSQL schema 先以使用者隔離、外鍵 cascade、唯一鍵與索引建立資料邊界；正式上線前仍須由實作階段補上 migration pipeline、加密金鑰管理、RLS/應用層授權與備份還原演練。
- Next.js、Redis、Supabase/Vercel、Cron 等目前是設計選項，不是已安裝或已驗證的執行依賴。若採用，需在下一階段建立可運行骨架、健康檢查與整合測試；若部署平台改變，應新增 ADR 記錄成本、風險與回復方案。

## 4. 驗證證據

於 2026-09-21 在目前工作目錄重新執行：

- `npm run verify`：exit code 0。
- `npm run typecheck`：通過。
- Mock adapter 測試：5/5 通過。
- QA regression 測試：3/3 通過。
- 驗證涵蓋資料隔離、交易日期雙邊界、未知帳戶/日期範圍拒絕、撤銷後拒絕存取，以及錯誤訊息不洩漏 authorization token。

以上證據只覆蓋目前 core，不代表 `SPEC.md` F1–F7 全部驗收完成，也不代表生產安全、效能、可用性或真實銀行 API 已驗證。

## 5. 交付物

- `ARCHITECTURE_DELIVERY_NOTE.md`：本階段架構現況、邊界、驗證與交接說明。
- 已核對的設計基線：`ARCHITECTURE.md`、`API_SPEC.md`、`DB_SCHEMA.md`、`docs/adr/`、`docs/OPERATIONS.md`。
- 已核對的可執行基線：`src/adapters/`、`database/schema.sql`、`tests/`、`package.json`。

本階段未修改產品程式碼、資料庫資料、部署環境或憑證，並保留既有使用者變更。

## 6. 下一階段注意事項

1. 先取得人類對 Phase 0（Next.js/API server、資料庫連線）的明確範圍核准，再建立可啟動骨架；不要以目前設計文件宣稱已有 UI/API。
2. 建立 server 後，先把 `API_SPEC.md` 的認證、使用者隔離、錯誤格式與 pagination 契約轉成整合測試。
3. 實作真實 provider 前，完成 token 加密/輪換、secret 管理、provider timeout/retry、rate limit、同步冪等與 migration/rollback 設計。
4. 在宣稱生產就緒前，補做資料庫整合、效能（Dashboard <3s、交易首屏 <2s）、安全、個資刪除、備份還原與可用性驗證。

## 7. 待人類決策

- 是否批准新增 Web UI/API server 與其執行依賴。
- 下一階段選定 Supabase/Vercel/Upstash，或改採其他部署與資料服務組合。
- 是否批准真實銀行整合、正式憑證、TPP 申請與生產安全審查。
