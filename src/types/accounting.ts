export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type TransactionStatus = 'DRAFT' | 'POSTED' | 'VOID';

export interface EntryInputDTO {
  accountId: string;
  debit: string | number;
  credit: string | number;
  description?: string;
}

export interface CreateTransactionDTO {
  companyId?: string; // alias for businessId
  businessId?: string;
  description: string;
  reference?: string;
  date?: string | Date;
  status?: TransactionStatus;
  requiresHumanReview?: boolean;
  verifiedStatus?: string;
  entries: EntryInputDTO[];
  userId?: string;
}

export interface AccountDTO {
  id: string;
  businessId: string;
  code: string;
  name: string;
  type: AccountType;
  category?: string | null;
  currency: string;
  balance: string;
  isActive: boolean;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntryDTO {
  id: string;
  transactionId: string;
  accountId: string;
  account?: AccountDTO;
  debit: string;
  credit: string;
  description?: string | null;
}

export interface TransactionDTO {
  id: string;
  businessId: string;
  transactionNumber: string;
  date: Date;
  description: string;
  reference?: string | null;
  status: TransactionStatus;
  requiresHumanReview: boolean;
  verifiedStatus: string;
  totalAmount: string;
  entries: EntryDTO[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrialBalanceItemDTO {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: string;
  totalCredit: string;
  netDebit: string;
  netCredit: string;
}

export interface TrialBalanceReportDTO {
  businessId: string;
  generatedAt: string;
  items: TrialBalanceItemDTO[];
  totalDebits: string;
  totalCredits: string;
  isBalanced: boolean;
}

export interface ProfitLossItemDTO {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: string;
}

export interface ProfitLossReportDTO {
  businessId: string;
  startDate?: string;
  endDate?: string;
  generatedAt: string;
  revenue: {
    items: ProfitLossItemDTO[];
    totalRevenue: string;
  };
  expenses: {
    items: ProfitLossItemDTO[];
    totalExpenses: string;
  };
  netProfitOrLoss: string;
  isProfitable: boolean;
}

export interface BalanceSheetSectionDTO {
  items: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    balance: string;
  }>;
  total: string;
}

export interface BalanceSheetReportDTO {
  businessId: string;
  asOfDate: string;
  generatedAt: string;
  assets: BalanceSheetSectionDTO;
  liabilities: BalanceSheetSectionDTO;
  equity: BalanceSheetSectionDTO;
  totalAssets: string;
  totalLiabilitiesAndEquity: string;
  isBalanced: boolean;
}
