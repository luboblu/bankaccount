# 備援派工｜前端工程師

> 對象：BankHub 專案交付說明（前端實作面向） | 日期：2026-09-21

## 1. 交付結論

本工作單是「大總管」機器可讀派工格式修復失敗後的備援執行，範圍限定於以**前端工程師**職責，為人類原始需求「產生專案交付說明」補上**前端實作現況**。

結論：**BankHub 目前沒有任何可執行或可互動的前端程式碼。** repository 中不存在 React／Vue／任何 UI 框架的專案骨架、元件、路由、狀態管理或樣式系統（Tailwind CSS 等），也沒有 `.tsx`／`.jsx`／`.vue`／`.html`／`.css`／`.scss` 檔案。`package.json` 沒有 `start`／`dev` 腳本，`src/` 底下只有 `adapters/`（`BankAdapter.ts`、`MockBankAdapter.ts`、`index.ts`）這一組後端銀行資料轉接層，沒有任何 HTTP server 或前端入口可供串接。

前端工程師的核心職責是「將設計師的樣式指南與架構師的 API 規格，實作成能與後端互動的動態網頁」——但目前**設計師尚未產出樣式指南／wireframe／design token**（見 `UIUX_DELIVERY_NOTE.md` §2、§7，待人類核准設計階段），**也沒有可呼叫的後端 API server**（`API_SPEC.md` 是規劃中的契約文件，非已部署的 endpoint；見 `ARCHITECTURE_DELIVERY_NOTE.md`、`SOFTWARE_DELIVERY_NOTE.md`）。因此前端實作缺少兩項必要輸入，本工作單依職務章程**不擴張原始需求**，不自行代替設計師或架構師產生輸入後動手實作 UI。

本工作單未新增任何前端框架依賴、元件、樣式或建置設定；未修改 `src/`、`tests/`、`database/`；既有使用者變更原樣保留。本次唯一新增檔案為本說明文件。

## 2. 前端交付盤點

| 項目 | 狀態 | 依據 |
|---|---|---|
| 前端框架骨架（React/Next.js/Vue 等） | 未交付 | `package.json` 無 `next`／`react`／`vue` 等相依套件；`ARCHITECTURE.md:62` 僅將 Next.js App Router 列為目標方案 |
| 樣式系統／Design token | 未交付 | 全庫無 `tailwind.config.*`、無 CSS/SCSS 檔；`UIUX_DELIVERY_NOTE.md` 確認尚未產出調色盤／字體／間距規範 |
| 前端元件（Dashboard、交易列表、圖表、預算進度條等） | 未交付 | 全庫無 `.tsx`／`.jsx`／`.vue` 檔案 |
| API 串接層（fetch/client SDK） | 未交付 | 無對應後端 server；`API_SPEC.md` 之 endpoint 未有可呼叫的實作 |
| `start`／`dev` 開發伺服器腳本 | 未交付 | `package.json` scripts 僅 `build`、`typecheck`、`test`、`test:qa`、`verify` |
| 前端可用的資料契約（設計輸入） | 已文件化，未串接 | `API_SPEC.md` AUTH／BANKS／ACCOUNTS／TRANSACTIONS／ANALYTICS／BUDGET／ALERTS／EXPORT 各節 |
| 畫面清單與驗收約束（設計輸入） | 已文件化，未落地為元件 | `UIUX_DELIVERY_NOTE.md` §3、§4 |
| 後端資料轉接層（前端未來會串接的對象，但目前是 core library 非 HTTP API） | 已存在 | `src/adapters/BankAdapter.ts`、`src/adapters/MockBankAdapter.ts` |

## 3. 前端實作的必要前置缺口（引用既有報告，非新增判斷）

1. **無樣式指南／design token**：`UIUX_DELIVERY_NOTE.md` §7 待人類決定是否啟動 UI/UX 設計階段，尚無調色盤、字級、間距、元件規格可供前端對照實作，也未定案是否採用既有設計系統。
2. **無可呼叫的後端 API server**：`API_SPEC.md` 定義的 endpoint 目前沒有對應的 HTTP server 實作；`src/adapters/` 是尚未包裝成 API 的 TypeScript 介面。`ARCHITECTURE_DELIVERY_NOTE.md` §7 待人類核准是否新增 Web UI/API server。
3. **無前端框架骨架核准**：`IMPLEMENTATION_PLAN.md` Phase 0（Next.js 專案骨架）尚未取得人類範圍核准；`SOFTWARE_DELIVERY_NOTE.md` §6 明確標註推進 Phase 0 需先取得產品／架構範圍核准，不在既有工作單授權內。

