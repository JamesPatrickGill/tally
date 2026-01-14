// Account Types
export type AccountType =
  | 'property'
  | 'pension'
  | 'investment'
  | 'savings'
  | 'mortgage'
  | 'loan'
  | 'credit_card';

export type AccountCategory = 'asset' | 'liability';

export interface Account {
  id: string;
  name: string;
  account_type: AccountType;
  category: AccountCategory;
  institution: string | null;
  description: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  name: string;
  account_type: AccountType;
  institution?: string;
  description?: string;
  currency?: string;
}

export interface UpdateAccountInput {
  name?: string;
  institution?: string;
  description?: string;
  currency?: string;
  is_active?: boolean;
}

export interface AccountWithBalance extends Account {
  current_balance: number;
  balance_date: string | null;
}

// Balance Types
export interface BalanceEntry {
  id: string;
  account_id: string;
  date: string;
  balance: number;
  notes: string | null;
  created_at: string;
}

export interface CreateBalanceInput {
  account_id: string;
  date: string;
  balance: number;
  notes?: string;
}

// Milestone Types
export interface Milestone {
  id: string;
  date: string;
  label: string;
  account_id: string | null;
  created_at: string;
}

// Utility function to get category from account type
export function getCategoryForType(type: AccountType): AccountCategory {
  switch (type) {
    case 'property':
    case 'pension':
    case 'investment':
    case 'savings':
      return 'asset';
    case 'mortgage':
    case 'loan':
    case 'credit_card':
      return 'liability';
  }
}

// Account type display labels
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  property: 'Property',
  pension: 'Pension',
  investment: 'Investment',
  savings: 'Savings',
  mortgage: 'Mortgage',
  loan: 'Loan',
  credit_card: 'Credit Card',
};

// Chart Types
export interface ChartDataPoint {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

// Statistics Types
export interface NetWorthStats {
  ytdChange: number;
  ytdChangePercent: number;
  monthlyAvgChange: number;
  allTimeHigh: number;
  allTimeHighDate: string;
  oneYearReturn: number;
  oneYearReturnPercent: number;
}

// Account type Tailwind background classes
export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  property: 'bg-account-property',
  pension: 'bg-account-pension',
  investment: 'bg-account-investment',
  savings: 'bg-account-savings',
  mortgage: 'bg-account-mortgage',
  loan: 'bg-account-loan',
  credit_card: 'bg-account-credit-card',
};
