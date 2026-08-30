import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Trash, 
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend 
} from 'recharts';
import { LedgerSummary, Payment, Expense, formatCurrency, getMonthDisplay } from '../types';

interface DashboardViewProps {
  currentMonth: string;
  summary: LedgerSummary | null;
  payments: Payment[];
  expenses: Expense[];
  onNavigateTab: (tab: string) => void;
}

export function DashboardView({
  currentMonth,
  summary,
  payments,
  expenses,
  onNavigateTab
}: DashboardViewProps) {
  const opening = summary?.openingBalance || 0;
  const received = summary?.receivedCollection || 0;
  const expected = summary?.expectedCollection || 0;
  const spent = summary?.expenses || 0;
  const closing = summary?.closingBalance || 0;
  const unpaidThisMonth = summary?.unpaidArrearsThisMonth || Math.max(0, expected - received);
  const totalCumulativeArrears = summary?.totalCumulativeArrears || 0;

  const collectionPercent = expected > 0 ? Math.min(100, Math.round((received / expected) * 100)) : 0;

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'Other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.amount) || 0);
  });

  const categoryColors = [
    '#059669', // Emerald
    '#2563EB', // Blue
    '#D97706', // Amber
    '#DC2626', // Red
    '#7C3AED', // Purple
    '#DB2777', // Pink
    '#4B5563', // Gray
  ];

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value
  }));

  const chartData = [
    { name: 'Expected', amount: expected, fill: '#64748b' },
    { name: 'Collected', amount: received, fill: '#10b981' },
    { name: 'Expenses', amount: spent, fill: '#ef4444' },
    { name: 'Closing', amount: closing, fill: '#0f172a' },
  ];

  return (
    <div className="space-y-6">
      {/* 6 Key Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Expected Collection */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expected</span>
            <Layers size={16} className="text-stone-400" />
          </div>
          <div className="my-2">
            <p className="text-xl font-bold font-mono text-stone-900">{formatCurrency(expected)}</p>
            <p className="text-[11px] text-stone-400">₹2,000 × flats</p>
          </div>
          <div className="text-[11px] text-stone-500 font-medium">For {getMonthDisplay(currentMonth)}</div>
        </div>

        {/* 2. Received Collection */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Received</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="my-2">
            <p className="text-xl font-bold font-mono text-emerald-900">{formatCurrency(received)}</p>
            {summary?.arrearsReceived && summary.arrearsReceived > 0 ? (
              <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
                (₹{summary.regularReceived?.toLocaleString() || (received - summary.arrearsReceived).toLocaleString()} reg + ₹{summary.arrearsReceived.toLocaleString()} arrears)
              </p>
            ) : (
              <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${collectionPercent}%` }} />
              </div>
            )}
          </div>
          <div className="text-[11px] font-bold text-emerald-700">{collectionPercent}% of monthly target</div>
        </div>

        {/* 3. Unpaid Dues This Month */}
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unpaid (This Month)</span>
            <AlertCircle size={16} className="text-rose-600" />
          </div>
          <div className="my-2">
            <p className="text-xl font-bold font-mono text-rose-900">{formatCurrency(unpaidThisMonth)}</p>
            <p className="text-[11px] text-rose-600/80 font-medium">Due for {getMonthDisplay(currentMonth)}</p>
          </div>
          <button 
            onClick={() => onNavigateTab('payments')}
            className="text-[11px] font-bold text-rose-700 hover:text-rose-900 text-left flex items-center gap-1"
          >
            Review & Collect <ArrowUpRight size={12} />
          </button>
        </div>

        {/* 4. Total Monthly Expenses */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expenses</span>
            <TrendingDown size={16} className="text-rose-500" />
          </div>
          <div className="my-2">
            <p className="text-xl font-bold font-mono text-stone-900">{formatCurrency(spent)}</p>
            <p className="text-[11px] text-stone-400">Watchman + Dustbin + Utils</p>
          </div>
          <button 
            onClick={() => onNavigateTab('expenses')}
            className="text-[11px] font-bold text-stone-700 hover:text-stone-900 text-left flex items-center gap-1"
          >
            View Breakdown <ArrowUpRight size={12} />
          </button>
        </div>

        {/* 5. Net Closing Balance */}
        <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Closing Balance</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="my-2">
            <p className="text-xl font-bold font-mono text-white">{formatCurrency(closing)}</p>
            <p className="text-[11px] text-stone-400 font-mono">Opening: {formatCurrency(opening)}</p>
          </div>
          <div className="text-[11px] text-stone-300">Net Reserve in Bank/Cash</div>
        </div>

        {/* 6. Cumulative Arrears */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Arrears</span>
            <AlertCircle size={16} className="text-amber-600" />
          </div>
          <div className="my-2">
            <p className="text-xl font-bold font-mono text-amber-900">{formatCurrency(totalCumulativeArrears)}</p>
            <p className="text-[11px] text-amber-700/80">Since June 2025</p>
          </div>
          <button 
            onClick={() => onNavigateTab('arrears')}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 text-left flex items-center gap-1"
          >
            Track Defaulters <ArrowUpRight size={12} />
          </button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Financial Health Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Financial Cashflow for {getMonthDisplay(currentMonth)}</h3>
              <p className="text-xs text-stone-500">Comparison of expected collections, actual receipts, and total outflows.</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Distribution Pie Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Expense Categories</h3>
            <p className="text-xs text-stone-500">Distribution across salary, waste collection & utilities.</p>
          </div>

          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-stone-400">
              No expenses recorded this month
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-1 pt-2 border-t border-stone-100 text-xs">
            {pieData.slice(0, 4).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[idx % categoryColors.length] }} />
                  <span className="truncate max-w-[140px]">{p.name}</span>
                </span>
                <span className="font-mono font-bold text-stone-800">{formatCurrency(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
