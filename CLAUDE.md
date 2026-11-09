# BankHub — Claude Code 工作說明

開始任何工作前，先讀 `work/collaboration-status.md`（協作流程、目前狀態、決策紀錄），再讀目前進行中的 `work/tasks/T-*.md`。

- 角色：Claude 負責規劃、審查與上線。程式由 Codex 依任務單實作（本機用 `codex exec` 派工），Claude 只在 Codex 額度用完時代寫，並要留紀錄。
- 同一時間只有一方改程式。
- 開發分支：`claude/sharp-ritchie-e6rnzz`。
- 驗證指令：`npm run verify`。
- 帳密、金鑰、token 不得寫進 repo、任務單或任何交接內容。
