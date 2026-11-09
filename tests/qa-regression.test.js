const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { BankAdapterError, MockBankAdapter } = require("../dist/adapters/index.js");

describe("QA regression and boundary checks", () => {
  it("keeps returned transaction data isolated from fixture state", async () => {
    const adapter = new MockBankAdapter();
    const authorization = await adapter.exchangeAuthorizationCode("demo-code");
    const query = {
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-30T23:59:59.999Z"),
    };

    const first = await adapter.getTransactions(authorization, query);
    first[0].description = "tampered";
    first[0].date.setUTCFullYear(2000);

    const second = await adapter.getTransactions(authorization, query);
    assert.notEqual(second[0].description, "tampered");
    assert.equal(second[0].date.toISOString(), "2026-09-19T00:00:00.000Z");
  });

  it("includes transactions exactly on both date boundaries", async () => {
    const adapter = new MockBankAdapter();
    const authorization = await adapter.exchangeAuthorizationCode("demo-code");
    const transactions = await adapter.getTransactions(authorization, {
      from: new Date("2026-09-05T00:00:00.000Z"),
      to: new Date("2026-09-19T00:00:00.000Z"),
    });

    assert.deepEqual(
      transactions.map(({ externalId }) => externalId),
      ["mock_lunch_20260919", "mock_salary_202609"],
    );
  });

  it("does not leak a revoked token in the authorization error", async () => {
    const adapter = new MockBankAdapter();
    const authorization = await adapter.exchangeAuthorizationCode("demo-code");
    await adapter.revoke(authorization);

    await assert.rejects(
      adapter.getAccounts(authorization),
      (error) =>
        error instanceof BankAdapterError &&
        error.code === "AUTHORIZATION_EXPIRED" &&
        !error.message.includes(authorization.accessToken),
    );
  });
});
