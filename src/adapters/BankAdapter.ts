export const BANK_CONNECTION_STATUSES = ["active", "expired", "error"] as const;
export type BankConnectionStatus = (typeof BANK_CONNECTION_STATUSES)[number];

export const ACCOUNT_TYPES = ["checking", "savings"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface BankAuthorization {
  readonly accessToken: string;
  readonly itemId?: string;
  readonly expiresAt?: Date;
}

export interface BankAccount {
  readonly externalId: string;
  readonly name: string;
  readonly type: AccountType;
  readonly currency: string;
  readonly balance: number;
  readonly mask: string;
  readonly updatedAt: Date;
}

export interface BankTransaction {
  readonly externalId: string;
  readonly accountExternalId: string;
  readonly date: Date;
  /** Positive values are income and negative values are expenses. */
  readonly amount: number;
  readonly description: string;
  readonly category?: string;
}

export interface TransactionQuery {
  readonly from: Date;
  readonly to: Date;
  readonly accountExternalIds?: readonly string[];
}

export interface BankAdapter {
  readonly provider: string;
  exchangeAuthorizationCode(code: string): Promise<BankAuthorization>;
  getAccounts(authorization: BankAuthorization): Promise<readonly BankAccount[]>;
  getTransactions(
    authorization: BankAuthorization,
    query: TransactionQuery,
  ): Promise<readonly BankTransaction[]>;
  revoke(authorization: BankAuthorization): Promise<void>;
}

export class BankAdapterError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_AUTHORIZATION"
      | "AUTHORIZATION_EXPIRED"
      | "INVALID_DATE_RANGE"
      | "UNKNOWN_ACCOUNT",
  ) {
    super(message);
    this.name = "BankAdapterError";
  }
}
