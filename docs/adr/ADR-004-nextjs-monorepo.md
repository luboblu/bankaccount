# ADR-004 — Next.js Monorepo（前後端合一）

> 狀態：已採用（MVP 階段） | 日期：2026-09-20

## 背景

需決定前後端是否分離：Next.js 全端 monorepo 或獨立的 Frontend（Vite/React）+ Backend（Node.js API）。

## 決策

MVP 採用 Next.js 14 App Router monorepo，前端 Page Routes 與後端 API Routes 共存於同一 repo 和部署單元。

## 理由

- **開發速度**：單一 repo，型別可在前後端共享（API 回應型別直接 import）
- **部署簡單**：單一 Vercel 部署，無需管理跨域 CORS 或兩套 CI/CD
- **Server Components**：Dashboard 可在 Server Component 直接查 DB，省去 API round-trip

## 取捨

- 前後端耦合在同一 repo，若日後需獨立擴展（Backend 需要更多運算資源）需要拆分
- API Routes 是 Serverless Functions，不適合長時間執行的任務（背景同步仍透過 Cron 呼叫）

## 替代方案（排除）

- **分離 Backend**：維護成本更高，CORS 設定複雜；可在 GA 後若有需要再拆分

## 回復方案

若 Serverless 限制（執行時間、記憶體）成為瓶頸，可將 API Routes 提取至獨立的 Node.js/Fastify 服務，Next.js 僅保留 Page Routes，型別由 npm package 共享。
