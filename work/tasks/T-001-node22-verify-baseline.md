# T-001｜修復 Node 22 的 verify 基線

| 欄位 | 內容 |
|---|---|
| 狀態 | 審查通過，待 commit 與 CI 確認 |
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
  - `package.json`：`test`、`test:qa` 移除 `--test-isolation=none`，使用 `node --test <file>` 的預設 process isolation；其餘 scripts、`engines`、`name`、`version`、`devDependencies` 均未變更。
  - `package-lock.json`：以 `npm install` 新增 lockfile v3；唯一依賴仍是 `typescript@5.9.3`，供本機、CI 與 Docker 以 `npm ci` 重現安裝。
  - `.github/workflows/verify.yml`：新增 Node 22／24 matrix，兩者都執行 `npm run verify`；安裝改用 `npm ci --ignore-scripts --no-audit --no-fund`，移除無 lockfile 的過時註解；Docker build 僅在 Node 22 執行一次。
  - `Dockerfile`：同時複製 `package.json`、`package-lock.json`，安裝改用 `npm ci --ignore-scripts --no-audit --no-fund`，移除過時註解。
  - 本任務單僅依本次指示填寫第 5 節，未修改其他 Markdown 檔案或其他節；未改動第 3 節禁止的程式、測試、設定與文件。
- 實際執行的指令與結果（貼 exit code 與 pass/fail 數字）：
  - 全程設定 `npm_config_cache=<npm-cache>`；未修改 `~/.npm`，未將暫存 Node 24 加入專案依賴。
  - `npm install`：exit 0，新增 1 個套件，audit 0 vulnerabilities。
  - 每次乾淨驗證前，以 Python `shutil.rmtree` 僅刪除本 repo 的 `node_modules`、`dist`，並確認兩者不存在：exit 0。
  - Node **v22.22.0**／npm **10.9.4**：乾淨狀態執行 `npm ci && npm run verify`，exit 0；typecheck、build 通過；mock adapter **5 pass / 0 fail**，QA regression **3 pass / 0 fail**，兩組均 0 skipped、0 cancelled。
  - Node 22 執行 `npx tsc -v`：exit 0，`Version 5.9.3`；`node -p "require.resolve('typescript/bin/tsc')"`：exit 0，指向 `<repo>/node_modules/typescript/bin/tsc`。
  - 首次以 `npx -y --package=node@24 --call 'node --version && npm --version && npm ci && npm run verify && npx tsc -v && node -p "require.resolve(\"typescript/bin/tsc\")"'` 驗證：整體 exit 1；`npm ci` 與 verify 已完成（5 pass、3 pass、各 0 fail），隨後巢狀 `npx tsc -v` 回報 EUSAGE。此命令未列為完整驗證通過。
  - `npx -y --package=node@24 --call 'node -p process.execPath'`：exit 0，取得 暫存 npm cache 內的 Node 24；將該執行檔的 `bin` 目錄暫時置於 PATH 前端，重新刪除 `node_modules`、`dist` 後驗證。
  - Node **v24.22.2**／npm **10.9.4**：乾淨狀態重新執行 `npm ci && npm run verify`，exit 0；typecheck、build 通過；mock adapter **5 pass / 0 fail**，QA regression **3 pass / 0 fail**，兩組均 0 skipped、0 cancelled。接續 `npx tsc -v` 與 `node -p "require.resolve('typescript/bin/tsc')"` 均 exit 0，分別為 `Version 5.9.3` 與上述本機 TypeScript 路徑；整組命令 exit 0。
  - `docker version --format 'client={{.Client.Version}} server={{if .Server}}{{.Server.Version}}{{end}}'`：exit 1，client 為 29.8.0，無法連線到 Docker daemon。
  - `docker build --target verify .`：exit 1，`Cannot connect to the Docker daemon at <docker-socket>`；build 未能執行。
  - `git diff --check` 與變更範圍檢查：exit 0；程式／設定變更僅限四個允許檔案，另依指示只填寫本任務單第 5 節。`package-lock.json` 是未追蹤新檔，未暫存，所以不會出現在一般 `git diff --stat` 中；已以 `git status --short` 與新檔內容確認。
- Node 22 / Node 24 / docker 各自是否實際驗證：
  - Node 22：**已實際驗證通過**（v22.22.0，乾淨安裝，verify exit 0，TypeScript 5.9.3）。
  - Node 24：**已實際驗證通過**（v24.22.2，乾淨安裝，verify exit 0，TypeScript 5.9.3）。
  - Docker：**未驗證**（已嘗試 build，但 Docker daemon 無法連線；不宣稱 build 通過）。
- 未完成或有疑慮的地方：
  - Docker build 尚待可連線的 Docker daemon 驗證；GitHub Actions matrix 尚未在遠端執行。
  - 預設 process isolation 下測試全部通過，無需另外調整測試或擴大任務範圍。未 commit、未 push、未建立 `.env`、未寫入任何帳密或金鑰。

## 6. 審查紀錄（Claude 填）

實作模型：Codex `gpt-6.1-sol`。先前一次以 `gpt-6-luna` 執行的嘗試依使用者指示中止並完整還原，未採用。

- 第一次審查（Claude，2026-11-09）：通過。
  - 逐處檢查 `git diff`：變更只有 `package.json`、`package-lock.json`（新檔）、`.github/workflows/verify.yml`、`Dockerfile` 與本任務單第 5 節。
  - 乾淨狀態（刪掉 `node_modules`、`dist`）重跑 `npm ci && npm run verify`：Node v22.22.0 與 v24.22.2 皆 exit 0，mock adapter 5 pass、QA regression 3 pass，0 fail、0 skipped；兩邊 `npx tsc -v` 皆為專案內 5.9.3。
  - `docker build --target verify .`：**未驗證**（本機 Docker daemon 未啟動），待 CI 確認。
- 第二次審查（獨立子代理）：無阻擋級問題。發現與處置（均已對照程式確認）：
  1. `package-lock.json` 未追蹤：屬實，commit 時必須一併加入。
  2. 第 5 節留有本機路徑（repo 為公開）：屬實，已修正。
  3. 第 4 節「`git diff --stat` 只出現四個檔案」與第 5 節要求填寫本任務單相矛盾，且未追蹤新檔不會出現在 `git diff`：任務單本身的矛盾，視為允許的例外，不是實作問題。
  4. 本機 Node 24 搭配 npm 10.9.4，未涵蓋 Node 24 內建的 npm 版本：屬實，風險低，由 CI 確認。
  5. matrix 使用預設 fail-fast：屬實，任務單未要求，不修。
  6. `docs/OPERATIONS.md` 過時：屬實，已由 Claude 更新。
  - 另查：`main` 無 branch protection 或 ruleset，matrix 改變 job 名稱不影響合併。
- 修正輪次：1 輪（Codex `gpt-6.1-sol`）。將第 5 節 4 行本機路徑換成佔位寫法；複查後該檔無本機路徑，第 5 節以外未變動。
- 待完成：`verify.yml` 只在 `pull_request` 與 push 到 `main` 時觸發，Docker build 與 Node 24 內建 npm 需開 PR 後由 CI 確認。
