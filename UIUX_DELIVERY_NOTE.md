# 備援派工｜UI/UX 設計師

> 對象：BankHub 專案交付說明（UI/UX 面向） | 日期：2026-09-21

## 1. 交付結論

本工作單是「大總管」機器可讀派工格式修復失敗後的備援執行，範圍限定於以 UI/UX 設計師職責，為人類原始需求「產生專案交付說明」補上**介面與設計面的交付現況**。

結論：**BankHub 目前沒有任何已交付的 UI/UX 資產。** repository 中不存在線框圖、資訊架構文件、調色盤／字體／間距 token、元件庫，也沒有任何 HTML/CSS/前端組件檔案；`package.json` 沒有 `start`／`dev` 腳本，因此沒有可預覽或可驗收的畫面。`SPEC.md` F1–F7 所描述的 Dashboard、交易列表、分析圖表、預算進度條、提醒設定與匯出畫面，全部仍屬**規劃需求**，不是已完成的介面。

本工作單未新增任何 UI 實作、樣式、資產或前端依賴，未擴張 `SPEC.md` / `IMPLEMENTATION_PLAN.md` 原始需求，既有使用者變更原樣保留。本次唯一新增檔案為本說明文件。

## 2. UI/UX 交付盤點

| 項目 | 狀態 | 證據 |
|---|---|---|
| 線框圖（Wireframe） | 未交付 | 全庫掃描無 `.fig`／`.png`／`.svg`／wireframe 檔 |
| 資訊架構（IA）／導覽結構 | 未交付 | 僅 `SPEC.md` §5 有文字版關鍵路徑，無畫面層級 IA |
| 調色盤、字體、間距（Spacing）規範 | 未交付 | 全庫無 design token、`tailwind.config.*` 或樣式變數定義 |
| 按鈕／卡片／表單等元件規格 | 未交付 | 全庫無元件檔 |
| HTML/CSS 雛形或前端組件 | 未交付 | 全庫無 `.html`／`.css`／`.scss`／`.tsx`／`.jsx`／`.vue` |
| 可預覽／可點擊的 UI | 未交付 | `package.json` scripts 僅 `build`、`typecheck`、`test`、`test:qa`、`verify` |
| 前端技術基線（設計文件，非實作） | 已文件化 | `ARCHITECTURE.md:62` Next.js App Router + Server Components；`ARCHITECTURE.md:329` Tailwind breakpoints、Recharts responsive container |
| 畫面需求來源（設計輸入） | 已文件化 | `SPEC.md` F1–F7 驗收條件、§4 非功能需求、§5 使用者旅程 |
| 後端契約（設計可對齊的資料欄位） | 已文件化 | `API_SPEC.md` AUTH／BANKS／ACCOUNTS／TRANSACTIONS／ANALYTICS／BUDGET／ALERTS／EXPORT 各節 |

## 3. 由既有需求推導的畫面清單（設計待辦，非新需求）

下表僅是把 `SPEC.md` 既有功能與 `API_SPEC.md` 既有契約對映成畫面單位，方便下一階段接手；不新增任何功能範圍。

| 畫面 | 來源需求 | 對應 API 契約 | 設計狀態 |
|---|---|---|---|
| 註冊／登入 | `SPEC.md` §5 使用者旅程 | `POST /auth/signup`、`POST /auth/login`、`GET /auth/session` | 未開始 |
| 銀行連結與 OAuth 導流／重新授權 | F1.1–F1.4 | `GET /banks`、`POST /banks/link-token`、`POST /banks`、`POST /banks/:id/reauth`、`DELETE /banks/:id` | 未開始 |
| Dashboard 總覽（總資產、帳戶卡片、餘額圓餅圖、重整） | F2.1–F2.4 | `GET /accounts`、`GET /accounts/summary`、`POST /accounts/sync` | 未開始 |
| 交易列表（篩選、搜尋、無限捲動、改分類） | F3.1–F3.4、F4.1 | `GET /transactions`、`PATCH /transactions/:id/category` | 未開始 |
| 收支分析（月度摘要、趨勢長條圖、類別圓餅圖） | F4.2–F4.4 | `GET /analytics/summary`、`/analytics/trend`、`/analytics/categories` | 未開始 |
| 預算管理（設定、進度條、超支警示） | F5.1–F5.3 | `GET/POST /budget`、`DELETE /budget/:id`、`POST /budget/copy-previous` | 未開始 |
| 提醒設定（低餘額、大額交易、定期支出清單） | F6.1–F6.3 | `GET/POST/PUT/DELETE /alerts`、`GET /analytics/recurring` | 未開始 |
| 資料匯出（CSV／月結 PDF） | F7.1–F7.2 | `GET /export/csv`、`GET /export/pdf` | 未開始 |

