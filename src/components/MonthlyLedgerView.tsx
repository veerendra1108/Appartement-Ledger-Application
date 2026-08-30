import React from 'react';
import { 
  FileText, 
  Download, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  IndianRupee,
  Receipt,
  Calendar,
  Layers
} from 'lucide-react';
import { LedgerSummary, Payment, Expense, PendingReportItem, formatCurrency, formatDate, getMonthDisplay } from '../types';

interface MonthlyLedgerViewProps {
  apartmentName: string;
  currentMonth: string;
  summary: LedgerSummary | null;
  payments: Payment[];
  expenses: Expense[];
  pendingReport: PendingReportItem[];
  onExportPDF: () => void;
}

export function MonthlyLedgerView({
  apartmentName,
  currentMonth,
  summary,
  payments,
  expenses,
  pendingReport,
  onExportPDF
}: MonthlyLedgerViewProps) {
  const opening = summary?.openingBalance || 0;
  const received = summary?.receivedCollection || 0;
  const spent = summary?.expenses || 0;
  const closing = summary?.closingBalance || 0;
  const expected = summary?.expectedCollection || 0;
  const unpaid = summary?.unpaidArrearsThisMonth || Math.max(0, expected - received);

  return (
    <div className="space-y-6">
      {/* Ledger Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Monthly Audit Sheet
          </span>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            {apartmentName} • Ledger Statement
          </h2>
          <p className="text-xs text-stone-500">
            Statement for {getMonthDisplay(currentMonth)} (Timeline starting June 2025)
          </p>
        </div>

        <button
          onClick={onExportPDF}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all hover:shadow"
        >
          <Download size={15} />
          <span>Download PDF Ledger</span>
        </button>
      </div>

      {/* Accounting Balance Strip */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-800">
          <div className="pt-2 sm:pt-0 sm:pr-4">
            <span className="text-xs text-stone-400 font-medium uppercase">1. Opening Balance</span>
            <p className="text-lg sm:text-xl font-bold font-mono text-stone-200 mt-1">
              {formatCurrency(opening)}
            </p>
            <p className="text-[11px] text-stone-500">Carryover from prior months</p>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-xs text-emerald-400 font-medium uppercase">+ 2. Collections Received</span>
            <p className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
              {formatCurrency(received)}
            </p>
            <p className="text-[11px] text-stone-500">Expected: {formatCurrency(expected)}</p>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-xs text-rose-400 font-medium uppercase">- 3. Monthly Expenses</span>
            <p className="text-lg sm:text-xl font-bold font-mono text-rose-400 mt-1">
              {formatCurrency(spent)}
            </p>
            <p className="text-[11px] text-stone-500">Watchman & Dustbin & Utils</p>
          </div>

          <div className="pt-2 sm:pt-0 sm:pl-4">
            <span className="text-xs text-amber-300 font-medium uppercase">= 4. Net Closing Balance</span>
            <p className="text-lg sm:text-2xl font-black font-mono text-white mt-1">
              {formatCurrency(closing)}
            </p>
            <p className="text-[11px] text-stone-400">Available bank & cash balance</p>
          </div>
        </div>
      </div>

      {/* Detailed Side-by-side Ledger Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections Breakdown */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <CheckCircle size={16} className="text-emerald-700" />
              Collections Breakdown
            </h3>
            <span className="font-mono text-xs font-bold text-emerald-800">
              {formatCurrency(received)}
            </span>
          </div>

          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {payments.map((p) => {
              const isPaid = p.status === 'paid';
              return (
                <div key={p.id} className="p-3 text-xs flex items-center justify-between hover:bg-stone-50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                      {p.flat_number}
                    </span>
                    <span className="font-medium text-stone-700">{p.owner_name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold ${isPaid ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {formatCurrency(p.amount_received)}
                    </span>
                    <span className="text-[10px] text-stone-400 block">{p.payment_mode || 'Pending'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <Receipt size={16} className="text-rose-700" />
              Expenses Breakdown
            </h3>
            <span className="font-mono text-xs font-bold text-rose-700">
              {formatCurrency(spent)}
            </span>
          </div>

          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No expenses recorded for this month.
              </div>
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="p-3 text-xs flex items-center justify-between hover:bg-stone-50">
                  <div>
                    <p className="font-semibold text-stone-800">{e.description}</p>
                    <p className="text-[11px] text-stone-400">{e.category} • {formatDate(e.date)}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-700">{formatCurrency(e.amount)}</span>
                    <span className="text-[10px] text-stone-400 block">{e.vendor || '-'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
