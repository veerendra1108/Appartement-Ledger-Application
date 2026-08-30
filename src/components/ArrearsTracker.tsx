import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  ArrowRight, 
  IndianRupee, 
  User, 
  FileText, 
  Send,
  Download,
  Clock,
  Sparkles
} from 'lucide-react';
import { Flat, Payment, PendingReportItem, formatCurrency, getMonthDisplay, START_MONTH } from '../types';

interface ArrearsTrackerProps {
  pendingReport: PendingReportItem[];
  flats: Flat[];
  payments: Payment[];
  onClearMonthDue: (flatId: number, month: string) => Promise<void>;
  onExportArrearsPDF?: () => void;
}

export function ArrearsTracker({
  pendingReport,
  flats,
  payments,
  onClearMonthDue,
  onExportArrearsPDF
}: ArrearsTrackerProps) {
  const [selectedFlat, setSelectedFlat] = useState<PendingReportItem | null>(null);
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);

  const totalCumulativeArrears = pendingReport.reduce((sum, item) => sum + item.totalPendingAmount, 0);
  const totalDefaultingFlats = pendingReport.length;

  const handleQuickClear = async (flatId: number, month: string) => {
    setLoadingMonth(`${flatId}-${month}`);
    try {
      await onClearMonthDue(flatId, month);
    } finally {
      setLoadingMonth(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Cumulative Arrears</span>
            <AlertTriangle size={20} />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-rose-900">
            {formatCurrency(totalCumulativeArrears)}
          </p>
          <p className="text-xs text-rose-700/80 mt-1">
            Calculated across all billing cycles from June 2025
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Flats with Pending Dues</span>
            <Clock size={20} />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-amber-900">
            {totalDefaultingFlats} <span className="text-sm font-normal text-stone-600">/ {flats.length} flats</span>
          </p>
          <p className="text-xs text-amber-700/80 mt-1">
            {flats.length - totalDefaultingFlats} flats have 100% cleared their dues
          </p>
        </div>

        <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Timeline Start</span>
            <p className="text-xl font-bold mt-1">June 2025 (2025-06)</p>
          </div>
          <div className="pt-2">
            {onExportArrearsPDF && (
              <button
                onClick={onExportArrearsPDF}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Download size={13} />
                <span>Export Arrears Statement</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Arrears Roster */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-base">Arrears Breakdown by Flat</h3>
            <p className="text-xs text-stone-500">
              Shows all unpaid or partially paid months since June 2025 for each apartment owner.
            </p>
          </div>
        </div>

        {pendingReport.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={28} />
            </div>
            <h4 className="text-base font-bold text-stone-900">Zero Outstanding Arrears!</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Every flat owner has completely paid their ₹2,000 monthly maintenance up to the current date.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {pendingReport.map((item) => {
              const pendingMonths = item.pendingMonths || [];
              const monthsList = pendingMonths.map(m => typeof m === 'object' ? m.month : m);

              return (
                <div key={item.id} className="p-4 sm:p-5 hover:bg-stone-50 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-stone-900 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
                        {item.flat_number}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{item.owner_name}</h4>
                        <p className="text-xs text-stone-500">
                          Maintenance: ₹{item.maintenance_amount || 2000}/mo • Last payment: {item.lastPaymentDate || 'None'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-stone-500 block">Total Due</span>
                      <span className="text-lg font-mono font-black text-rose-700">
                        {formatCurrency(item.totalPendingAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Badges for unpaid months with quick clear action */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase text-stone-400">Unpaid Months ({monthsList.length}):</span>
                    <div className="flex flex-wrap gap-2">
                      {monthsList.map((monthKey) => {
                        const isLoading = loadingMonth === `${item.id}-${monthKey}`;
                        return (
                          <div
                            key={monthKey}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-xs font-semibold"
                          >
                            <span>{getMonthDisplay(monthKey)}</span>
                            <span className="text-rose-600 font-mono text-[11px]">
                              (₹{item.maintenance_amount || 2000})
                            </span>
                            <button
                              onClick={() => handleQuickClear(item.id, monthKey)}
                              disabled={isLoading}
                              className="ml-1 p-1 hover:bg-emerald-600 hover:text-white rounded text-stone-400 hover:text-white transition-colors"
                              title={`Mark ${getMonthDisplay(monthKey)} as Paid`}
                            >
                              <CheckCircle size={13} className={isLoading ? 'animate-spin' : 'text-emerald-700 hover:text-white'} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
