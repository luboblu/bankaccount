# 備援派工｜軟體開發

## 1. 交付結論

本工作單為「大總管」機器可讀派工格式修復失敗後的備援執行，範圍限定於以「軟體開發」職責對 BankHub 目前的原始碼與既有交付說明（`DELIVERY_BRIEF.md`、`QA_REPORT.md`）進行獨立技術驗證，確認其宣稱與 repository 實際內容一致，不擴張 `SPEC.md` / `IMPLEMENTATION_PLAN.md` 所定義的原始需求範圍。

本次未新增、修改任何產品程式碼；未新增 Web UI、API server 或其他 `SPEC.md` 尚列為規劃中的能力。既有使用者變更（`src/`、`tests/`、`database/`、文件）原樣保留。

## 2. 驗證方法

以 `SPEC.md`、`IMPLEMENTATION_PLAN.md` 為需求基準，逐一核對 `package.json` 宣告腳本與 `src/`、`tests/` 實際內容，並重新執行既有驗證指令取得獨立證據，不沿用前手報告數字。

## 3. 交付物核對結果

| 項目 | 核對結果 | 依據 |
|---|---|---|
| `BankAdapter` 介面（授權、帳戶、交易、撤銷） | 與文件宣稱一致 | `src/adapters/BankAdapter.ts:39-48` 定義 `exchangeAuthorizationCode`、`getAccounts`、`getTransactions`、`revoke` |
| 錯誤型別涵蓋授權失效／日期範圍錯誤／未知帳戶 | 與文件宣稱一致 | `src/adapters/BankAdapter.ts:50-62` `BankAdapterError` |
| Mock adapter 實作 | 存在且測試通過 | `src/adapters/MockBankAdapter.ts`、`tests/mock-bank-adapter.test.js` |
| `verify` 聚合腳本（typecheck + test + test:qa） | 腳本存在且可執行 | `package.json:9-15` |
| Web UI / HTTP API / `start`／`dev` 腳本 | 確認不存在，與既有交付說明一致 | `package.json` scripts 僅有 `build`、`typecheck`、`test`、`test:qa`、`verify` |
| PostgreSQL schema／Compose 本地設定 | 檔案存在，本次未啟動容器 | `database/schema.sql`、`compose.yaml`、`.env.example` |

未發現既有 `DELIVERY_BRIEF.md`／`QA_REPORT.md` 與目前原始碼之間的不一致。

## 4. 驗證證據（本次重新執行）

指令：`npm run verify`（即 `typecheck` → `test` → `test:qa`）

結果：
- `tsc -p tsconfig.json --noEmit`：無錯誤輸出，型別檢查通過。
- `npm test`（build + `tests/mock-bank-adapter.test.js`）：5 個測試全數通過（授權隔離、日期邊界含端點、拒絕無效日期範圍與未知帳戶、撤銷後拒絕存取、未知授權碼不洩漏憑證）。
- `npm run test:qa`（build + `tests/qa-regression.test.js`）：3 個測試全數通過（資料隔離、雙邊日期邊界、撤銷 token 後錯誤訊息不洩漏 token）。
- 執行環境：Node.js `v24.12.0`、npm `11.6.2`，符合 `package.json` 宣告之 `engines.node ">=22 <25"`。

本次未執行 `docker compose up`，未變更任何資料庫狀態，亦未安裝或變更 `node_modules`。

## 5. 已知限制（延續前手報告，未新增範圍）

- 目前無 `start`／`dev` 腳本與可執行的 Web UI／HTTP API，`SPEC.md` F1–F7 功能仍為規劃項目，非本次已交付能力。
- 未整合 Plaid、台灣 Open Banking、Redis、認證、預算、提醒、分析、CSV/PDF 匯出等 `IMPLEMENTATION_PLAN.md` 所列 Phase 0 之後項目。
- 本次沒有安裝依賴（環境已具備可用 TypeScript），故不含 `npm install` 的網路可用性驗證。

## 6. 交接事項（給下一位員工）

1. 本檔案與 `DELIVERY_BRIEF.md`、`QA_REPORT.md` 三份備援交付說明的技術宣稱已交叉核對一致，可作為「目前 core 已交付」的共同依據。
2. 若下一階段要推進 `IMPLEMENTATION_PLAN.md` Phase 0（Next.js/API server 骨架），需先取得產品／架構範圍核准，這不在本工作單授權內。
3. 若要對外呈現整合後的最終交付說明，建議由 PM 角色將本檔案、`DELIVERY_BRIEF.md`、`QA_REPORT.md` 三者合併去重後對外發佈，避免重複或分散的交付文件造成混淆。

## 7. 待人類決策

- 是否核准將 `IMPLEMENTATION_PLAN.md` Phase 0（Next.js 專案骨架、API server、資料庫連線）正式排入下一階段實作範圍。
- 是否需要將本檔案與既有兩份備援交付說明合併為單一對外文件。
- 是否核准安裝依賴（`npm install`）於可連網環境並補上 `package-lock.json`，以利後續 CI 可重現建置。
