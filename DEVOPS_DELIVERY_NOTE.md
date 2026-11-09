# 備援派工｜DevOps 維運

## 交付結論

本階段完成 BankHub 目前可交付範圍的維運交付說明與驗證核對。現況可重現驗證的是 TypeScript bank-adapter core；Docker 與 CI 皆為驗證用途，Compose 僅提供可選的本機 PostgreSQL。專案目前沒有 Web UI、HTTP API 或 runtime server，因此不具備正式部署條件。

本階段未修改產品程式碼、未建立或寫入密鑰、未啟動持久化資料庫、未部署至任何外部環境。

## 交付物

| 交付物 | 狀態 | 位置／說明 |
|---|---|---|
| 可重現的核心驗證命令 | 已交付 | `package.json`：`npm run verify` |
| 驗證用 Docker image 定義 | 已交付 | `Dockerfile`；執行 `npm run verify`，不是 runtime image |
| CI 驗證流程 | 已交付 | `.github/workflows/verify.yml`；PR 與 `main` push 觸發 |
| 本機 PostgreSQL 設定 | 已交付（可選） | `compose.yaml`、`.env.example`、`database/schema.sql` |
| 維運、秘密與回復指引 | 已交付 | `docs/OPERATIONS.md` |
| 本階段交付紀錄 | 已交付 | 本文件 |

## 驗證證據

- `npm run verify`：exit code `0`。
  - `tsc -p tsconfig.json --noEmit`：通過。
  - Mock adapter：5 pass、0 fail。
  - QA regression：3 pass、0 fail。
- `docker compose config --quiet`（臨時程序環境提供非真實 `POSTGRES_PASSWORD`）：通過。
- 驗證環境依既有 QA 紀錄：Node.js `v24.12.0`、npm `11.6.2`，符合 `>=22 <25`。
- 本次沒有執行 `docker compose up`，因此未改變資料庫狀態，也沒有宣稱 schema 初始化或應用程式資料流已驗證。

## 安全與交付界線

- `.env` 不得提交；所有資料庫、OAuth、加密與排程密鑰必須由環境變數或秘密管理器注入。
- `.env.example` 僅含替代值，不是可用憑證。
- 不可把目前 Dockerfile 視為可上線服務映像；目前沒有健康檢查 endpoint 或應用程式 server。
- 未獲人類明確授權，不執行正式部署、provider 註冊、憑證建立或外部基礎設施變更。

## 下一階段注意事項

1. 在可連網環境執行 `npm install`，再重跑 `npm run verify`；目前沒有 `package-lock.json`，後續若納入依賴，應產生並提交 lockfile，CI/Docker 再改用 `npm ci`。
2. 若只需本機資料庫，複製 `.env.example` 為 `.env`、填入本機密碼後執行 `docker compose up -d postgres`；確認 `docker compose ps` 顯示 healthy。不要使用正式憑證或對外暴露該埠。
3. 若要進入產品部署階段，先取得範圍核准並補上 runtime server、`/health/live`、`/health/ready`、版本化 migration、OAuth state/PKCE、token 加密輪替、授權控制、TLS、備份還原與 staging rollback 證據。
4. 任何 release rollback 應保留前一版 immutable image，先確認資料庫備份與目標範圍；不要執行破壞性 down-migration。若疑似密鑰外洩，先輪替密鑰並撤銷受影響授權。

## 待人類決策

- 是否批准實作 Web UI/API server 與相應部署基礎設施。
- 是否批准真實銀行 provider 整合、正式秘密與 staging/production 環境。
- 是否批准建立 lockfile，作為後續 CI 可重現安裝的前置工作。
