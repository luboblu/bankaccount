# 備援派工｜QA 測試

## 結論

本工作單的本機啟動驗收通過。現階段可驗證的是 TypeScript adapter core 與 Node 測試；專案沒有 `start`、`dev` 或 Web/API server entrypoint，因此不能宣稱會啟動 UI 或 HTTP API。

## 驗證環境

- Node.js `v24.12.0`，符合 `package.json` 的 `>=22 <25`
- npm `11.6.2`
- TypeScript `5.9.3`
- Docker `28.1.1`、Docker Compose `v2.35.1`

## 通過項目與證據

1. `npm run verify`：exit code `0`；型別檢查、mock adapter 5 pass、QA regression 3 pass。
2. `tsc -p tsconfig.json`：exit code `0`。
3. 在程序環境提供臨時 `POSTGRES_PASSWORD` 時，`docker compose config --quiet`：exit code `0`。
4. QA 測試涵蓋資料隔離、日期邊界、撤銷 token 後拒絕存取、未知 authorization code 不洩漏憑證。
5. PostgreSQL 綁定 `127.0.0.1:5432`，且未設定密碼時拒絕啟動，符合本機安全預期。

## 未通過／環境限制

- `npm install` 在本環境失敗：npm 為 offline 模式且快取沒有 TypeScript（`ENOTCACHED`）。這是依賴取得環境問題，不是測試失敗；本次仍以可用 TypeScript 執行完整 `npm run verify`。
- 未啟動 PostgreSQL 容器，因本工作單只要求本機啟動程序，且啟動會建立持久 volume；已完成不改變資料的 Compose 設定驗證。

## 下一階段注意事項／人工決定

- 在可連網環境執行 `npm install`，再以專案本地依賴重跑 `npm run verify`；目前沒有 `package-lock.json`，可另行評估是否納入。
- 若需要資料庫：複製 `.env.example` 為 `.env`，只填本機開發密碼，再執行 `docker compose up -d postgres`；不要提交 `.env` 或真實憑證。
- PostgreSQL 不是應用程式 server。目前沒有 Web UI/HTTP API 啟動命令；若要新增需另行提出產品實作範圍。
- `README.md`、`SPEC.md` 與既有報告有文字編碼損壞；本次依 `package.json`、`compose.yaml`、`.env.example` 及可執行測試判定，後續應修復文件編碼後再人工審閱。

## 建議交付給使用者的本機啟動說明

`npm install` 後執行 `npm run verify`。若需要 PostgreSQL，先複製 `.env.example` 為 `.env` 並設定本機密碼，再執行 `docker compose up -d postgres` 與 `docker compose ps`。以上不會啟動 Web UI 或 HTTP API。
