# BankHub

BankHub 目前提供 TypeScript 銀行介面卡核心、測試套件，以及供本機開發選用的 PostgreSQL schema。專案尚未實作 Web UI、API server 或 `start` 腳本。

## 本機執行核心驗證

需求：

- Node.js 22、23 或 24
- npm

在專案根目錄執行：

```sh
npm install
npm run verify
```

`npm run verify` 會依序執行 TypeScript 型別檢查、Mock Bank Adapter 測試及 QA regression 測試。全部成功時，代表目前可執行的核心已在本機通過驗證；此命令不會啟動網頁或 API。

## 選用：啟動本機 PostgreSQL

只有進行資料庫相關開發時才需要 Docker Desktop（或其他可執行 Docker Compose 的環境）。

1. 複製環境變數範本：

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS / Linux 可改用：

   ```sh
   cp .env.example .env
   ```

2. 編輯 `.env`，至少將 `POSTGRES_PASSWORD` 和 `DATABASE_URL` 內的預設密碼替換為僅供本機使用的安全密碼。不要提交 `.env`。

3. 啟動 PostgreSQL：

   ```sh
   docker compose up -d postgres
   docker compose ps
   ```

   容器第一次建立資料目錄時，會自動載入 `database/schema.sql`。

4. 完成後停止服務：

   ```sh
   docker compose down
   ```

   此命令會保留資料 volume。若未來需要刪除本機資料，請先確認後再另外執行帶有 `--volumes` 的清除命令。

## 目前限制

`package.json` 尚無 `dev` 或 `start` 腳本，也沒有可啟動的應用程式入口。因此目前的「本機啟動」是執行核心驗證，並視需要啟動 PostgreSQL；不會出現 Web UI 或 HTTP API。
