# 備援派工｜產品需求

## 1. 交付結論

本次交付說明以目前 repository 可執行內容為準：BankHub 已交付 TypeScript 銀行 Adapter core、Mock Bank adapter、資料庫 schema、Compose 設定、架構/API/營運設計文件與自動化測試。`SPEC.md` 與 `IMPLEMENTATION_PLAN.md` 所描述的 Web UI、HTTP API、Plaid/Taiwan Open Banking、預算、提醒、匯出等為規劃範圍，尚非目前可宣稱已完成的產品能力。

本工作單不包含產品實作、外部部署、建立憑證或不可逆操作。

## 2. 交付物與狀態

| 項目 | 狀態 | 證據／位置 |
|---|---|---|
| Bank adapter 介面與資料型別 | 已交付 | `src/adapters/BankAdapter.ts` |
| Mock authorization、帳戶、交易查詢與撤銷流程 | 已交付 | `src/adapters/MockBankAdapter.ts` |
| PostgreSQL schema | 已交付（本地設定） | `database/schema.sql`, `DB_SCHEMA.md` |
| 本地 PostgreSQL Compose 設定 | 已交付（可選） | `compose.yaml`, `.env.example` |
| 架構、API、ADR、營運設計 | 已交付為設計文件 | `ARCHITECTURE.md`, `API_SPEC.md`, `docs/adr/`, `docs/OPERATIONS.md` |
| 自動化型別與測試驗證 | 已交付 | `tests/`, `QA_REPORT.md` |
| Web UI / HTTP API server | 未交付 | `package.json` 無 `start`、`dev` 或 server entrypoint |
| 真實銀行整合與外部部署 | 未交付 | 規劃於 `SPEC.md` / `IMPLEMENTATION_PLAN.md` |

## 3. 可驗收規格（本次基線）

1. `BankAdapter` 能交換授權碼，取得授權資料、帳戶及交易。
2. Mock adapter 能依帳戶與日期範圍查詢交易，日期邊界為包含式，結果按最新日期優先。
3. 撤銷授權後，後續資料存取會被拒絕。
4. 未知 authorization code 會回傳明確錯誤，且不洩漏憑證。
5. 回傳的帳戶、交易資料與 fixture 狀態隔離，呼叫端修改結果不會污染來源資料。
6. Node.js 執行版本符合 `>=22 <25`，TypeScript 編譯與既有測試可通過。

以上僅代表目前 core 的驗收基線，不等同 `SPEC.md` 全部 F1–F7 功能已完成。

## 4. 驗證證據

- 本階段重新執行 `npm run verify`：exit code `0`。
- `typecheck` 通過。
- Mock adapter 測試：5 pass、0 fail。
- QA regression 測試：3 pass、0 fail。
- 測試涵蓋資料隔離、日期邊界、撤銷後拒絕存取、未知授權碼錯誤不洩漏 token。
- 既有 `QA_REPORT.md` 記錄：Node.js `v24.12.0`、npm `11.6.2`、TypeScript `5.9.3`；Compose 設定驗證通過。

## 5. 已知限制與排除

- 沒有可啟動的 Web UI、HTTP API 或應用程式 server，因此不可宣稱 Dashboard、OAuth UI、API endpoints 或瀏覽器流程已可用。
- 尚未實作 Plaid、台灣 Open Banking、背景同步、Redis、認證、預算、提醒、分析與 CSV/PDF 匯出。
- PostgreSQL 僅是可選的本地資料庫設定；本次未啟動容器，也未驗證完整應用程式資料流。
- `npm install` 在既有 QA 環境因 offline cache 缺少 TypeScript 而失敗；本次驗證使用環境中已可用的 TypeScript 執行。
- `README.md`、`SPEC.md` 與既有報告存在編碼損壞跡象；本次以 `package.json`、Compose、環境範例與可執行測試作為判定依據。

## 5A. 架構師接續子任務

下一階段以 `IMPLEMENTATION_PLAN.md` 的 Phase 0 為入口：先確認 Next.js/API server 是否獲得範圍核准，再依序處理 P0-1 至 P0-5。任何由規劃能力轉為已交付能力的宣稱，都必須補上對應的可執行 artifact、測試與驗證命令。

## 6. 交接步驟

1. 在可連網環境執行 `npm install`，再執行 `npm run verify`。
2. 若需本地資料庫，複製 `.env.example` 為 `.env`，設定本機密碼後執行 `docker compose up -d postgres`；不得提交 `.env` 或真實憑證。
3. 架構師下一階段應先確認是否把規劃中的 Next.js/API server 納入實作範圍，再依 `IMPLEMENTATION_PLAN.md` 的 P0 任務建立可執行骨架。
4. 在宣稱生產就緒前，需另行驗證安全、效能、個資法、可用性與真實銀行整合需求。

## 7. 待人類決策

- 交付說明是否只呈現目前已實作 core（本文件預設），或同時以「規劃中」章節呈現完整 PRD 路線圖。
- 是否批准新增 Web UI/API server 與相關基礎設施實作範圍。
- 是否批准真實銀行整合、部署環境、正式憑證及生產安全審查；這些不在本工作單授權內。
