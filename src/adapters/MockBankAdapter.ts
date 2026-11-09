import {
  BankAdapterError,
  type BankAccount,
  type BankAdapter,
  type BankAuthorization,
  type BankTransaction,
  type TransactionQuery,
} from "./BankAdapter.js";

export interface MockBankFixture {
  readonly code: string;
  readonly token: string;
  readonly itemId: string;
  readonly accounts: readonly BankAccount[];
  readonly transactions: readonly BankTransaction[];
}

export class MockBankAdapter implements BankAdapter {
  readonly provider = "mock";
  readonly #fixturesByCode: Map<string, MockBankFixture>;
  readonly #fixturesByToken: Map<string, MockBankFixture>;
  readonly #revokedTokens = new Set<string>();

  constructor(fixtures: readonly MockBankFixture[] = [defaultFixture()]) {
    this.#fixturesByCode = new Map(fixtures.map((fixture) => [fixture.code, fixture]));
    this.#fixturesByToken = new Map(fixtures.map((fixture) => [fixture.token, fixture]));
  }

  async exchangeAuthorizationCode(code: string): Promise<BankAuthorization> {
    const fixture = this.#fixturesByCode.get(code.trim());
    if (!fixture) {
      throw new BankAdapterError("Mock authorization code is invalid.", "INVALID_AUTHORIZATION");
    }
    this.#revokedTokens.delete(fixture.token);
    return { accessToken: fixture.token, itemId: fixture.itemId };
  }

  async getAccounts(authorization: BankAuthorization): Promise<readonly BankAccount[]> {
    return this.#getFixture(authorization).accounts.map(cloneAccount);
  }

  async getTransactions(
    authorization: BankAuthorization,
    query: TransactionQuery,
  ): Promise<readonly BankTransaction[]> {
    const fixture = this.#getFixture(authorization);
    validateQuery(query);
    const accountIds = query.accountExternalIds
      ? new Set(query.accountExternalIds)
      : undefined;

    if (accountIds) {
      const knownIds = new Set(fixture.accounts.map((account) => account.externalId));
      for (const accountId of accountIds) {
        if (!knownIds.has(accountId)) {
          throw new BankAdapterError(`Unknown mock account: ${accountId}`, "UNKNOWN_ACCOUNT");
        }
      }
    }

    return fixture.transactions
      .filter((transaction) => {
        const time = transaction.date.getTime();
        return (
          time >= query.from.getTime() &&
          time <= query.to.getTime() &&
          (!accountIds || accountIds.has(transaction.accountExternalId))
        );
      })
      .sort((left, right) => right.date.getTime() - left.date.getTime())
      .map(cloneTransaction);
  }

  async revoke(authorization: BankAuthorization): Promise<void> {
    this.#getFixture(authorization);
    this.#revokedTokens.add(authorization.accessToken);
  }

  #getFixture(authorization: BankAuthorization): MockBankFixture {
    if (this.#revokedTokens.has(authorization.accessToken)) {
      throw new BankAdapterError("Mock authorization has been revoked.", "AUTHORIZATION_EXPIRED");
    }
    const fixture = this.#fixturesByToken.get(authorization.accessToken);
    if (!fixture) {
      throw new BankAdapterError("Mock authorization token is invalid.", "INVALID_AUTHORIZATION");
    }
    return fixture;
  }
}

function validateQuery(query: TransactionQuery): void {
  if (
    !Number.isFinite(query.from.getTime()) ||
    !Number.isFinite(query.to.getTime()) ||
    query.from.getTime() > query.to.getTime()
  ) {
    throw new BankAdapterError("Transaction date range is invalid.", "INVALID_DATE_RANGE");
  }
}

function cloneAccount(account: BankAccount): BankAccount {
  return { ...account, updatedAt: new Date(account.updatedAt) };
}

function cloneTransaction(transaction: BankTransaction): BankTransaction {
  return { ...transaction, date: new Date(transaction.date) };
}

function defaultFixture(): MockBankFixture {
  return {
    code: "demo-code",
    token: "mock-demo-token",
    itemId: "mock-demo-item",
    accounts: [
      {
        externalId: "checking-001",
        name: "主要帳戶",
        type: "checking",
        currency: "TWD",
        balance: 42850,
        mask: "1234",
        updatedAt: new Date("2026-09-20T00:00:00.000Z"),
      },
      {
        externalId: "savings-001",
        name: "儲蓄帳戶",
        type: "savings",
        currency: "TWD",
        balance: 180000,
        mask: "5678",
        updatedAt: new Date("2026-09-20T00:00:00.000Z"),
      },
    ],
    transactions: [
      {
        externalId: "mock_salary_202609",
        accountExternalId: "checking-001",
        date: new Date("2026-09-05T00:00:00.000Z"),
        amount: 68000,
        description: "薪資入帳",
        category: "薪資",
      },
      {
        externalId: "mock_lunch_20260919",
        accountExternalId: "checking-001",
        date: new Date("2026-09-19T00:00:00.000Z"),
        amount: -180,
        description: "午餐",
        category: "餐飲",
      },
      {
        externalId: "mock_interest_202608",
        accountExternalId: "savings-001",
        date: new Date("2026-08-20T00:00:00.000Z"),
        amount: 320,
        description: "存款利息",
      },
    ],
  };
}