## 4. 設計必須遵守的既有驗收約束（引用，非新增）

- 響應式範圍：手機 375px+ 至桌面 1280px+（`SPEC.md` §4；`ARCHITECTURE.md:329`）。
- 效能預算：Dashboard 初次載入 < 3s、交易列表首屏 < 2s（`SPEC.md` §4；`ARCHITECTURE.md:324`）。設計時的圖表數量、圖片與字體載入策略須留在此預算內。
- 空狀態：尚未連結任何銀行時，Dashboard 需顯示引導 CTA（F2 驗收條件）。
- 交易列表：預設最近 90 天、每頁 50 筆無限捲動、搜尋 debounce 300ms（F3）。
- 狀態語意：連結狀態（正常／授權過期／錯誤）、收支顏色區分、超支進度條轉紅（F1.2、F3.1、F5.2–F5.3）。
- 錯誤揭露：連結失敗需顯示明確原因，且錯誤訊息不得洩漏 token — 此約束已在 core 層以測試守住（`tests/qa-regression.test.js`），UI 文案不得反向把 token 或帳號全碼顯示出來；帳號一律只顯示末四碼（F2.2、`SPEC.md` §8）。

## 5. 驗證證據（本次實際執行）

- 全庫檔案掃描（排除 `node_modules`）共 37 個檔案，其中 `.html`／`.css`／`.scss`／`.tsx`／`.jsx`／`.vue`／`.svg`／`.png`／`.fig` 的命中數為 **0**，據此判定「無 UI/UX 資產」而非依賴前手報告。
- `package.json` scripts 核對：只有 `build`、`typecheck`、`test`、`test:qa`、`verify`，無 `start`／`dev`，確認沒有可啟動的畫面可供設計驗收。
- 重新執行 `npm run verify`：`typecheck` 通過；Mock adapter 測試 5 pass / 0 fail；QA regression 測試 3 pass / 0 fail。執行環境 Node.js `v24.12.0`、npm `11.6.2`，符合 `engines.node ">=22 <25"`。
- 上述驗證只證明 core 與既有測試在本次未被破壞；**不構成任何 UI 可用性、視覺或 a11y 驗證**，目前也不存在可供驗證的畫面。
- 本次未執行 `docker compose up`、未安裝或變更依賴、未修改 `src/`、`tests/`、`database/` 及既有文件。

## 6. 下一階段注意事項

1. **不得以本文件或 `ARCHITECTURE.md` 宣稱 UI 已交付。** 設計文件化的 Next.js／Tailwind／Recharts 是目標方案，不是已安裝或已驗證的執行依賴。
2. 進行任何設計實作前，需先取得人類對 `IMPLEMENTATION_PLAN.md` Phase 0（Next.js 骨架）的範圍核准；UI/UX 產出若早於骨架，應限定為**不可執行的規格文件**（IA、wireframe、token 表），不要先寫散落的 HTML/CSS。
3. 建議順序：資訊架構 → 關鍵畫面 wireframe → design token（色／字／間距）→ 元件規格 → 前端組件。design token 應與 Phase 0 的 Tailwind 設定同時落地，避免骨架先寫死一套顏色後再返工。
4. 每個畫面都必須同時定義**空狀態、載入中、錯誤**三態；目前 `SPEC.md` 只明確要求 Dashboard 空狀態，其餘畫面的三態缺口需在設計階段補齊後回報，而不是在實作時即興決定。
5. 顏色不可作為唯一語意載體：收入／支出、連結狀態、預算超支若只靠紅綠區分，對色覺障礙使用者不可讀。需同時提供圖示、正負號或文字標籤，並確認對比度。若要把 WCAG 2.1 AA 納入驗收，需由人類決定（見 §7）。
6. 金額、日期與幣別格式需在設計階段就定案（TWD 顯示、時區、千分位），並與 `API_SPEC.md` 回傳欄位對齊，避免前後端各自格式化。

## 7. 待人類決策

- 是否核准啟動 UI/UX 設計階段（IA／wireframe／design token），以及它與 Phase 0 骨架的先後順序。
- 是否有既定品牌色、字體授權或既有設計系統需沿用；若無，是否授權設計師自訂一套調色盤與字級規範。
- 是否將無障礙標準（如 WCAG 2.1 AA）正式納入驗收條件 — 目前 `SPEC.md` 未涵蓋。
- 是否將 `DELIVERY_BRIEF.md`、`ARCHITECTURE_DELIVERY_NOTE.md`、`SOFTWARE_DELIVERY_NOTE.md`、`DEVOPS_DELIVERY_NOTE.md` 與本文件合併為單一對外交付說明（此決策已由前手提出，本文件沿用，不重複裁決）。
