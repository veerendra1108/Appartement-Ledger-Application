import { format } from 'date-fns';

export const CURRENCY_SYMBOL = '₹';
export const DEFAULT_SPREADSHEET_ID = '1bE88sNbxCvKH-fNOh2-75SWBo4lkoSuL7T_G9s5Si_U';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1bE88sNbxCvKH-fNOh2-75SWBo4lkoSuL7T_G9s5Si_U/edit?usp=sharing';
export const START_MONTH = '2025-06'; // Starting from June 2025
export const DEFAULT_MAINTENANCE = 2000;
export const DEFAULT_MAINTENANCE_AMOUNT = 2000;
export const DEFAULT_WATCHMAN_SALARY = 9000;
export const DEFAULT_DUSTBIN_AMOUNT = 500;

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatCurrencyPDF = (amount: number) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `Rs. ${formatted}`;
};

export const formatDate = (date: string | Date) => {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return String(date);
  }
};

export const getMonthKey = (date: Date = new Date()) => {
  return format(date, 'yyyy-MM');
};

export const getMonthDisplay = (monthKey: string) => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  if (!year || !month) return monthKey;
  return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy');
};

export type PaymentStatus = 'paid' | 'not_paid' | 'partial' | 'pending';

export interface Flat {
  id: number;
  flat_number: string;
  owner_name: string;
  maintenance_amount: number;
  notes: string;
}

export interface Payment {
  id: number;
  flat_id: number;
  flat_number: string;
  owner_name: string;
  month: string;
  amount_expected?: number;
  amount_received: number;
  status: PaymentStatus;
  date_received: string;
  is_arrears?: boolean | number;
  payment_mode: string;
  remarks: string;
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string;
  payment_mode: string;
  notes: string;
}

export interface LedgerSummary {
  openingBalance: number;
  expectedCollection: number;
  receivedCollection: number;
  unpaidArrearsThisMonth: number;
  totalCumulativeArrears: number;
  expenses: number;
  closingBalance: number;
}

export interface PendingReportItem extends Flat {
  pendingMonths: { month: string; amount: number; status: PaymentStatus }[];
  totalPendingAmount: number;
  lastPaymentDate?: string;
}

export interface AppSettings {
  apartment_name: string;
  start_month: string;
  default_maintenance: number | string;
  default_watchman_salary: number | string;
  default_dustbin_amount: number | string;
  google_sheet_id: string;
  google_sheet_url?: string;
  last_sync?: string;
}

export interface GoogleAuthStatus {
  isConnected: boolean;
  userEmail?: string;
  userName?: string;
  userPicture?: string;
  accessToken?: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  lastSync?: string;
  isSyncing?: boolean;
}
