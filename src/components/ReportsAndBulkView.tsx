import React, { useState } from 'react';
import { 
  Sparkles, 
  Download, 
  Upload, 
  Settings2, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Database, 
  FileText,
  Building,
  IndianRupee,
  RefreshCw
} from 'lucide-react';
import { 
  START_MONTH, 
  DEFAULT_MAINTENANCE_AMOUNT, 
  DEFAULT_WATCHMAN_SALARY, 
  DEFAULT_DUSTBIN_AMOUNT, 
  DEFAULT_SPREADSHEET_ID,
  getMonthDisplay, 
  formatCurrency, 
  AppSettings, 
  Expense 
} from '../types';
import { generateRangePDF } from '../pdfUtils';

interface ReportsAndBulkViewProps {
  settings: AppSettings | Record<string, string>;
  onUpdateSettings: (newSettings: Record<string, string>) => Promise<void>;
  onBulkUpdate: (params: {
    startMonth: string;
    endMonth: string;
    maintenanceAmount: number;
    watchmanSalary: number;
    dustbinAmount: number;
    markAsPaid: boolean;
  }) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function ReportsAndBulkView({
  settings,
  onUpdateSettings,
  onBulkUpdate,
  showToast
}: ReportsAndBulkViewProps) {
  // Bulk Setup State
  const [bulkStart, setBulkStart] = useState('2025-06');
  const [bulkEnd, setBulkEnd] = useState('2026-03');
  const [bulkMaintenance, setBulkMaintenance] = useState(DEFAULT_MAINTENANCE_AMOUNT);
  const [bulkWatchman, setBulkWatchman] = useState(DEFAULT_WATCHMAN_SALARY);
  const [bulkDustbin, setBulkDustbin] = useState(DEFAULT_DUSTBIN_AMOUNT);
  const [bulkMarkPaid, setBulkMarkPaid] = useState(true);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Range Report State
  const [rangeStart, setRangeStart] = useState('2025-06');
  const [rangeEnd, setRangeEnd] = useState('2026-03');
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeResults, setRangeResults] = useState<any[] | null>(null);

