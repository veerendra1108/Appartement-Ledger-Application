import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Sparkles, 
  PlusCircle, 
  Settings2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getMonthDisplay, START_MONTH, DEFAULT_WATCHMAN_SALARY, DEFAULT_DUSTBIN_AMOUNT, DEFAULT_MAINTENANCE_AMOUNT } from '../types';

interface MonthSelectorProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onInitializeMonth: (params: {
    month: string;
    watchmanSalary: number;
    dustbinAmount: number;
    defaultPaymentStatus: 'paid' | 'not_paid';
    maintenanceAmount: number;
  }) => Promise<void>;
  isMonthInitialized?: boolean;
}

export function MonthSelector({
  currentMonth,
  onMonthChange,
  onInitializeMonth,
  isMonthInitialized
}: MonthSelectorProps) {
  const [showInitModal, setShowInitModal] = useState(false);
  const [watchmanSalary, setWatchmanSalary] = useState(DEFAULT_WATCHMAN_SALARY);
  const [dustbinAmount, setDustbinAmount] = useState(DEFAULT_DUSTBIN_AMOUNT);
  const [maintenanceAmount, setMaintenanceAmount] = useState(DEFAULT_MAINTENANCE_AMOUNT);
  const [defaultStatus, setDefaultStatus] = useState<'paid' | 'not_paid'>('paid');
  const [loading, setLoading] = useState(false);

  // Generate list of months from 2025-06 to 2026-12
  const monthOptions: { key: string; label: string }[] = [];
  const start = new Date(2025, 5, 1); // June 2025
  const end = new Date(2026, 11, 1); // Dec 2026

  let cur = new Date(start);
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    monthOptions.push({
      key,
      label: cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const prevKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (prevKey >= START_MONTH) {
      onMonthChange(prevKey);
    }
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (nextKey <= '2027-12') {
      onMonthChange(nextKey);
    }
  };

  const handleInitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onInitializeMonth({
        month: currentMonth,
        watchmanSalary,
        dustbinAmount,
        defaultPaymentStatus: defaultStatus,
        maintenanceAmount
      });
      setShowInitModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={handlePrevMonth}
            disabled={currentMonth <= START_MONTH}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-30 disabled:hover:bg-transparent text-stone-700 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-emerald-700 hidden sm:block" />
            <select
              value={currentMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-stone-50 border border-stone-200 text-stone-900 font-bold text-sm sm:text-base rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-inner"
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} {opt.key === START_MONTH ? '(Start Month)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 transition-colors"
            title="Next Month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Quick Actions & Status */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {currentMonth !== START_MONTH && (
            <button
              onClick={() => onMonthChange(START_MONTH)}
              className="text-xs font-semibold px-2.5 py-1.5 text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Jump to June 2025
            </button>
          )}

          <button
            onClick={() => setShowInitModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:shadow"
            title="Setup Watchman Salary (₹9000), Dustbin Fee (₹500) and Maintenance for this month"
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>Initialize {getMonthDisplay(currentMonth)}</span>
          </button>
        </div>
      </div>

      {/* Initialize Month Modal */}
      {showInitModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setShowInitModal(false)} />
          <div className="relative bg-white text-stone-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-emerald-700" size={18} />
                <h3 className="font-bold text-stone-800 text-base">
                  Initialize {getMonthDisplay(currentMonth)}
                </h3>
              </div>
              <button 
                onClick={() => setShowInitModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInitSubmit} className="p-6 space-y-4 text-sm">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900">
                <p className="font-bold mb-1">Automatic Month Preparation</p>
                <p className="text-stone-600">
                  This will pre-populate the monthly fixed expenses (Watchman Salary, Dustbin Collection) and prepare all flats' maintenance records with standard defaults.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Watchman Salary (₹)
                </label>
                <input
                  type="number"
                  required
                  value={watchmanSalary}
                  onChange={(e) => setWatchmanSalary(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 font-semibold focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-stone-400 mt-0.5">Default: ₹9,000 per month</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Dustbin & Garbage Collection (₹)
                </label>
                <input
                  type="number"
                  required
                  value={dustbinAmount}
                  onChange={(e) => setDustbinAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 font-semibold focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-stone-400 mt-0.5">Default: ₹500 per month</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Default Flat Maintenance (₹)
                </label>
                <input
                  type="number"
                  required
                  value={maintenanceAmount}
                  onChange={(e) => setMaintenanceAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 font-semibold focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-stone-400 mt-0.5">Default: ₹2,000 per flat</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Initial Payment Status for Flats
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDefaultStatus('paid')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      defaultStatus === 'paid'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <CheckCircle size={14} className={defaultStatus === 'paid' ? 'text-emerald-600' : 'text-stone-400'} />
                    Mark All as Paid
                  </button>

                  <button
                    type="button"
                    onClick={() => setDefaultStatus('not_paid')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      defaultStatus === 'not_paid'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <AlertCircle size={14} className={defaultStatus === 'not_paid' ? 'text-rose-600' : 'text-stone-400'} />
                    Mark as Unpaid (Arrears)
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInitModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-colors"
                >
                  {loading ? 'Initializing...' : 'Confirm & Initialize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
