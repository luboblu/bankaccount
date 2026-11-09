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

## 2. 目前狀態

| 項目 | 內容 |
|---|---|
| 目前階段 | T-001 已派工給 Codex（2026-11-09），完成後由使用者推到 `review/T-001` 分支供審查 |
| 程式持有者 | Codex（T-001） |
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

## 4A. Phase 0 任務順序（依 D-002、D-004）

T-001 基線 → T-002 骨架（P0-1）→ T-003 Adapter 接 API + mock 頁面（P0-4）→ T-004 Redis cache（P0-5）→ T-005 認證（P0-3：先做 Email/Password；Google OAuth 需要使用者自行在 Google Cloud 建 OAuth client，憑證只放本機 `.env`，排在最後）。

本機需求：Node 22 以上；到 T-004、T-005 才需要 Docker（PostgreSQL、Redis）與本機 `.env`。

## 5. 任務清單

| 任務 | 標題 | 狀態 | 持有者 |
|---|---|---|---|
| T-001 | 修復 Node 22 的 verify 基線 | 派工中 | Codex |
| T-002 | P0-1 Next.js 專案骨架（本機） | 已規劃，等 T-001 | — |

## 6. 代寫紀錄

（Codex 額度用完、由 Claude 代寫時記錄於此：日期、任務、檔案、原因、Codex 回審結果。）

目前無。
