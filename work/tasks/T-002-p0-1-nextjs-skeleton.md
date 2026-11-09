# T-002｜P0-1 Next.js 專案骨架（本機執行）

| 欄位 | 內容 |
|---|---|
| 狀態 | 已規劃；**T-001 審查通過後**才派工（Codex） |
| 規劃 | Claude，2026-11-09 |
| 分支 | `claude/sharp-ritchie-e6rnzz`（Codex 不 commit） |
| 相依 | T-001（`package.json`、lockfile、CI、Dockerfile 都會再動到，必須以 T-001 的結果為基礎） |
| 決策依據 | D-004：Next.js App Router，只在本機跑，不部署 |

## 1. 目標

在現有的 adapter core 旁邊加一個可以在本機啟動的 Next.js App Router 專案：

- `npm run dev` 打開瀏覽器看得到 BankHub 首頁。
- `GET /api/health` 回 `{"status":"ok"}`。
- 既有 core 的 build 與測試完全不受影響。

本任務**只做骨架**，不接 adapter、資料庫、Redis、登入。

## 2. 要做的事

### 2.1 依賴（全部用精確版本，不用 `^`／`~`）

- `dependencies`：`next`、`react`、`react-dom`，用目前的穩定版，React 版本要符合該版 Next 的需求。
- `devDependencies`：`@types/react`、`@types/react-dom`、`@types/node`（主版本對齊 Node 22）、Tailwind CSS 與該版本官方指定的 PostCSS 整合套件、`eslint`、`eslint-config-next`。
- `typescript` 維持 `5.9.3`。如果所選的 Next 版本不支援 5.9.3，先停下來回報，不要自己升級。
- 更新 `package-lock.json`。

### 2.2 TypeScript 設定：core 與 web 分開

- **`tsconfig.json` 不准改**。它是 core 用的（`rootDir: src`、`NodeNext`、輸出到 `dist/`），既有測試依賴它的輸出。
- 新增 `tsconfig.next.json` 給 Next 用（`jsx`、`moduleResolution: bundler` 等，依 Next 官方建議），`include` 只涵蓋 Next 相關檔案。
- `next.config.ts` 用 `typescript.tsconfigPath` 指向 `tsconfig.next.json`。
- Next 的程式放在 repo 根目錄的 `app/`，**不要放進 `src/`**。core 的 `tsconfig.json` 會編譯 `src/**/*.ts`，放進去會被編進 `dist/`。

### 2.3 頁面與路由

- `app/layout.tsx`、`app/globals.css`（引入 Tailwind）。
- `app/page.tsx`：簡單首頁，標題 BankHub，加一行說明「開發版：目前只有 mock 資料，尚未連接真實銀行」。
- `app/api/health/route.ts`：`GET` 回 `{"status":"ok"}`，HTTP 200。不得回傳任何環境變數、版本細節或主機資訊。
- **字型不准用 `next/font/google`**，它在 build 時會連外下載，CI 和 Docker 會因此依賴網路。改用系統字型。

### 2.4 npm scripts

保留現有的 `build`、`typecheck`、`test`、`test:qa`，名稱與行為都不變。新增：

| script | 內容 |
|---|---|
| `dev` | `next dev` |
| `build:web` | `next build` |
| `start` | `next start` |
| `lint` | 依該 Next 版本官方建議的 ESLint flat config 執行。若該版已移除 `next lint`，就直接呼叫 `eslint` |
| `typecheck:web` | `tsc -p tsconfig.next.json --noEmit` |
| `test:web` | 執行下方的 smoke test |

`verify` 改成依序跑：`typecheck` → `typecheck:web` → `lint` → `test` → `test:qa` → `build:web` → `test:web`。

### 2.5 Smoke test

新增 `tests/web-smoke.test.js`（node:test，風格比照既有測試）：

- 前提是已經跑過 `next build`。測試在一個空閒 port 啟動 `next start`。
- 驗證 `GET /` 回 200，且 HTML 含有 `BankHub`。
- 驗證 `GET /api/health` 回 200，body 等於 `{"status":"ok"}`。
- 測試結束（成功或失敗）都要關掉 server process，不得殘留。
- 要設啟動逾時（例如 30 秒），避免 CI 卡住。

### 2.6 其他

- `.gitignore` 加入 `.next/`；其餘依 Next 官方預設（例如 `next-env.d.ts`、`*.tsbuildinfo`）。
- CI（`.github/workflows/verify.yml`）：設 `NEXT_TELEMETRY_DISABLED=1`，Node 22／24 matrix 都跑新的 `verify`。
- `Dockerfile` 的 `verify` target：補 COPY 新增的設定檔與 `app/`，設 `NEXT_TELEMETRY_DISABLED=1`，仍然跑 `npm run verify`。

## 3. 不能動

- `src/` 底下所有檔案。
- `tests/mock-bank-adapter.test.js`、`tests/qa-regression.test.js`。
- `tsconfig.json`、`database/`、`compose.yaml`、`.env.example`。
- 所有 `*.md` 與 `docs/`，文件由 Claude 在審查後更新。
- `package.json` 的 `engines`、`name`、`version`。
- 不准做：登入、資料庫連線、Redis、adapter 串接、任何 `/api/*` 業務路由（這些屬於 T-003 起的任務）。
- 不准加部署設定（`vercel.json`、Pages workflow 等），不准加分析或追蹤套件。
- 不准建立 `.env`，不准讀取或放入任何帳密、金鑰。
- 不 commit、不 push。

## 4. 驗收條件

- [ ] 乾淨狀態（刪掉 `node_modules`、`dist`、`.next`）下，`npm ci && npm run verify` 在 Node 22 上 exit code 0。
- [ ] Node 24 同樣通過；無法實際驗證就寫「未驗證」。
- [ ] 既有測試數量不變：mock adapter 5 pass、QA regression 3 pass；web smoke 全部 pass。
- [ ] `npm run dev` 後，`curl http://localhost:3000/api/health` 回 `{"status":"ok"}`，瀏覽器首頁看得到 BankHub。
- [ ] `npm run build` 後，`dist/` 只含 core 產物，沒有任何 `app/` 的東西。
- [ ] `docker build --target verify .` 成功（本機有 docker 時）。
- [ ] 斷網或沒有外部字型的情況下 `next build` 仍可成功，也就是 build 不需要連外。
- [ ] `git diff --stat` 只出現本單第 2 節列出的檔案。

## 5. 回報格式（Codex 完成後填）

- 選用的 next／react／tailwind／eslint 版本：
- 變更檔案與每處修改的理由：
- 實際執行的指令與結果（貼 exit code 與 pass/fail 數字）：
- Node 22 / Node 24 / docker 各自是否實際驗證：
- 未完成或有疑慮的地方：

## 6. 已知風險（給 T-003 參考，本單不處理）

- core 用 NodeNext 風格的 `.js` 副檔名 import（例如 `./BankAdapter.js`）。T-003 讓 Next 直接 import `src/adapters` 時，要確認打包工具能解析，必要時調整 `next.config.ts`。

## 7. 審查紀錄（Claude 填）

- 第一次審查：
- 第二次審查（獨立子代理）：
- 修正輪次：
