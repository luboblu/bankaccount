CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('plaid', 'taiwan_ob', 'mock')),
  access_token_enc TEXT NOT NULL,
  item_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'error')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bank_connections_user ON bank_connections(user_id);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings')),
  currency CHAR(3) NOT NULL DEFAULT 'TWD',
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  mask VARCHAR(4) NOT NULL CHECK (mask ~ '^[0-9]{4}$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, external_id)
);
CREATE INDEX idx_accounts_user ON accounts(user_id);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  is_manual_category BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, external_id)
);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  month DATE NOT NULL CHECK (month = date_trunc('month', month)::date),
  UNIQUE (user_id, category, month)
);

CREATE TABLE alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('low_balance', 'large_txn', 'budget_exceed')),
  threshold NUMERIC(15,2) CHECK (threshold IS NULL OR threshold >= 0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX idx_alert_settings_user ON alert_settings(user_id);
