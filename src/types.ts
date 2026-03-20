import { format } from 'date-fns';

export const CURRENCY_SYMBOL = '₹';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyPDF = (amount: number) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rs. ${formatted}`;
};

export const formatDate = (date: string | Date) => {
  return format(new Date(date), 'dd MMM yyyy');
};

export const getMonthKey = (date: Date = new Date()) => {
  return format(date, 'yyyy-MM');
};

export const getMonthDisplay = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
};

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
  amount_received: number;
  date_received: string;
  is_arrears: boolean;
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
  expenses: number;
  closingBalance: number;
}

export interface PendingReportItem extends Flat {
  pendingMonths: string[];
  totalPendingAmount: number;
}
