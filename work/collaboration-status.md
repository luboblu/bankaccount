# BankHub 協作狀態

> 本檔記錄協作流程、目前狀態與重要決定。帳密、金鑰、token 一律不得寫入本檔或任何交接內容。

## 1. 角色與流程

| 階段 | 負責 | 產出 |
|---|---|---|
| 規劃 | Claude | `work/tasks/T-xxx-*.md` 任務單（要做什麼、不能動什麼、驗收條件） |
| 寫程式 | Codex | 依任務單改程式、補測試、跑 `npm run verify`；**不 commit** |
| 第一次審查 | Claude | 逐處檢查 Codex 變更，重跑測試，結果記錄於任務單 |
| 第二次審查 | 獨立 Claude 子代理 | 只讀檔案、不看對話；Claude 對照程式確認每個發現後決定是否修正 |
| 修正 | Codex | 修正審查問題，改完再審，直到通過 |
| 上線 | Claude | commit、push 到 `claude/sharp-ritchie-e6rnzz`、確認 CI |

### 規則

1. 同一時間只有一方改程式；交棒時在下方「目前狀態」更新持有者。
2. Codex 額度用完時 Claude 才代寫，並在「代寫紀錄」留紀錄；Codex 回來後須審查代寫部分。
3. 重要決定寫入「決策紀錄」。
4. 帳密、金鑰不進 repo，也不進交接內容（只寫變數名稱，如 `ENCRYPTION_KEY`，不寫值）。

## 1A. 本機協作方式（D-006）

本節是給本機 Claude Code session 的交接。新 session 看不到先前的對話，以本檔與 `work/tasks/` 為準。

### 派工給 Codex

1. 確認 Codex CLI 已安裝並登入：`codex --version`。登入由使用者自己完成，Claude 不經手任何帳密。
2. 開工前確認工作目錄乾淨（`git status --short`），並且在 `claude/sharp-ritchie-e6rnzz` 分支上。
3. 用非互動模式派工，例如 `codex exec "<指示>"`。實際參數以本機版本的 `codex exec --help` 為準。
   - 指示內容：讀 `work/tasks/T-xxx-*.md` 與本檔、只改任務單允許的檔案、跑 `npm run verify`、把結果填進任務單「回報格式」、不 commit、不 push、有需要決定的事就停下來回報。
   - 權限只開放寫入 repo 工作目錄，不給全機權限。
4. Codex 執行期間 Claude 不改程式。指令結束後，才換 Claude 持有。

### 審查

1. **第一次審查（Claude）**：看 `git diff` 的每一處，確認沒有超出任務單範圍，並在乾淨狀態重跑 `npm ci && npm run verify`。結果寫進任務單「審查紀錄」。
2. **第二次審查（獨立子代理）**：開新的子代理，不要用 fork，讓它只讀檔案、看不到對話。提供的資訊只有任務單路徑、`git diff` 與 repo 本身。Claude 要對照程式確認每個發現，再決定要不要修。
3. **修正**：把確認過的問題寫成修正清單，再用 `codex exec` 派工；改完重新審查，直到通過。
4. **上線（Claude）**：commit（訊息註明任務編號與「實作：Codex／審查：Claude」）、push、確認 CI，最後更新本檔。

### 代寫

只有在 Codex 額度用完時才由 Claude 代寫，並在第 6 節記錄。Codex 回來後，要用 `codex exec` 請它審查代寫的部分。

## 2. 目前狀態

| 項目 | 內容 |
|---|---|
| 目前階段 | 協作環境改為本機（D-006）。T-001 實作與兩次審查已完成，待 commit、開 PR 由 CI 確認 |
| 程式持有者 | Claude（T-001 審查後，待上線） |
| 進行中任務 | T-001 |
| 開發分支 | `claude/sharp-ritchie-e6rnzz` |

## 3. 基線觀察（2026-11-09，Claude）

- Repo 內容：`src/adapters/`（`BankAdapter` 介面 + `MockBankAdapter`）、`tests/`（2 個 node:test 檔）、`database/schema.sql`、設計文件。無 server／UI entrypoint，無 `package-lock.json`。
- **`npm run verify` 在 Node v22.23.4 失敗**：`node: bad option: --test-isolation=none`。Node 22 只認 `--experimental-test-isolation`；`--test-isolation` 是較新版 Node 的旗標。CI（`.github/workflows/verify.yml`）與 `Dockerfile` 都用 Node 22，因此 CI 預期同樣失敗。以 `--experimental-test-isolation=none` 手動執行，mock adapter 測試 5/5 通過。
- `typecheck` 與 `build` 可過（本環境使用全域 tsc 6.0.2，非 package.json 釘選的 5.9.3，因無 node_modules）。
- `DELIVERY_BRIEF.md` 宣稱 verify exit 0 的證據來自 Node v24 環境，與 CI 的 Node 22 不一致。

## 4. 決策紀錄

| # | 日期 | 決定 | 決定者 | 依據 |
|---|---|---|---|---|
| D-001 | 2026-11-09 | 採用上述協作流程與規則 | 使用者 | 使用者指示 |
| D-002 | 2026-11-09 | Phase 0 納入 P0-1 骨架、P0-3 認證、P0-4 Adapter 接 API、P0-5 Redis cache（P0-2 schema 已存在） | 使用者 | 範圍確認 |
| D-003 | 2026-11-09 | Node 22 verify 失敗先獨立修復，作為 T-001 | 使用者 | 基線觀察 |
| D-004 | 2026-11-09 | 採用 Next.js App Router 全端（維持 ADR-004），先只在本機執行，零成本 | 使用者 | 比較過 GitHub Pages、Vercel 免費方案、前後端分離後選定 |
| D-005 | 2026-11-09 | 暫不做任何對外部署（GitHub Pages、Vercel 都不做）；要給別人看時再另行決定。若改用 Pages，需重新評估前後端分離方案 | 使用者 | 同 D-004 |
| D-006 | 2026-11-09 | 改在本機協作：Claude Code 與 Codex CLI 在同一個 repo 資料夾工作，Claude 可直接派工給 Codex，不再需要 `review/*` 審查分支 | 使用者 | 雲端 session 無法執行或接觸 Codex，每輪都要人工轉交 |

## 4A. Phase 0 任務順序（依 D-002、D-004）

T-001 基線 → T-002 骨架（P0-1）→ T-003 Adapter 接 API + mock 頁面（P0-4）→ T-004 Redis cache（P0-5）→ T-005 認證（P0-3：先做 Email/Password；Google OAuth 需要使用者自行在 Google Cloud 建 OAuth client，憑證只放本機 `.env`，排在最後）。

本機需求：Node 22 以上；到 T-004、T-005 才需要 Docker（PostgreSQL、Redis）與本機 `.env`。

## 5. 任務清單

| 任務 | 標題 | 狀態 | 持有者 |
|---|---|---|---|
| T-001 | 修復 Node 22 的 verify 基線 | 審查通過，待上線 | Claude |
| T-002 | P0-1 Next.js 專案骨架（本機） | 已規劃，等 T-001 | — |

## 6. 代寫紀錄

（Codex 額度用完、由 Claude 代寫時記錄於此：日期、任務、檔案、原因、Codex 回審結果。）

目前無。
