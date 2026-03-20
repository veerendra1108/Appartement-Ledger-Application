import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  ReceiptIndianRupee, 
  Wallet, 
  FileText, 
  AlertCircle, 
  Download, 
  Plus, 
  Trash2, 
  Edit, 
  Menu, 
  X, 
  Printer, 
  FileJson, 
  Upload 
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate, 
  getMonthKey, 
  getMonthDisplay, 
  Flat, 
  Payment, 
  Expense, 
  LedgerSummary, 
  PendingReportItem 
} from './types';
import { generateMonthlyPDF, generateRangePDF } from './pdfUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Page = 'dashboard' | 'flats' | 'payments' | 'expenses' | 'ledger' | 'pending' | 'reports';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [flats, setFlats] = useState<Flat[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({ apartment_name: 'Apartment Ledger' });
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [pendingReport, setPendingReport] = useState<PendingReportItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportStartMonth, setReportStartMonth] = useState(getMonthKey(new Date(new Date().getFullYear(), 0, 1)));
  const [reportEndMonth, setReportEndMonth] = useState(getMonthKey());

  // Modals
  const [showFlatModal, setShowFlatModal] = useState<Flat | boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ title, message, onConfirm });
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchMonthData();
  }, [selectedMonth]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [flatsRes, settingsRes] = await Promise.all([
        fetch('/api/flats'),
        fetch('/api/settings')
      ]);
      setFlats(await flatsRes.json());
      setSettings(await settingsRes.json());
    } catch (error) {
      console.error('Failed to fetch initial data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthData = async () => {
    try {
      const [paymentsRes, expensesRes, summaryRes, pendingRes] = await Promise.all([
        fetch(`/api/payments?month=${selectedMonth}`),
        fetch(`/api/expenses?month=${selectedMonth}`),
        fetch(`/api/ledger-summary?month=${selectedMonth}`),
        fetch('/api/pending-report')
      ]);
      setPayments(await paymentsRes.json());
      setExpenses(await expensesRes.json());
      setLedgerSummary(await summaryRes.json());
      setPendingReport(await pendingRes.json());
    } catch (error) {
      console.error('Failed to fetch month data', error);
    }
  };

  const handleAddFlat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const method = typeof showFlatModal === 'object' ? 'PUT' : 'POST';
    const url = typeof showFlatModal === 'object' ? `/api/flats/${showFlatModal.id}` : '/api/flats';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        fetchInitialData();
        setShowFlatModal(false);
        showToast(typeof showFlatModal === 'object' ? 'Flat updated' : 'Flat added');
      } else {
        const err = await res.json();
        showToast(err.error || 'Error saving flat', 'error');
      }
    } catch (error) {
      showToast('Error saving flat', 'error');
    }
  };

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        fetchMonthData();
        setShowPaymentModal(false);
        showToast('Payment recorded successfully');
      } else {
        showToast('Error saving payment', 'error');
      }
    } catch (error) {
      showToast('Error saving payment', 'error');
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        fetchMonthData();
        setShowExpenseModal(false);
        showToast('Expense recorded successfully');
      } else {
        showToast('Error saving expense', 'error');
      }
    } catch (error) {
      showToast('Error saving expense', 'error');
    }
  };

  const handleDelete = async (type: 'flats' | 'payments' | 'expenses', id: number) => {
    showConfirm(
      'Confirm Deletion',
      'Are you sure you want to delete this record? This action cannot be undone.',
      async () => {
        try {
          const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
          if (res.ok) {
            if (type === 'flats') {
              await fetchInitialData();
            } else {
              await fetchMonthData();
            }
            showToast('Record deleted successfully');
          } else {
            const errorData = await res.json();
            showToast(errorData.error || 'Failed to delete', 'error');
          }
        } catch (error) {
          showToast('Error deleting record', 'error');
        }
      }
    );
  };

  const handleInitializeMonth = async () => {
    showConfirm(
      'Initialize Month',
      `This will add default expenses (Watchman Salary Rs. 9000 & Dustbin Rs. 3600) and maintenance payments (Rs. 2000) for all flats for ${getMonthDisplay(selectedMonth)}. Continue?`,
      async () => {
        try {
          const res = await fetch('/api/initialize-month', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: selectedMonth })
          });
          if (res.ok) {
            fetchMonthData();
            showToast('Month initialized successfully');
          } else {
            showToast('Error initializing month', 'error');
          }
        } catch (error) {
          showToast('Error initializing month', 'error');
        }
      }
    );
  };

  const handleExport = async () => {
    const res = await fetch('/api/export');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          fetchInitialData();
          fetchMonthData();
          showToast('Data imported successfully');
        }
      } catch (error) {
        showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'flats', label: 'Flats Management', icon: Building2 },
    { id: 'payments', label: 'Payments Entry', icon: ReceiptIndianRupee },
    { id: 'expenses', label: 'Expenses Entry', icon: Wallet },
    { id: 'ledger', label: 'Monthly Ledger', icon: FileText },
    { id: 'pending', label: 'Pending Dues', icon: AlertCircle },
    { id: 'reports', label: 'Reports & Export', icon: Download },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600 font-medium">Loading Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans text-stone-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-bold text-emerald-700 truncate">{settings.apartment_name}</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-stone-600">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-stone-900 text-stone-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-white mb-1">Apartment Ledger</h1>
          <p className="text-xs text-stone-500 uppercase tracking-widest font-semibold">Management System</p>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id as Page);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activePage === item.id 
                  ? "bg-emerald-600 text-white" 
                  : "hover:bg-stone-800 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-6 border-t border-stone-800">
          <p className="text-xs text-stone-500">Logged in as Treasurer</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="hidden md:flex bg-white border-b border-stone-200 px-8 py-4 items-center justify-between sticky top-0 z-30">
          <div>
            <h2 className="text-lg font-bold text-stone-800">{navItems.find(n => n.id === activePage)?.label}</h2>
            <p className="text-xs text-stone-500">{settings.apartment_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleInitializeMonth}
              className="px-3 py-2 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-200 transition-colors"
              title="Add default expenses and payments for this month"
            >
              Initialize Month
            </button>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {activePage === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard 
                  label="Expected Collection" 
                  value={formatCurrency(ledgerSummary?.expectedCollection || 0)} 
                  subLabel={getMonthDisplay(selectedMonth)}
                  icon={ReceiptIndianRupee}
                  color="blue"
                />
                <StatCard 
                  label="Received Collection" 
                  value={formatCurrency(ledgerSummary?.receivedCollection || 0)} 
                  subLabel={`${Math.round(((ledgerSummary?.receivedCollection || 0) / (ledgerSummary?.expectedCollection || 1)) * 100)}% collected`}
                  icon={Wallet}
                  color="emerald"
                />
                <StatCard 
                  label="Total Expenses" 
                  value={formatCurrency(ledgerSummary?.expenses || 0)} 
                  subLabel={`${expenses.length} transactions`}
                  icon={Trash2}
                  color="rose"
                />
                <StatCard 
                  label="Current Balance" 
                  value={formatCurrency(ledgerSummary?.closingBalance || 0)} 
                  subLabel="Net available"
                  icon={LayoutDashboard}
                  color="amber"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Payments */}
                <Card title="Recent Payments" action={<button onClick={() => setActivePage('payments')} className="text-xs text-emerald-600 font-bold uppercase tracking-wider hover:underline">View All</button>}>
                  <div className="divide-y divide-stone-100">
                    {payments.slice(0, 5).map(p => (
                      <div key={p.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-stone-800">{p.flat_number} - {p.owner_name}</p>
                          <p className="text-xs text-stone-500">{formatDate(p.date_received)} • {p.payment_mode}</p>
                        </div>
                        <p className="font-mono font-bold text-emerald-600">{formatCurrency(p.amount_received)}</p>
                      </div>
                    ))}
                    {payments.length === 0 && <p className="py-8 text-center text-stone-400 italic">No payments recorded for this month</p>}
                  </div>
                </Card>

                {/* Recent Expenses */}
                <Card title="Recent Expenses" action={<button onClick={() => setActivePage('expenses')} className="text-xs text-emerald-600 font-bold uppercase tracking-wider hover:underline">View All</button>}>
                  <div className="divide-y divide-stone-100">
                    {expenses.slice(0, 5).map(e => (
                      <div key={e.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-stone-800">{e.category}</p>
                          <p className="text-xs text-stone-500">{e.description} • {formatDate(e.date)}</p>
                        </div>
                        <p className="font-mono font-bold text-rose-600">-{formatCurrency(e.amount)}</p>
                      </div>
                    ))}
                    {expenses.length === 0 && <p className="py-8 text-center text-stone-400 italic">No expenses recorded for this month</p>}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activePage === 'flats' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-800">Flat Directory ({flats.length})</h3>
                <button 
                  onClick={() => setShowFlatModal(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm"
                >
                  <Plus size={18} /> Add Flat
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Flat No.</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Owner Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Monthly Maint.</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {flats.map(flat => (
                      <tr key={flat.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-stone-800">{flat.flat_number}</td>
                        <td className="px-6 py-4 text-stone-600">{flat.owner_name}</td>
                        <td className="px-6 py-4 font-mono text-stone-800">{formatCurrency(flat.maintenance_amount)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setShowFlatModal(flat)} className="p-2 text-stone-400 hover:text-emerald-600"><Edit size={16} /></button>
                            <button onClick={() => handleDelete('flats', flat.id)} className="p-2 text-stone-400 hover:text-rose-600"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePage === 'payments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-800">Maintenance Collections</h3>
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm"
                >
                  <Plus size={18} /> Record Payment
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Flat</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Mode</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-stone-800">{p.flat_number}</p>
                          <p className="text-xs text-stone-500">{p.owner_name}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">{getMonthDisplay(p.month)}</td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-600">{formatCurrency(p.amount_received)}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{formatDate(p.date_received)}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-[10px] font-bold uppercase tracking-wider">{p.payment_mode}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete('payments', p.id)} className="p-2 text-stone-400 hover:text-rose-600"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">No payments recorded for this month</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePage === 'expenses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-800">Expense Management</h3>
                <button 
                  onClick={() => setShowExpenseModal(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm"
                >
                  <Plus size={18} /> Add Expense
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {expenses.map(e => (
                      <tr key={e.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-stone-600">{formatDate(e.date)}</td>
                        <td className="px-6 py-4 font-bold text-stone-800">{e.category}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{e.description}</td>
                        <td className="px-6 py-4 font-mono font-bold text-rose-600">{formatCurrency(e.amount)}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{e.vendor || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete('expenses', e.id)} className="p-2 text-stone-400 hover:text-rose-600"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">No expenses recorded for this month</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePage === 'ledger' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-800">Monthly Ledger Statement</h3>
                <button 
                  onClick={() => generateMonthlyPDF(settings.apartment_name, selectedMonth, ledgerSummary!, payments, expenses, pendingReport)}
                  className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-stone-800 shadow-sm"
                >
                  <Printer size={18} /> Print PDF
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Balance Summary">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Opening Balance</span>
                      <span className="font-mono font-bold">{formatCurrency(ledgerSummary?.openingBalance || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Add: Collections</span>
                      <span className="font-mono font-bold text-emerald-600">+{formatCurrency(ledgerSummary?.receivedCollection || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Less: Expenses</span>
                      <span className="font-mono font-bold text-rose-600">-{formatCurrency(ledgerSummary?.expenses || 0)}</span>
                    </div>
                    <div className="pt-4 border-t border-stone-100 flex justify-between items-center">
                      <span className="font-bold text-stone-800">Closing Balance</span>
                      <span className="font-mono font-bold text-xl text-emerald-700">{formatCurrency(ledgerSummary?.closingBalance || 0)}</span>
                    </div>
                  </div>
                </Card>

                <Card title="Collection Performance">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Expected Collection</span>
                      <span className="font-mono font-bold">{formatCurrency(ledgerSummary?.expectedCollection || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Actual Received</span>
                      <span className="font-mono font-bold text-emerald-600">{formatCurrency(ledgerSummary?.receivedCollection || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Pending Amount</span>
                      <span className="font-mono font-bold text-rose-600">{formatCurrency((ledgerSummary?.expectedCollection || 0) - (ledgerSummary?.receivedCollection || 0))}</span>
                    </div>
                    <div className="pt-4">
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, ((ledgerSummary?.receivedCollection || 0) / (ledgerSummary?.expectedCollection || 1)) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-stone-400 mt-2 text-right uppercase font-bold tracking-wider">
                        {Math.round(((ledgerSummary?.receivedCollection || 0) / (ledgerSummary?.expectedCollection || 1)) * 100)}% Collected
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activePage === 'pending' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-800">Pending Maintenance Dues</h3>
                <div className="text-right">
                  <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">Total Outstanding</p>
                  <p className="text-2xl font-mono font-bold text-rose-600">
                    {formatCurrency(pendingReport.reduce((sum, p) => sum + p.totalPendingAmount, 0))}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Flat</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Owner</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Pending Months</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Total Dues</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {pendingReport.map(p => (
                      <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-stone-800">{p.flat_number}</td>
                        <td className="px-6 py-4 text-stone-600">{p.owner_name}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {p.pendingMonths.map(m => (
                              <span key={m} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded border border-rose-100">
                                {getMonthDisplay(m).split(' ')[0]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-rose-600">{formatCurrency(p.totalPendingAmount)}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setActivePage('payments');
                              setShowPaymentModal(true);
                            }}
                            className="text-emerald-600 hover:text-emerald-700 text-xs font-bold uppercase tracking-wider"
                          >
                            Collect
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendingReport.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">All maintenance dues are cleared!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePage === 'reports' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card title="Annual Report" icon={Download}>
                  <p className="text-sm text-stone-500 mb-6">Generate a comprehensive report for the entire financial year.</p>
                  <button 
                    onClick={async () => {
                      const year = selectedMonth.split('-')[0];
                      const months = Array.from({length: 12}, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
                      const data = await Promise.all(months.map(async m => {
                        const [summaryRes, expensesRes] = await Promise.all([
                          fetch(`/api/ledger-summary?month=${m}`),
                          fetch(`/api/expenses?month=${m}`)
                        ]);
                        const summary = await summaryRes.json();
                        const expenses = await expensesRes.json();
                        return { 
                          month: m, 
                          received: summary.receivedCollection, 
                          spent: summary.expenses, 
                          opening: summary.openingBalance,
                          closing: summary.closingBalance,
                          expenses: expenses
                        };
                      }));
                      generateRangePDF(settings.apartment_name, `Annual Maintenance Summary - ${year}`, data);
                    }}
                    className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Generate Yearly PDF
                  </button>
                </Card>

                <Card title="Custom Range Report" icon={FileText}>
                  <p className="text-sm text-stone-500 mb-4">Select a custom period to generate a detailed summary report.</p>
                  <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">From</label>
                        <input 
                          type="month" 
                          value={reportStartMonth}
                          onChange={(e) => setReportStartMonth(e.target.value)}
                          className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">To</label>
                        <input 
                          type="month" 
                          value={reportEndMonth}
                          onChange={(e) => setReportEndMonth(e.target.value)}
                          className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const start = new Date(reportStartMonth + "-01");
                      const end = new Date(reportEndMonth + "-01");
                      const months: string[] = [];
                      let current = new Date(start);
                      
                      while (current <= end) {
                        months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
                        current.setMonth(current.getMonth() + 1);
                      }

                      if (months.length === 0) {
                        showToast('Invalid date range', 'error');
                        return;
                      }

                      setIsLoading(true);
                      try {
                        const data = await Promise.all(months.map(async m => {
                          const [summaryRes, expensesRes] = await Promise.all([
                            fetch(`/api/ledger-summary?month=${m}`),
                            fetch(`/api/expenses?month=${m}`)
                          ]);
                          const summary = await summaryRes.json();
                          const expenses = await expensesRes.json();
                          return { 
                            month: m, 
                            received: summary.receivedCollection, 
                            spent: summary.expenses, 
                            opening: summary.openingBalance,
                            closing: summary.closingBalance,
                            expenses: expenses
                          };
                        }));
                        generateRangePDF(
                          settings.apartment_name, 
                          `Maintenance Summary ${getMonthDisplay(reportStartMonth)} to ${getMonthDisplay(reportEndMonth)}`, 
                          data
                        );
                      } catch (error) {
                        showToast('Error generating report', 'error');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="w-full bg-stone-900 text-white py-2 rounded-lg font-bold hover:bg-stone-800 transition-colors"
                  >
                    Generate Range PDF
                  </button>
                </Card>

                <Card title="Data Backup" icon={FileJson}>
                  <p className="text-sm text-stone-500 mb-6">Export all your data to a JSON file for safe keeping or migration.</p>
                  <button 
                    onClick={handleExport}
                    className="w-full bg-stone-900 text-white py-2 rounded-lg font-bold hover:bg-stone-800 transition-colors"
                  >
                    Export Backup (JSON)
                  </button>
                </Card>

                <Card title="Restore Data" icon={Upload}>
                  <p className="text-sm text-stone-500 mb-6">Restore your data from a previously exported backup file.</p>
                  <label className="w-full bg-white border-2 border-dashed border-stone-200 text-stone-600 py-2 rounded-lg font-bold hover:border-emerald-500 hover:text-emerald-600 cursor-pointer flex items-center justify-center transition-all">
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    Upload Backup
                  </label>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Admin Bulk Update" icon={AlertCircle}>
                  <p className="text-sm text-stone-500 mb-6">
                    Bulk update maintenance (Rs. 2000) and Watchman Salary (Rs. 9000) from June 2025 to Dec 2026.
                    <br />
                    <span className="text-rose-600 font-bold">Warning: This will overwrite existing payments for these months.</span>
                  </p>
                  <button 
                    onClick={() => {
                      showConfirm(
                        'Bulk Update Data',
                        'This will update all flats to Rs. 2000 maintenance and set Watchman Salary to Rs. 9000 for June 2025 - Dec 2026. Existing payments for these months will be overwritten. Continue?',
                        async () => {
                          setIsLoading(true);
                          try {
                            const res = await fetch('/api/bulk-update-maintenance', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                startMonth: '2025-06',
                                endMonth: '2026-12',
                                maintenanceAmount: 2000,
                                watchmanSalary: 9000
                              })
                            });
                            if (res.ok) {
                              fetchInitialData();
                              fetchMonthData();
                              showToast('Bulk update completed successfully');
                            } else {
                              showToast('Error during bulk update', 'error');
                            }
                          } catch (error) {
                            showToast('Error during bulk update', 'error');
                          } finally {
                            setIsLoading(false);
                          }
                        }
                      );
                    }}
                    className="w-full bg-rose-600 text-white py-2 rounded-lg font-bold hover:bg-rose-700 transition-colors"
                  >
                    Run Bulk Update (Jun 2025 - Dec 2026)
                  </button>
                </Card>

                <Card title="Apartment Settings">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const name = new FormData(e.currentTarget).get('apartment_name') as string;
                  await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apartment_name: name })
                  });
                  setSettings({ ...settings, apartment_name: name });
                  showToast('Settings updated');
                }} className="flex gap-4 items-end max-w-md">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Apartment Name</label>
                    <input 
                      name="apartment_name" 
                      defaultValue={settings.apartment_name} 
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700">Save</button>
                </form>
              </Card>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Modals */}
      {showFlatModal && (
        <Modal title={typeof showFlatModal === 'object' ? 'Edit Flat' : 'Add New Flat'} onClose={() => setShowFlatModal(false)}>
          <form onSubmit={handleAddFlat} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Flat Number</label>
                <input name="flat_number" defaultValue={typeof showFlatModal === 'object' ? showFlatModal.flat_number : ''} required className="w-full px-3 py-2 border border-stone-200 rounded-lg" placeholder="e.g. 101" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Maintenance Amount</label>
                <input name="maintenance_amount" type="number" defaultValue={typeof showFlatModal === 'object' ? showFlatModal.maintenance_amount : '2000'} required className="w-full px-3 py-2 border border-stone-200 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Owner Name</label>
              <input name="owner_name" defaultValue={typeof showFlatModal === 'object' ? showFlatModal.owner_name : ''} required className="w-full px-3 py-2 border border-stone-200 rounded-lg" placeholder="Full Name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Notes</label>
              <textarea name="notes" defaultValue={typeof showFlatModal === 'object' ? showFlatModal.notes : ''} className="w-full px-3 py-2 border border-stone-200 rounded-lg h-24" placeholder="Any additional details..." />
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 shadow-md">Save Flat Details</button>
          </form>
        </Modal>
      )}

      {showPaymentModal && (
        <Modal title="Record Maintenance Payment" onClose={() => setShowPaymentModal(false)}>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Select Flat</label>
                <select name="flat_id" required className="w-full px-3 py-2 border border-stone-200 rounded-lg">
                  {flats.map(f => <option key={f.id} value={f.id}>{f.flat_number} - {f.owner_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">For Month</label>
                <input name="month" type="month" defaultValue={selectedMonth} required className="w-full px-3 py-2 border border-stone-200 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Amount Received</label>
                <input 
                  name="amount_received" 
                  type="number" 
                  defaultValue="2000" 
                  required 
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Payment Date</label>
                <input name="date_received" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full px-3 py-2 border border-stone-200 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Payment Mode</label>
                <select name="payment_mode" required className="w-full px-3 py-2 border border-stone-200 rounded-lg">
                  <option>UPI</option>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" name="is_arrears" id="is_arrears" className="w-4 h-4 text-emerald-600 rounded" />
                <label htmlFor="is_arrears" className="text-sm text-stone-600 font-medium">Arrears Payment</label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Remarks</label>
              <input name="remarks" className="w-full px-3 py-2 border border-stone-200 rounded-lg" placeholder="Optional notes..." />
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 shadow-md">Record Payment</button>
          </form>
        </Modal>
      )}

      {showExpenseModal && (
        <Modal title="Record New Expense" onClose={() => setShowExpenseModal(false)}>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full px-3 py-2 border border-stone-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Category</label>
                <select name="category" required className="w-full px-3 py-2 border border-stone-200 rounded-lg">
                  <option>Salary</option>
                  <option>Cleaning</option>
                  <option>Electricity</option>
                  <option>Water</option>
                  <option>Repairs</option>
                  <option>Lift Maintenance</option>
                  <option>Security</option>
                  <option>Miscellaneous</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Amount</label>
                <input name="amount" type="number" required className="w-full px-3 py-2 border border-stone-200 rounded-lg" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Vendor / Person</label>
                <input name="vendor" className="w-full px-3 py-2 border border-stone-200 rounded-lg" placeholder="Paid to..." />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
              <input name="description" required className="w-full px-3 py-2 border border-stone-200 rounded-lg" placeholder="What was this for?" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Payment Mode</label>
              <select name="payment_mode" required className="w-full px-3 py-2 border border-stone-200 rounded-lg">
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
              </select>
            </div>
            <button className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold hover:bg-rose-700 shadow-md">Record Expense</button>
          </form>
        </Modal>
      )}

      {confirmConfig && (
        <ConfirmModal 
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={() => {
            confirmConfig.onConfirm();
            setConfirmConfig(null);
          }}
          onClose={() => setConfirmConfig(null)}
        />
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-8 right-8 z-[200] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300",
      type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
    )}>
      <p className="font-bold text-sm">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={16} /></button>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose }: { title: string, message: string, onConfirm: () => void, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-2">{title}</h3>
          <p className="text-stone-500 text-sm mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-stone-200 text-stone-600 rounded-lg font-bold hover:bg-stone-50 transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors shadow-md">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subLabel, icon: Icon, color }: { label: string, value: string, subLabel: string, icon: any, color: 'emerald' | 'rose' | 'blue' | 'amber' }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };

  return (
    <div className={cn("p-6 rounded-2xl border bg-white shadow-sm", colors[color])}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2 rounded-lg", colors[color].replace('bg-', 'bg-opacity-20 bg-'))}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <h4 className="text-2xl font-mono font-bold mb-1">{value}</h4>
      <p className="text-[10px] font-medium opacity-60 uppercase tracking-tight">{subLabel}</p>
    </div>
  );
}

function Card({ title, children, action, icon: Icon }: { title: string, children: React.ReactNode, action?: React.ReactNode, icon?: any }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-stone-400" />}
          <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="font-bold text-stone-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
