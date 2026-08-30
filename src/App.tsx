import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  CreditCard, 
  Receipt, 
  AlertTriangle, 
  FileSpreadsheet, 
  SlidersHorizontal, 
  Home, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { 
  Flat, 
  Payment, 
  Expense, 
  LedgerSummary, 
  PendingReportItem, 
  AppSettings, 
  START_MONTH, 
  DEFAULT_SPREADSHEET_ID 
} from './types';
import { GoogleSheetsSyncBar } from './components/GoogleSheetsSyncBar';
import { MonthSelector } from './components/MonthSelector';
import { DashboardView } from './components/DashboardView';
import { PaymentsTable } from './components/PaymentsTable';
import { ExpensesTable } from './components/ExpensesTable';
import { ArrearsTracker } from './components/ArrearsTracker';
import { MonthlyLedgerView } from './components/MonthlyLedgerView';
import { ReportsAndBulkView } from './components/ReportsAndBulkView';
import { FlatManagerModal } from './components/FlatManagerModal';
import { generateMonthlyPDF } from './pdfUtils';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payments' | 'expenses' | 'arrears' | 'ledger' | 'reports'>('dashboard');
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    return localStorage.getItem('last_selected_month') || '2025-06';
  });

  // State
  const [flats, setFlats] = useState<Flat[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [pendingReport, setPendingReport] = useState<PendingReportItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    apartment_name: 'Sri Sai Residency',
    start_month: '2025-06',
    default_maintenance: '2000',
    default_watchman_salary: '9000',
    default_dustbin_amount: '500',
    google_sheet_id: DEFAULT_SPREADSHEET_ID
  });

  const [isLoading, setIsLoading] = useState(true);
  const [showFlatManager, setShowFlatManager] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load all initial data
  const loadData = async (month = currentMonth) => {
    try {
      setIsLoading(true);
      const [flatsRes, paymentsRes, expensesRes, summaryRes, pendingRes, settingsRes] = await Promise.all([
        fetch('/api/flats'),
        fetch(`/api/payments?month=${month}`),
        fetch(`/api/expenses?month=${month}`),
        fetch(`/api/ledger-summary?month=${month}`),
        fetch('/api/pending-report'),
        fetch('/api/settings')
      ]);

      const [flatsData, paymentsData, expensesData, summaryData, pendingData, settingsData] = await Promise.all([
        flatsRes.json(),
        paymentsRes.json(),
        expensesRes.json(),
        summaryRes.json(),
        pendingRes.json(),
        settingsRes.json()
      ]);

      setFlats(flatsData || []);
      setPayments(paymentsData || []);
      setExpenses(expensesData || []);
      setSummary(summaryData || null);
      setPendingReport(pendingData || []);
      if (settingsData && Object.keys(settingsData).length > 0) {
        setSettings(prev => ({ ...prev, ...settingsData }));
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      showToast('Error communicating with backend database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentMonth);
    localStorage.setItem('last_selected_month', currentMonth);
  }, [currentMonth]);

  // Payment Handlers
  const handleToggleStatus = async (flatId: number, status: 'paid' | 'not_paid', mode = 'UPI') => {
    try {
      const res = await fetch('/api/payments/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_id: flatId,
          month: currentMonth,
          status,
          payment_mode: mode
        })
      });

      if (res.ok) {
        await loadData(currentMonth);
        showToast(`Flat marked as ${status === 'paid' ? 'Paid' : 'Not Paid (Arrears)'}!`);
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  const handleSavePayment = async (paymentData: Partial<Payment>) => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (res.ok) {
        await loadData(currentMonth);
        showToast('Payment record updated!');
      } else {
        showToast('Failed to save payment', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  // Expense Handlers
  const handleAddExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      if (res.ok) {
        await loadData(currentMonth);
        showToast('Expense recorded successfully!');
      } else {
        showToast('Failed to add expense', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData(currentMonth);
        showToast('Expense removed');
      }
    } catch (err) {
      showToast('Failed to delete expense', 'error');
    }
  };

  // Initialize Month
  const handleInitializeMonth = async (params: {
    month: string;
    watchmanSalary: number;
    dustbinAmount: number;
    defaultPaymentStatus: 'paid' | 'not_paid';
    maintenanceAmount: number;
  }) => {
    try {
      const res = await fetch('/api/initialize-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (res.ok) {
        await loadData(params.month);
        showToast(`Month ${params.month} initialized with Watchman Salary and Dustbin Fee!`);
      } else {
        showToast('Initialization failed', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  // Bulk Setup
  const handleBulkUpdate = async (params: {
    startMonth: string;
    endMonth: string;
    maintenanceAmount: number;
    watchmanSalary: number;
    dustbinAmount: number;
    markAsPaid: boolean;
  }) => {
    const res = await fetch('/api/bulk-update-maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (res.ok) {
      await loadData(currentMonth);
    } else {
      throw new Error('Bulk update failed on server');
    }
  };

  // Clear single arrears month by adding collection to current active month without mutating historical past month records
  const handleClearArrearsDue = async (flatId: number, month: string) => {
    try {
      const res = await fetch('/api/payments/clear-arrears-in-current-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_id: flatId,
          due_month: month,
          target_collection_month: currentMonth,
          payment_mode: 'UPI'
        })
      });

      if (res.ok) {
        await loadData(currentMonth);
        showToast(`Arrears for ${month} cleared & recorded in ${currentMonth} collection! Historical records preserved.`);
      } else {
        showToast('Failed to clear arrears', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  // Settings Update
  const handleUpdateSettings = async (newSettings: Record<string, string>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });

    if (res.ok) {
      setSettings(prev => ({ ...prev, ...newSettings }));
      await loadData(currentMonth);
    } else {
      throw new Error('Failed to update settings');
    }
  };

  // Flat Management Handlers
  const handleAddFlat = async (flat: Omit<Flat, 'id'>) => {
    const res = await fetch('/api/flats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flat)
    });
    if (res.ok) {
      await loadData(currentMonth);
      showToast(`Flat ${flat.flat_number} added!`);
    }
  };

  const handleUpdateFlat = async (id: number, flat: Partial<Flat>) => {
    const res = await fetch(`/api/flats/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flat)
    });
    if (res.ok) {
      await loadData(currentMonth);
      showToast('Flat updated!');
    }
  };

  const handleDeleteFlat = async (id: number) => {
    const res = await fetch(`/api/flats/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadData(currentMonth);
      showToast('Flat removed');
    }
  };

  // Print Monthly PDF
  const handleExportMonthlyPDF = () => {
    if (!summary) return;
    generateMonthlyPDF(
      settings.apartment_name,
      currentMonth,
      summary,
      payments,
      expenses,
      pendingReport
    );
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-emerald-200">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-3 ${
          toast.type === 'error' 
            ? 'bg-rose-50 text-rose-900 border-rose-200' 
            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={18} className="text-rose-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-sm">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
                {settings.apartment_name}
              </h1>
              <p className="text-xs text-stone-500 font-medium">
                Maintenance & Ledger • Starting June 2025
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowFlatManager(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
            >
              <Home size={14} />
              <span>Flats ({flats.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 1. Google Sheets & Excel Backend Status Bar */}
        <GoogleSheetsSyncBar
          apartmentName={settings.apartment_name}
          currentMonth={currentMonth}
          onDataSynced={() => loadData(currentMonth)}
          showToast={showToast}
        />

        {/* 2. Month Selector & Initializer */}
        <MonthSelector
          currentMonth={currentMonth}
          onMonthChange={(m) => setCurrentMonth(m)}
          onInitializeMonth={handleInitializeMonth}
          isMonthInitialized={payments.length > 0 || expenses.length > 0}
        />

        {/* 3. Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-stone-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'payments'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <CreditCard size={15} />
            <span>Collections (₹2000/Flat)</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'expenses'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Receipt size={15} />
            <span>Expenses (Watchman & Dustbin)</span>
          </button>

          <button
            onClick={() => setActiveTab('arrears')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'arrears'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <AlertTriangle size={15} className={pendingReport.length > 0 ? 'text-rose-500' : ''} />
            <span>Pending Dues & Arrears</span>
            {pendingReport.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingReport.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'ledger'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <FileSpreadsheet size={15} />
            <span>Monthly Ledger & PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'reports'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span>Bulk Setup & Reports</span>
          </button>
        </div>

        {/* 4. Active Tab Views */}
        {activeTab === 'dashboard' && (
          <DashboardView
            currentMonth={currentMonth}
            summary={summary}
            payments={payments}
            expenses={expenses}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTable
            currentMonth={currentMonth}
            flats={flats}
            payments={payments}
            pendingReport={pendingReport}
            onToggleStatus={handleToggleStatus}
            onSavePayment={handleSavePayment}
            onAddFlat={() => setShowFlatManager(true)}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTable
            currentMonth={currentMonth}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'arrears' && (
          <ArrearsTracker
            currentMonth={currentMonth}
            pendingReport={pendingReport}
            flats={flats}
            payments={payments}
            onClearMonthDue={handleClearArrearsDue}
            onExportArrearsPDF={handleExportMonthlyPDF}
          />
        )}

        {activeTab === 'ledger' && (
          <MonthlyLedgerView
            apartmentName={settings.apartment_name}
            currentMonth={currentMonth}
            summary={summary}
            payments={payments}
            expenses={expenses}
            pendingReport={pendingReport}
            onExportPDF={handleExportMonthlyPDF}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsAndBulkView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onBulkUpdate={handleBulkUpdate}
            showToast={showToast}
          />
        )}
      </main>

      {/* Flat Manager Modal */}
      {showFlatManager && (
        <FlatManagerModal
          flats={flats}
          onClose={() => setShowFlatManager(false)}
          onAddFlat={handleAddFlat}
          onUpdateFlat={handleUpdateFlat}
          onDeleteFlat={handleDeleteFlat}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <span>{settings.apartment_name} Maintenance & Ledger System • Starting June 2025</span>
          <span>Synced with Google Sheets & Local Excel Storage</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
