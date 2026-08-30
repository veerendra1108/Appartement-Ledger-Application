import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Edit3, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  IndianRupee,
  Calendar,
  CreditCard,
  User,
  Plus,
  ArrowDownCircle,
  ShieldAlert
} from 'lucide-react';
import { Flat, Payment, PaymentStatus, PendingReportItem, formatCurrency, formatDate, getMonthDisplay } from '../types';

interface PaymentsTableProps {
  currentMonth: string;
  flats: Flat[];
  payments: Payment[];
  pendingReport?: PendingReportItem[];
  onToggleStatus: (flatId: number, status: 'paid' | 'not_paid', mode?: string) => Promise<void>;
  onSavePayment: (payment: Partial<Payment>) => Promise<void>;
  onAddFlat?: () => void;
}

export function PaymentsTable({
  currentMonth,
  flats,
  payments,
  pendingReport = [],
  onToggleStatus,
  onSavePayment,
  onAddFlat
}: PaymentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'not_paid' | 'partial'>('all');
  const [editingPayment, setEditingPayment] = useState<{
    flat: Flat;
    payment?: Payment;
    amountReceived: number;
    amountExpected: number;
    status: PaymentStatus;
    dateReceived: string;
    paymentMode: string;
    remarks: string;
    pastArrears: number;
    pastMonthsText: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine flats with payments for the current month and check pending report
  const rows = flats.map(flat => {
    const payment = payments.find(p => String(p.flat_id) === String(flat.id) && p.month === currentMonth);
    const expected = Number(payment?.amount_expected) || Number(flat.maintenance_amount) || 2000;
    const received = payment ? Number(payment.amount_received) : 0;
    
    let status: PaymentStatus = payment?.status || (payment ? (received >= expected ? 'paid' : received === 0 ? 'not_paid' : 'partial') : 'not_paid');

    const pendingItem = pendingReport.find(p => String(p.id) === String(flat.id));
    const priorPendingMonths = pendingItem?.pendingMonths.filter(m => (typeof m === 'object' ? m.month : m) !== currentMonth) || [];
    const pastArrears = priorPendingMonths.reduce((sum, m) => sum + (typeof m === 'object' ? m.amount : (Number(flat.maintenance_amount) || 2000)), 0);
    const pastMonthsText = priorPendingMonths.map(m => getMonthDisplay(typeof m === 'object' ? m.month : m)).join(', ');

    return {
      flat,
      payment,
      expected,
      received,
      status,
      dateReceived: payment?.date_received || '',
      mode: payment?.payment_mode || (status === 'paid' ? 'UPI' : '-'),
      remarks: payment?.remarks || '',
      pastArrears,
      pastMonthsText
    };
  });

  // Filter & Search
  const filteredRows = rows.filter(r => {
    const matchesSearch = 
      r.flat.flat_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.flat.owner_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const totalExpected = rows.reduce((sum, r) => sum + r.expected, 0);
  const totalReceived = rows.reduce((sum, r) => sum + r.received, 0);
  const totalUnpaid = Math.max(0, totalExpected - totalReceived);
  const paidCount = rows.filter(r => r.status === 'paid').length;
  const notPaidCount = rows.filter(r => r.status === 'not_paid').length;

  const handleOpenEdit = (flat: Flat, payment?: Payment) => {
    const expected = Number(payment?.amount_expected) || Number(flat.maintenance_amount) || 2000;
    const received = payment ? Number(payment.amount_received) : expected;
    const status: PaymentStatus = payment?.status || (received >= expected ? 'paid' : received === 0 ? 'not_paid' : 'partial');

    const pendingItem = pendingReport.find(p => String(p.id) === String(flat.id));
    const priorPendingMonths = pendingItem?.pendingMonths.filter(m => (typeof m === 'object' ? m.month : m) !== currentMonth) || [];
    const pastArrears = priorPendingMonths.reduce((sum, m) => sum + (typeof m === 'object' ? m.amount : (Number(flat.maintenance_amount) || 2000)), 0);
    const pastMonthsText = priorPendingMonths.map(m => getMonthDisplay(typeof m === 'object' ? m.month : m)).join(', ');

    setEditingPayment({
      flat,
      payment,
      amountExpected: expected,
      amountReceived: received,
      status,
      dateReceived: payment?.date_received || new Date().toISOString().split('T')[0],
      paymentMode: payment?.payment_mode || 'UPI',
      remarks: payment?.remarks || '',
      pastArrears,
      pastMonthsText
    });
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    setIsSubmitting(true);
    try {
      await onSavePayment({
        id: editingPayment.payment?.id,
        flat_id: editingPayment.flat.id,
        flat_number: editingPayment.flat.flat_number,
        owner_name: editingPayment.flat.owner_name,
        month: currentMonth,
        amount_expected: editingPayment.amountExpected,
        amount_received: Number(editingPayment.amountReceived),
        status: editingPayment.status,
        date_received: editingPayment.status === 'not_paid' ? '' : editingPayment.dateReceived,
        payment_mode: editingPayment.status === 'not_paid' ? 'Pending' : editingPayment.paymentMode,
        remarks: editingPayment.remarks,
        is_arrears: editingPayment.status === 'not_paid' ? 1 : 0
      });
      setEditingPayment(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <span>Maintenance Collections</span>
            <span className="bg-stone-200 text-stone-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {paidCount}/{flats.length} Paid
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Default maintenance: ₹2,000/flat. Past arrears can be collected in the current month without mutating historical records.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search flat or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center rounded-xl bg-stone-200/70 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              All ({rows.length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600 hover:text-emerald-700'}`}
            >
              Paid ({paidCount})
            </button>
            <button
              onClick={() => setStatusFilter('not_paid')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${statusFilter === 'not_paid' ? 'bg-rose-600 text-white shadow-xs' : 'text-stone-600 hover:text-rose-700'}`}
            >
              Unpaid ({notPaidCount})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-stone-100/75 border-b border-stone-200 text-stone-600 font-bold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Flat No</th>
              <th className="py-3 px-4">Owner Name</th>
              <th className="py-3 px-4 text-right">Expected</th>
              <th className="py-3 px-4 text-right">Received</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 hidden md:table-cell">Date & Mode</th>
              <th className="py-3 px-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-400 text-sm">
                  No flats match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map(({ flat, payment, expected, received, status, dateReceived, mode, remarks, pastArrears }) => {
                const isPaid = status === 'paid';
                const isNotPaid = status === 'not_paid';
                const isPartial = status === 'partial';
                const hasExtraArrearsCollection = received > expected;

                return (
                  <tr 
                    key={flat.id} 
                    className={`hover:bg-stone-50/80 transition-colors ${
                      isNotPaid ? 'bg-rose-50/20' : isPaid ? 'bg-emerald-50/10' : 'bg-amber-50/20'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-stone-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center font-mono font-bold text-stone-800 text-xs">
                          {flat.flat_number}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-stone-400 hidden sm:inline" />
                        <span>{flat.owner_name}</span>
                      </div>
                      {pastArrears > 0 && isNotPaid && (
                        <div className="text-[10px] text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
                          <ShieldAlert size={10} />
                          <span>Has {formatCurrency(pastArrears)} prior arrears</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-stone-600">
                      {formatCurrency(expected)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                      <div>
                        <span className={isPaid ? 'text-emerald-700' : isNotPaid ? 'text-rose-600' : 'text-amber-600'}>
                          {formatCurrency(received)}
                        </span>
                        {hasExtraArrearsCollection && (
                          <span className="block text-[10px] text-emerald-700 font-sans font-bold">
                            (+{formatCurrency(received - expected)} Arrears)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isPaid && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          PAID
                        </span>
                      )}
                      {isNotPaid && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          <AlertCircle size={11} className="text-rose-600" />
                          NOT PAID
                        </span>
                      )}
                      {isPartial && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={11} className="text-amber-600" />
                          PARTIAL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-500 text-xs hidden md:table-cell">
                      {isPaid || isPartial ? (
                        <div>
                          <span>{dateReceived ? formatDate(dateReceived) : 'Recorded'}</span>
                          <span className="text-stone-400 ml-1.5">• {mode}</span>
                          {remarks && <span className="text-[10px] text-stone-400 block truncate max-w-xs">{remarks}</span>}
                        </div>
                      ) : (
                        <span className="text-rose-400 font-medium italic">Added to Arrears</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Mark Paid */}
                        <button
                          onClick={() => onToggleStatus(flat.id, 'paid')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isPaid 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                          }`}
                          title={`Mark Current Month Paid (${formatCurrency(expected)})`}
                        >
                          <Check size={14} />
                        </button>

                        {/* Quick Mark Not Paid */}
                        <button
                          onClick={() => onToggleStatus(flat.id, 'not_paid')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isNotPaid 
                              ? 'bg-rose-600 text-white border-rose-600' 
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                          }`}
                          title="Mark Not Paid (Arrears)"
                        >
                          <X size={14} />
                        </button>

                        {/* Edit / Details */}
                        <button
                          onClick={() => handleOpenEdit(flat, payment)}
                          className="p-1.5 rounded-lg bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                          title="Edit Payment & Arrears"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-stone-500">Expected Total:</span>{' '}
            <span className="text-stone-900 font-bold font-mono">{formatCurrency(totalExpected)}</span>
          </div>
          <div>
            <span className="text-stone-500">Received Total:</span>{' '}
            <span className="text-emerald-700 font-bold font-mono">{formatCurrency(totalReceived)}</span>
          </div>
          <div>
            <span className="text-stone-500">Unpaid Arrears:</span>{' '}
            <span className="text-rose-600 font-bold font-mono">{formatCurrency(totalUnpaid)}</span>
          </div>
        </div>

        {onAddFlat && (
          <button
            onClick={onAddFlat}
            className="flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-bold"
          >
            <Plus size={14} />
            <span>Manage Flat Roster</span>
          </button>
        )}
      </div>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setEditingPayment(null)} />
          <div className="relative bg-white text-stone-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  Update Payment • Flat {editingPayment.flat.flat_number}
                </h3>
                <p className="text-xs text-stone-500">{editingPayment.flat.owner_name} • {getMonthDisplay(currentMonth)}</p>
              </div>
              <button 
                onClick={() => setEditingPayment(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 text-sm">
              {/* Past Arrears Notification & Quick Options */}
              {editingPayment.pastArrears > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-amber-800 font-bold">
                    <span className="flex items-center gap-1">
                      <AlertCircle size={13} />
                      Prior Arrears Due: {formatCurrency(editingPayment.pastArrears)}
                    </span>
                    <span className="text-[10px] text-amber-600 font-medium">
                      ({editingPayment.pastMonthsText})
                    </span>
                  </div>
                  <p className="text-stone-600 text-[11px]">
                    If collecting prior arrears now, select below to record the full amount in {getMonthDisplay(currentMonth)} without altering historical records:
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPayment({
                          ...editingPayment,
                          amountReceived: editingPayment.amountExpected,
                          status: 'paid'
                        });
                      }}
                      className="flex-1 py-1.5 px-2 bg-white border border-amber-300 rounded-lg font-bold text-stone-700 hover:bg-amber-100 text-[11px]"
                    >
                      Regular Only ({formatCurrency(editingPayment.amountExpected)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const totalCombined = editingPayment.amountExpected + editingPayment.pastArrears;
                        setEditingPayment({
                          ...editingPayment,
                          amountReceived: totalCombined,
                          status: 'paid',
                          remarks: `Maint (${formatCurrency(editingPayment.amountExpected)}) + Arrears (${formatCurrency(editingPayment.pastArrears)})`
                        });
                      }}
                      className="flex-1 py-1.5 px-2 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 text-[11px]"
                    >
                      Clear All ({formatCurrency(editingPayment.amountExpected + editingPayment.pastArrears)})
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Payment Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPayment({
                      ...editingPayment,
                      status: 'paid',
                      amountReceived: editingPayment.amountExpected
                    })}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-colors ${
                      editingPayment.status === 'paid'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Paid (Full)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingPayment({
                      ...editingPayment,
                      status: 'not_paid',
                      amountReceived: 0
                    })}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-colors ${
                      editingPayment.status === 'not_paid'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Not Paid (Arrears)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingPayment({
                      ...editingPayment,
                      status: 'partial'
                    })}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-colors ${
                      editingPayment.status === 'partial'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Partial
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Expected (₹)
                  </label>
                  <input
                    type="number"
                    value={editingPayment.amountExpected}
                    onChange={(e) => setEditingPayment({
                      ...editingPayment,
                      amountExpected: Number(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Received (₹)
                  </label>
                  <input
                    type="number"
                    value={editingPayment.amountReceived}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      let newStatus: PaymentStatus = 'paid';
                      if (val === 0) newStatus = 'not_paid';
                      else if (val < editingPayment.amountExpected) newStatus = 'partial';
                      setEditingPayment({
                        ...editingPayment,
                        amountReceived: val,
                        status: newStatus
                      });
                    }}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono font-bold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {editingPayment.status !== 'not_paid' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={editingPayment.dateReceived}
                      onChange={(e) => setEditingPayment({
                        ...editingPayment,
                        dateReceived: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={editingPayment.paymentMode}
                      onChange={(e) => setEditingPayment({
                        ...editingPayment,
                        paymentMode: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 text-xs sm:text-sm"
                    >
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional remarks (e.g. Transaction ID, past arrears clearance)"
                  value={editingPayment.remarks}
                  onChange={(e) => setEditingPayment({
                    ...editingPayment,
                    remarks: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
