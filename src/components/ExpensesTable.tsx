import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Receipt, 
  ShieldCheck, 
  Trash, 
  Zap, 
  Droplet, 
  Wrench, 
  Sparkles,
  Calendar,
  IndianRupee,
  Search
} from 'lucide-react';
import { Expense, formatCurrency, formatDate, DEFAULT_WATCHMAN_SALARY, DEFAULT_DUSTBIN_AMOUNT } from '../types';

interface ExpensesTableProps {
  currentMonth: string;
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  onDeleteExpense: (id: number) => Promise<void>;
}

export function ExpensesTable({
  currentMonth,
  expenses,
  onAddExpense,
  onDeleteExpense
}: ExpensesTableProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState('Salary');
  const [description, setDescription] = useState('Watchman Salary');
  const [amount, setAmount] = useState<number>(DEFAULT_WATCHMAN_SALARY);
  const [vendor, setVendor] = useState('Watchman');
  const [date, setDate] = useState(`${currentMonth}-01`);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Quick preset templates
  const presets = [
    { label: 'Watchman Salary (₹9000)', cat: 'Salary', desc: 'Watchman Salary', amt: 9000, vend: 'Watchman', icon: ShieldCheck },
    { label: 'Dustbin Collection (₹500)', cat: 'Dustbin Collection', desc: 'Monthly Dustbin & Garbage Collection', amt: 500, vend: 'Sanitation Service', icon: Trash },
    { label: 'Common Electricity', cat: 'Electricity', desc: 'Apartment Common Area Electricity Bill', amt: 3500, vend: 'Electricity Board', icon: Zap },
    { label: 'Water Tanker', cat: 'Water', desc: 'Water Tanker Supply', amt: 1200, vend: 'Water Supplier', icon: Droplet },
    { label: 'Motor / Pump Repair', cat: 'Repairs & Maintenance', desc: 'Motor / Borewell Pump Repair', amt: 2500, vend: 'Technician', icon: Wrench },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setCategory(p.cat);
    setDescription(p.desc);
    setAmount(p.amt);
    setVendor(p.vend);
    setDate(`${currentMonth}-01`);
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    setCategory('Repairs & Maintenance');
    setDescription('');
    setAmount(1000);
    setVendor('');
    setDate(`${currentMonth}-01`);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) return;
    setIsSubmitting(true);
    try {
      await onAddExpense({
        category,
        description,
        amount: Number(amount),
        vendor,
        date,
        payment_mode: paymentMode,
        notes
      });
      setShowAddModal(false);
      setDescription('');
      setAmount(1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.vendor && e.vendor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header & Preset Shortcuts */}
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/50 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>Expenses & Outflows</span>
              <span className="bg-stone-200 text-stone-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {expenses.length} Records
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Includes Watchman Salary (₹9,000), Dustbin Collection (₹500), and maintenance utilities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Plus size={14} />
              <span>Add Custom Expense</span>
            </button>
          </div>
        </div>

        {/* Quick Presets Carousel/Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold uppercase text-stone-400 whitespace-nowrap">Quick Add:</span>
          {presets.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:border-emerald-600 hover:text-emerald-700 text-stone-700 font-medium whitespace-nowrap transition-colors shadow-2xs"
              >
                <Icon size={13} className="text-stone-500" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-stone-100/75 border-b border-stone-200 text-stone-600 font-bold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4">Vendor & Mode</th>
              <th className="py-3 px-4 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-400 text-sm">
                  No expenses recorded for this month yet. Use the Quick Add buttons above or click "Initialize Month".
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-stone-700 text-xs">
                    {formatDate(exp.date)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-stone-800">
                    <span className="inline-block px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-xs border border-stone-200">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-stone-900">
                    <div>
                      <span>{exp.description}</span>
                      {exp.notes && (
                        <p className="text-[11px] text-stone-400 font-normal">{exp.notes}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="py-3 px-4 text-stone-600 text-xs">
                    <span>{exp.vendor || '-'}</span>
                    <span className="text-stone-400 ml-1">({exp.payment_mode || 'Cash'})</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => exp.id && onDeleteExpense(exp.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      title="Delete Expense"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs font-semibold">
        <span className="text-stone-600">Total Monthly Expenditure:</span>
        <span className="text-rose-700 font-mono font-bold text-sm sm:text-base">
          {formatCurrency(totalSpent)}
        </span>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white text-stone-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="text-emerald-700" size={18} />
                <h3 className="font-bold text-stone-800 text-base">Record New Expense</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Salary">Salary (Watchman / Security)</option>
                  <option value="Dustbin Collection">Dustbin & Waste Collection</option>
                  <option value="Electricity">Electricity Bill (Common Area / Lift)</option>
                  <option value="Water">Water Tanker & Borewell Supply</option>
                  <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                  <option value="Cleaning & Sanitation">Cleaning & Sanitation</option>
                  <option value="Lift AMC">Lift AMC & Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Watchman Salary, Garbage collection fee"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono font-bold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Vendor / Recipient
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Watchman, Sanitation staff"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 text-xs sm:text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Optional Notes
                </label>
                <input
                  type="text"
                  placeholder="Receipt number or details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
