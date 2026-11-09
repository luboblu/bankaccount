const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { BankAdapterError, MockBankAdapter } = require("../dist/adapters/index.js");

describe("MockBankAdapter", () => {
  it("exchanges a code and returns isolated account values", async () => {
    const adapter = new MockBankAdapter();
    const authorization = await adapter.exchangeAuthorizationCode(" demo-code ");
    const first = await adapter.getAccounts(authorization);
    const second = await adapter.getAccounts(authorization);

    assert.equal(authorization.itemId, "mock-demo-item");
    assert.equal(first.length, 2);
    assert.notEqual(first[0], second[0]);
    assert.equal(first.reduce((sum, account) => sum + account.balance, 0), 222850);
  });

  it("filters transactions by inclusive date and account, newest first", async () => {
    const adapter = new MockBankAdapter();
    const authorization = await adapter.exchangeAuthorizationCode("demo-code");
    const transactions = await adapter.getTransactions(authorization, {
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-30T23:59:59.999Z"),
      accountExternalIds: ["checking-001"],
    });

    assert.deepEqual(
      transactions.map(({ externalId }) => externalId),
      ["mock_lunch_20260919", "mock_salary_202609"],
    );
  });

  it("rejects invalid date ranges and unknown accounts", async () => {
    const adapter = new MockBankAdapter();
    const authorization = await adapter.exchangeAuthorizationCode("demo-code");

    await assert.rejects(
      adapter.getTransactions(authorization, {
        from: new Date("2026-10-01"),
        to: new Date("2026-09-01"),
      }),
      (error) => error instanceof BankAdapterError && error.code === "INVALID_DATE_RANGE",
    );
    await assert.rejects(
      adapter.getTransactions(authorization, {
        from: new Date("2026-09-01"),
        to: new Date("2026-09-30"),
        accountExternalIds: ["missing"],
      }),
      (error) => error instanceof BankAdapterError && error.code === "UNKNOWN_ACCOUNT",
    );
  });

  it("prevents data access after authorization is revoked", async () => {
    const adapter = new MockBankAdapter();
    const authorization = await adapter.exchangeAuthorizationCode("demo-code");
    await adapter.revoke(authorization);

    await assert.rejects(
      adapter.getAccounts(authorization),
      (error) => error instanceof BankAdapterError && error.code === "AUTHORIZATION_EXPIRED",
    );
  });

  it("rejects unknown authorization codes without exposing credentials", async () => {
    const adapter = new MockBankAdapter();
    await assert.rejects(
      adapter.exchangeAuthorizationCode("wrong-code"),
      (error) =>
        error instanceof BankAdapterError &&
        error.code === "INVALID_AUTHORIZATION" &&
        !error.message.includes("wrong-code"),
    );
  });
});
