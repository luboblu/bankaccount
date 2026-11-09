# ADR-001 — 使用 Adapter Pattern 隔離銀行 API

> 狀態：已採用 | 日期：2026-09-20

## 背景

BankHub 需整合 Plaid、台灣 Open Banking 及 Mock API 三種不同銀行資料來源。各 provider 的 SDK、授權流程、資料格式均不同，未來仍可能增加 provider。

## 決策

定義 `BankAdapter` 介面（`src/adapters/BankAdapter.ts`），包含 4 個方法：
- `exchangeAuthorizationCode`
- `getAccounts`
- `getTransactions`
- `revoke`

所有 API Routes 只依賴介面，不直接呼叫任何 provider SDK。

## 理由

- **可替換性**：替換或新增 provider 只需新增 Adapter class，不修改上層邏輯
- **可測試性**：MockBankAdapter 讓整個 API 層在無真實銀行帳號的環境下可測試
- **職責隔離**：各 Adapter 負責自己的 retry、欄位轉換、時區處理

## 取捨

- 新增 provider 需實作完整介面，不能「部分實作」；可接受，因 4 個方法皆為必要操作
- 介面不支援 provider 特有的進階功能（如 Plaid Investments）；範疇外功能另行設計

## 回復方案

若某 provider 需要非標準操作，可在介面新增可選方法，以 `adapter.supportsX?.()` pattern 呼叫。