在以上三項缺口未由人類或對應角色補齊前，前端工程師若逕自建立框架骨架、自訂樣式或假設 API 回應格式，將產生與後續正式設計/架構決策不一致的返工風險，因此本工作單不代為決定。

## 4. 驗證證據（本次實際執行）

- 全庫掃描（排除 `node_modules`、`dist`、`.git`）共 30 個檔案，`.tsx`／`.jsx`／`.vue`／`.html`／`.css`／`.scss` 命中數為 **0**，據此判定「無前端實作」而非沿用前手報告數字。
- `package.json` 核對：`dependencies`／`devDependencies` 僅有 `typescript`；無任何前端框架或建置工具（webpack/vite/next 等）套件宣告。
- 獨立重新執行 `node -v`：`v24.12.0`，符合 `package.json` 宣告之 `engines.node ">=22 <25"`。
- 獨立重新執行 `npm run verify`（`typecheck` → `test` → `test:qa`）：
  - `tsc -p tsconfig.json --noEmit`：無錯誤，型別檢查通過。
  - `npm test`：Mock adapter 測試 5 pass / 0 fail。
  - `npm run test:qa`：QA regression 測試 3 pass / 0 fail。
- 上述驗證只證明既有 TypeScript adapter core 與測試在本次操作後仍維持通過；**不構成任何前端功能、可用性或畫面驗證**，因為目前沒有前端程式碼可供測試。
- 本次未安裝任何套件、未執行 `docker compose up`、未修改 `src/`、`tests/`、`database/` 或既有文件。

## 5. 交付物

- `FRONTEND_DELIVERY_NOTE.md`（本文件）：前端實作現況、缺口與交接說明。
- 未新增任何前端程式碼、樣式檔、框架設定或依賴。

## 6. 下一階段注意事項

1. **不得以本文件宣稱前端已交付。** 前端目前是規劃輸入（`SPEC.md` F1–F7、`API_SPEC.md`），沒有任何可執行畫面。
2. 前端框架骨架的建立，需等待：（a）人類核准 `IMPLEMENTATION_PLAN.md` Phase 0 範圍，（b）架構角色提供可呼叫的 API server 或明確的本地開發串接方式（如 mock server），兩者缺一時前端不應自行假設。
3. 樣式與元件實作需等待 UI/UX 角色產出 design token 與 wireframe（`UIUX_DELIVERY_NOTE.md` §6 建議順序：IA → wireframe → design token → 元件規格 → 前端組件），避免先寫死顏色與版面後續返工。
4. 一旦取得骨架核准與 API 規格，前端串接時應直接對齊 `API_SPEC.md` 既有欄位命名與分頁／篩選契約，不應自創資料格式；金額、日期、幣別格式需與後端一致（`UIUX_DELIVERY_NOTE.md` §6）。
5. 帳號顯示只取末四碼、連結失敗訊息不得洩漏 token／帳號全碼等約束，已在 core 層以測試守住（`tests/qa-regression.test.js`），前端文案與畫面呈現不得反向洩漏這些資訊。
6. 建議由 PM 角色將本文件與 `DELIVERY_BRIEF.md`、`QA_REPORT.md`、`ARCHITECTURE_DELIVERY_NOTE.md`、`SOFTWARE_DELIVERY_NOTE.md`、`DEVOPS_DELIVERY_NOTE.md`、`UIUX_DELIVERY_NOTE.md` 合併去重為單一對外交付說明，避免交付文件分散。

## 7. 待人類決策

- 是否核准啟動前端框架骨架（`IMPLEMENTATION_PLAN.md` Phase 0）及其技術選型（Next.js 等）。
- 是否核准啟動 UI/UX 設計階段，為前端提供樣式指南與 wireframe（與 `UIUX_DELIVERY_NOTE.md` §7 為同一待決事項，不重複裁決）。
- 是否核准新增可呼叫的後端 API server，讓前端有實際串接對象（與 `ARCHITECTURE_DELIVERY_NOTE.md` §7 為同一待決事項，不重複裁決）。
- 是否將本文件與既有備援交付說明合併為單一對外文件。
