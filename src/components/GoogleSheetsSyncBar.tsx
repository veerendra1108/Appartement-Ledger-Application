import React from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Download, 
  Upload, 
  CheckCircle2, 
  Clock
} from 'lucide-react';
import { DEFAULT_SPREADSHEET_ID, DEFAULT_SPREADSHEET_URL } from '../types';

interface GoogleSheetsSyncBarProps {
  apartmentName: string;
  currentMonth: string;
  onDataSynced?: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export function GoogleSheetsSyncBar({
  apartmentName,
  currentMonth,
  showToast
}: GoogleSheetsSyncBarProps) {
  const sheetUrl = DEFAULT_SPREADSHEET_URL;

  const handleDownloadExcel = () => {
    window.location.href = '/api/export-excel';
    showToast('Downloading maintenance_data.xlsx file...');
  };

  const handleDownloadJsonBackup = async () => {
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maintenance_backup_${currentMonth}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded full backup file!');
    } catch (e) {
      showToast('Failed to export backup', 'error');
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-3.5 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
          <FileSpreadsheet size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-900">Google Sheet & Excel Backend</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              Active
            </span>
          </div>
          <p className="text-[11px] text-stone-500">
            Records stored from June 2025 • ₹2,000/flat default • ₹9,000 Watchman • ₹500 Dustbin
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <a
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
          title="Open connected Google Sheet"
        >
          <ExternalLink size={13} />
          <span>Open Google Sheet</span>
        </a>

        <button
          onClick={handleDownloadExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
          title="Download latest Excel file (.xlsx)"
        >
          <Download size={13} />
          <span>Download Excel</span>
        </button>

        <button
          onClick={handleDownloadJsonBackup}
          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
          title="Export JSON Backup"
        >
          <Upload size={14} className="rotate-180" />
        </button>
      </div>
    </div>
  );
}
