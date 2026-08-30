import React, { useState } from 'react';
import { Flat, formatCurrency, DEFAULT_MAINTENANCE_AMOUNT } from '../types';
import { Plus, Edit2, Trash2, Home, User, IndianRupee } from 'lucide-react';

interface FlatManagerModalProps {
  flats: Flat[];
  onClose: () => void;
  onAddFlat: (flat: Omit<Flat, 'id'>) => Promise<void>;
  onUpdateFlat: (id: number, flat: Partial<Flat>) => Promise<void>;
  onDeleteFlat: (id: number) => Promise<void>;
}

export function FlatManagerModal({
  flats,
  onClose,
  onAddFlat,
  onUpdateFlat,
  onDeleteFlat
}: FlatManagerModalProps) {
  const [flatNumber, setFlatNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [maintenanceAmount, setMaintenanceAmount] = useState(DEFAULT_MAINTENANCE_AMOUNT);
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStartEdit = (flat: Flat) => {
    setEditingId(flat.id);
    setFlatNumber(flat.flat_number);
    setOwnerName(flat.owner_name);
    setMaintenanceAmount(flat.maintenance_amount || 2000);
    setNotes(flat.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFlatNumber('');
    setOwnerName('');
    setMaintenanceAmount(DEFAULT_MAINTENANCE_AMOUNT);
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatNumber.trim() || !ownerName.trim()) return;
    setLoading(true);
    try {
      if (editingId) {
        await onUpdateFlat(editingId, {
          flat_number: flatNumber.trim(),
          owner_name: ownerName.trim(),
          maintenance_amount: Number(maintenanceAmount),
          notes: notes.trim()
        });
      } else {
        await onAddFlat({
          flat_number: flatNumber.trim(),
          owner_name: ownerName.trim(),
          maintenance_amount: Number(maintenanceAmount),
          notes: notes.trim()
        });
      }
      handleCancelEdit();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white text-stone-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="text-emerald-700" size={20} />
            <h3 className="font-bold text-stone-900 text-base">Apartment Flats & Owners Roster</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-full"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Add / Edit Form */}
          <form onSubmit={handleSubmit} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">
              {editingId ? 'Edit Flat Details' : 'Add New Flat'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Flat Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 202"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Maintenance / Mo (₹)</label>
                <input
                  type="number"
                  required
                  value={maintenanceAmount}
                  onChange={(e) => setMaintenanceAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <input
                type="text"
                placeholder="Optional notes (e.g. Floor 2, Tenant name)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-xs"
              />

              <div className="flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {loading ? 'Saving...' : editingId ? 'Update Flat' : 'Add Flat'}
                </button>
              </div>
            </div>
          </form>

          {/* Flats List */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">
              Existing Flats ({flats.length})
            </h4>
            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
              {flats.map((f) => (
                <div key={f.id} className="p-3 bg-white flex items-center justify-between hover:bg-stone-50 text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center font-mono font-bold text-stone-800 text-xs">
                      {f.flat_number}
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">{f.owner_name}</p>
                      <p className="text-stone-400 text-xs">₹{f.maintenance_amount || 2000}/mo {f.notes ? `• ${f.notes}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(f)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100"
                      title="Edit Flat"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteFlat(f.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      title="Delete Flat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
