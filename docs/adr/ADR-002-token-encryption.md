# ADR-002 — 應用層 AES-256-GCM 加密 Access Token

> 狀態：已採用 | 日期：2026-09-20

## 背景

銀行 OAuth access token 等同帳戶存取授權，外洩風險極高。需決定如何安全儲存。

## 決策

在應用層（非 DB 層）使用 AES-256-GCM 加密，加密後密文存入 `bank_connections.access_token_enc`。

加密格式：`base64(iv).base64(ciphertext).base64(authTag)`

金鑰：32 bytes，從 `process.env.ENCRYPTION_KEY` 注入，各環境不同。

## 理由

- **不依賴 DB 加密**：DB 被整個 dump 時（含 DB 加密金鑰），token 仍安全
- **GCM 提供完整性驗證**：authTag 確保密文未遭篡改；解密失敗即拋出錯誤，不返回任何片段
- **金鑰不入 DB**：即使 DB 完整外洩，無法還原 token

## 取捨

- 應用層需管理金鑰輪換（DB 層加密由資料庫自動輪換）；緩解：版本號前綴策略
- 加密/解密在每次同步時執行，有少量 CPU 成本；可接受（GCM 在現代硬體極快）

## 替代方案（排除）

- **DB 透明加密（TDE）**：DB 備份被盜時 token 仍可解密，因金鑰通常隨 DB 一起備份
- **Vault/KMS**：安全性更高但增加外部依賴與維運成本；可在 GA 後升級

## 回復方案

若需換用 KMS：新增 `token_version` 欄位，逐批用新金鑰重新加密，舊版本保留解密能力直到遷移完成。
