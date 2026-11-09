# T-001｜修復 Node 22 的 verify 基線

| 欄位 | 內容 |
|---|---|
| 狀態 | 待派工（Codex） |
| 規劃 | Claude，2026-11-09 |
| 分支 | `claude/sharp-ritchie-e6rnzz`（Codex 不 commit） |
| 相依 | 無；後續 Phase 0 任務（T-002 起）都依賴本任務 |

## 1. 背景

`package.json` 的 `test` / `test:qa` 使用 `node --test --test-isolation=none`。Node 22（目前 v22.23.4）不認識這個旗標：

```
node: bad option: --test-isolation=none
```

Node 22 只有 `--experimental-test-isolation`。`engines` 宣告 `>=22 <25`，CI（`.github/workflows/verify.yml`）與 `Dockerfile` 都用 Node 22，所以 `npm run verify` 在支援範圍的下限、也就是 CI 上會失敗。

另外 repo 沒有 `package-lock.json`，本機沒有 `node_modules` 時會吃到全域 tsc（本環境為 6.0.2），而不是釘選的 5.9.3。

## 2. 要做的事

1. **測試指令跨版本可用**：修改 `package.json` 的 `test`、`test:qa`，讓同一組指令在 Node 22 與 Node 24 都能跑。
   - 優先做法：拿掉 isolation 旗標，用 `node --test <file>` 的預設行為。
   - 若拿掉後有測試因 process isolation 失敗，回報原因再決定，不要改成依 Node 版本分支的 shell 判斷。
   - 不要用會在某個版本印出棄用或實驗警告而被當成錯誤的寫法。
2. **加入 lockfile**：執行 `npm install` 產生 `package-lock.json`。依賴不得增加；`typescript` 維持 `5.9.3`。
3. **CI 改用 lockfile**：`.github/workflows/verify.yml`
   - `npm install --ignore-scripts --no-audit --no-fund` 改成 `npm ci --ignore-scripts --no-audit --no-fund`，並刪掉「lockfile 尚未存在」的註解。
   - 加上 Node `22` 與 `24` 的 matrix，兩個版本都跑 `npm run verify`。`docker build` 只需跑一次（例如只在 22 跑，或拆成獨立 job）。
4. **Dockerfile 改用 lockfile**：`COPY package.json package-lock.json ./`，改用 `npm ci --ignore-scripts --no-audit --no-fund`，並刪掉對應的過時註解。

## 3. 不能動

- `src/` 底下所有檔案。
- `tests/` 底下的測試內容與斷言。不准跳過、刪除或弱化測試。
- `database/`、`compose.yaml`、`.env.example`、`tsconfig.json`。
- 所有設計／交付文件（`*.md`、`docs/`），包括 `DELIVERY_BRIEF.md`、`QA_REPORT.md`。文件由 Claude 在審查後更新。
- `package.json` 的 `engines`、`name`、`version`、`devDependencies` 版本號。
- 不准新增任何依賴，不准建立 `.env`，不准放入任何帳密或金鑰。
- 不 commit、不 push。

## 4. 驗收條件

- [ ] Node 22 上在乾淨狀態（刪掉 `node_modules`、`dist`）執行 `npm ci && npm run verify`，exit code 0。
- [ ] 確認 verify 用的是 `node_modules/.bin/tsc` 5.9.3（`npx tsc -v`）。
- [ ] Node 24 上同樣通過。本機沒有 Node 24 時，可用 `npx -y node@24 ...` 或 Docker `node:24-bookworm-slim` 驗證；真的無法驗證就在回報中寫「未驗證」，不要寫通過。
- [ ] `docker build --target verify .` 成功（本機有 docker 時）。
- [ ] 測試數量不變：mock adapter 5 pass、QA regression 3 pass。
- [ ] `git diff --stat` 只出現 `package.json`、`package-lock.json`、`.github/workflows/verify.yml`、`Dockerfile`。

## 5. 回報格式（Codex 完成後填）

- 變更檔案與每處修改的理由：
- 實際執行的指令與結果（貼 exit code 與 pass/fail 數字）：
- Node 22 / Node 24 / docker 各自是否實際驗證：
- 未完成或有疑慮的地方：

## 6. 審查紀錄（Claude 填）

- 第一次審查：
- 第二次審查（獨立子代理）：
- 修正輪次：