  // Settings State
  const [aptName, setAptName] = useState(settings.apartment_name || 'Sri Sai Residency');
  const [sheetId, setSheetId] = useState(settings.google_sheet_id || DEFAULT_SPREADSHEET_ID);
  const [defaultMaint, setDefaultMaint] = useState(Number(settings.default_maintenance) || 2000);
  const [defaultSalary, setDefaultSalary] = useState(Number(settings.default_watchman_salary) || 9000);
  const [defaultDustbin, setDefaultDustbin] = useState(Number(settings.default_dustbin_amount) || 500);
  const [savingSettings, setSavingSettings] = useState(false);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBulkLoading(true);
    try {
      await onBulkUpdate({
        startMonth: bulkStart,
        endMonth: bulkEnd,
        maintenanceAmount: bulkMaintenance,
        watchmanSalary: bulkWatchman,
        dustbinAmount: bulkDustbin,
        markAsPaid: bulkMarkPaid
      });
      showToast(`Bulk setup applied from ${bulkStart} to ${bulkEnd}!`);
    } catch (err: any) {
      showToast(err.message || 'Bulk update failed', 'error');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleFetchRangeReport = async () => {
    setRangeLoading(true);
    try {
      // Generate months between rangeStart and rangeEnd
      const start = new Date(rangeStart + '-01');
      const end = new Date(rangeEnd + '-01');
      const monthlyData: any[] = [];

      let cur = new Date(start);
      while (cur <= end) {
        const mKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        
        // Fetch summary and expenses for each month
        const [sumRes, expRes] = await Promise.all([
          fetch(`/api/ledger-summary?month=${mKey}`),
          fetch(`/api/expenses?month=${mKey}`)
        ]);

        const summary = await sumRes.json();
        const expenses: Expense[] = await expRes.json();

        monthlyData.push({
          month: mKey,
          received: summary.receivedCollection || 0,
          spent: summary.expenses || 0,
          opening: summary.openingBalance || 0,
          closing: summary.closingBalance || 0,
          expected: summary.expectedCollection || 0,
          unpaid: summary.unpaidArrearsThisMonth || 0,
          expenses: expenses
        });

        cur.setMonth(cur.getMonth() + 1);
      }

      setRangeResults(monthlyData);
    } catch (err: any) {
      showToast('Failed to load range report', 'error');
    } finally {
      setRangeLoading(false);
    }
  };

  const handleDownloadRangePDF = () => {
    if (!rangeResults || rangeResults.length === 0) return;
    const title = `${aptName} Maintenance Report (${getMonthDisplay(rangeStart)} - ${getMonthDisplay(rangeEnd)})`;
    generateRangePDF(aptName, title, rangeResults);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onUpdateSettings({
        apartment_name: aptName,
        google_sheet_id: sheetId,
        default_maintenance: String(defaultMaint),
        default_watchman_salary: String(defaultSalary),
        default_dustbin_amount: String(defaultDustbin)
      });
      showToast('Apartment configuration updated!');
    } catch (err: any) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maintenance_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Database exported successfully!');
    } catch (err) {
      showToast('Export failed', 'error');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        if (res.ok) {
          showToast('Database restored successfully! Refreshing...');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast('Import failed', 'error');
        }
      } catch (err) {
        showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Bulk Initialize Month Range */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Bulk Month Initializer & Batch Setup</h3>
            <p className="text-xs text-stone-500">
              Populate entire year / multi-month periods (from June 2025 to March 2026) in one click with your standard defaults.
            </p>
          </div>
        </div>

        <form onSubmit={handleBulkSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Start Month</label>
              <input
                type="month"
                required
                value={bulkStart}
                min="2025-06"
                onChange={(e) => setBulkStart(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">End Month</label>
              <input
                type="month"
                required
                value={bulkEnd}
                onChange={(e) => setBulkEnd(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Flat Maintenance (₹)</label>
              <input
                type="number"
                required
                value={bulkMaintenance}
                onChange={(e) => setBulkMaintenance(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Watchman Salary (₹)</label>
              <input
                type="number"
                required
                value={bulkWatchman}
                onChange={(e) => setBulkWatchman(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Dustbin Fee (₹)</label>
              <input
                type="number"
                required
                value={bulkDustbin}
                onChange={(e) => setBulkDustbin(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-stone-900"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-stone-100">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-stone-700 font-medium">
                <input
                  type="radio"
                  name="bulkPaymentStatus"
                  checked={bulkMarkPaid}
                  onChange={() => setBulkMarkPaid(true)}
                  className="text-emerald-700 focus:ring-emerald-500"
                />
                <span>Set status as Paid (₹{bulkMaintenance})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-stone-700 font-medium">
                <input
                  type="radio"
                  name="bulkPaymentStatus"
                  checked={!bulkMarkPaid}
                  onChange={() => setBulkMarkPaid(false)}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>Set status as Not Paid (Calculate Arrears)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isBulkLoading}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-colors"
            >
              {isBulkLoading ? 'Processing Batch...' : 'Run Bulk Setup'}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Date Range Report (e.g. June 2025 to March 2026) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Date Range & Annual Financial Statement</h3>
            <p className="text-xs text-stone-500">
              Generate full ledger reports across multiple billing cycles with PDF download.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">From Month</label>
            <input
              type="month"
              value={rangeStart}
              min="2025-06"
              onChange={(e) => setRangeStart(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">To Month</label>
            <input
              type="month"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-900"
            />
          </div>

          <button
            onClick={handleFetchRangeReport}
            disabled={rangeLoading}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
          >
            {rangeLoading ? 'Compiling Report...' : 'Generate Range Summary'}
          </button>

          {rangeResults && rangeResults.length > 0 && (
            <button
              onClick={handleDownloadRangePDF}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download size={14} />
              <span>Download Statement PDF</span>
            </button>
          )}
        </div>

        {/* Range Report Table */}
        {rangeResults && (
          <div className="pt-4 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold text-[11px] uppercase">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-right">Collections Received</th>
                  <th className="py-2.5 px-3 text-right">Total Expenses</th>
                  <th className="py-2.5 px-3 text-right">Net Surplus / Deficit</th>
                  <th className="py-2.5 px-3 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rangeResults.map((r, i) => {
                  const netDiff = r.received - r.spent;
                  return (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-semibold text-stone-900">
                        {getMonthDisplay(r.month)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                        {formatCurrency(r.received)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                        {formatCurrency(r.spent)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={netDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {netDiff >= 0 ? '+' : ''}{formatCurrency(netDiff)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-stone-900">
                        {formatCurrency(r.closing)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Apartment Settings & Defaults */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center">
            <Building size={18} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Apartment & Default Settings</h3>
            <p className="text-xs text-stone-500">
              Customize default maintenance amounts, salaries, and linked spreadsheet.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Apartment Name</label>
              <input
                type="text"
                required
                value={aptName}
                onChange={(e) => setAptName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Default Flat Maintenance (₹)</label>
              <input
                type="number"
                required
                value={defaultMaint}
                onChange={(e) => setDefaultMaint(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Default Watchman Salary (₹)</label>
              <input
                type="number"
                required
                value={defaultSalary}
                onChange={(e) => setDefaultSalary(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Default Dustbin Fee (₹)</label>
              <input
                type="number"
                required
                value={defaultDustbin}
                onChange={(e) => setDefaultDustbin(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono text-stone-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Linked Google Spreadsheet ID</label>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono text-xs text-stone-700"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-colors"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Section 4: Data Backup & Restore */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-stone-900 text-base">Local Data Backup & Recovery</h3>
          <p className="text-xs text-stone-500">
            Export a full JSON snapshot of flats, payments, expenses, and settings for offline archiving.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportJSON}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
          >
            <Download size={14} />
            <span>Export Backup</span>
          </button>

          <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">
            <Upload size={14} />
            <span>Restore Backup</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
