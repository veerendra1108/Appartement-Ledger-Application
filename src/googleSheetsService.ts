import { Flat, Payment, Expense, AppSettings, DEFAULT_SPREADSHEET_ID } from './types';

export interface GoogleSyncResult {
  success: boolean;
  message: string;
  flatsCount?: number;
  paymentsCount?: number;
  expensesCount?: number;
  updatedAt?: string;
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const USERINFO_API = 'https://www.googleapis.com/oauth2/v3/userinfo';

export class GoogleSheetsService {
  private spreadsheetId: string;
  private accessToken: string | null = null;

  constructor(spreadsheetId: string = DEFAULT_SPREADSHEET_ID) {
    this.spreadsheetId = spreadsheetId;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  setSpreadsheetId(id: string) {
    this.spreadsheetId = id;
  }

  getSpreadsheetId() {
    return this.spreadsheetId;
  }

  async getUserProfile(token?: string) {
    const t = token || this.accessToken;
    if (!t) return null;
    try {
      const res = await fetch(USERINFO_API, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Failed to get user profile', e);
    }
    return null;
  }

  async initializeSheetsStructure(): Promise<boolean> {
    if (!this.accessToken) throw new Error('No access token available. Please sign in to Google.');

    // 1. Get existing sheets metadata
    const metadataRes = await fetch(`${SHEETS_API_BASE}/${this.spreadsheetId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!metadataRes.ok) {
      const err = await metadataRes.json();
      throw new Error(`Google Sheets API Error (${metadataRes.status}): ${err.error?.message || 'Access denied. Please check permissions.'}`);
    }

    const metadata = await metadataRes.json();
    const existingTitles: string[] = (metadata.sheets || []).map((s: any) => s.properties?.title);

    const requiredSheets = ['Flats', 'Payments', 'Expenses', 'Summary_Ledger', 'Settings'];
    const requestsToAdd: any[] = [];

    for (const title of requiredSheets) {
      if (!existingTitles.includes(title)) {
        requestsToAdd.push({
          addSheet: {
            properties: {
              title: title,
              gridProperties: { rowCount: 1000, columnCount: 20 },
            },
          },
        });
      }
    }

    if (requestsToAdd.length > 0) {
      await fetch(`${SHEETS_API_BASE}/${this.spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: requestsToAdd }),
      });
    }

    // Set Header rows if empty
    await this.ensureHeaders();
    return true;
  }

  private async ensureHeaders() {
    const headersConfig = [
      {
        range: 'Flats!A1:E1',
        values: [['ID', 'Flat Number', 'Owner Name', 'Monthly Maintenance', 'Notes']],
      },
      {
        range: 'Payments!A1:L1',
        values: [['ID', 'Flat ID', 'Flat Number', 'Owner Name', 'Month', 'Expected Amount', 'Amount Received', 'Status', 'Date Received', 'Is Arrears', 'Payment Mode', 'Remarks']],
      },
      {
        range: 'Expenses!A1:H1',
        values: [['ID', 'Date', 'Category', 'Description', 'Amount', 'Vendor', 'Payment Mode', 'Notes']],
      },
      {
        range: 'Summary_Ledger!A1:G1',
        values: [['Month', 'Opening Balance', 'Expected Collection', 'Received Collection', 'Unpaid Arrears', 'Total Expenses', 'Closing Balance']],
      },
      {
        range: 'Settings!A1:B1',
        values: [['Key', 'Value']],
      },
    ];

    for (const item of headersConfig) {
      await fetch(`${SHEETS_API_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(item.range)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: item.values }),
      });
    }
  }

  // PUSH local data to Google Sheets
  async pushDataToSheet(data: {
    flats: Flat[];
    payments: Payment[];
    expenses: Expense[];
    settings: AppSettings | Record<string, string>;
  }): Promise<GoogleSyncResult> {
    if (!this.accessToken) {
      throw new Error('Google Drive/Sheets access token required. Please sign in.');
    }

    await this.initializeSheetsStructure();

    // Prepare Flats rows
    const flatsRows = [
      ['ID', 'Flat Number', 'Owner Name', 'Monthly Maintenance', 'Notes'],
      ...data.flats.map(f => [
        f.id,
        f.flat_number,
        f.owner_name,
        f.maintenance_amount,
        f.notes || ''
      ])
    ];

    // Prepare Payments rows
    const paymentsRows = [
      ['ID', 'Flat ID', 'Flat Number', 'Owner Name', 'Month', 'Expected Amount', 'Amount Received', 'Status', 'Date Received', 'Is Arrears', 'Payment Mode', 'Remarks'],
      ...data.payments.map(p => [
        p.id,
        p.flat_id,
        p.flat_number,
        p.owner_name,
        p.month,
        p.amount_expected ?? p.amount_received,
        p.amount_received,
        p.status || (p.amount_received > 0 ? 'paid' : 'not_paid'),
        p.date_received || '',
        p.is_arrears ? 'TRUE' : 'FALSE',
        p.payment_mode || 'UPI',
        p.remarks || ''
      ])
    ];

    // Prepare Expenses rows
    const expensesRows = [
      ['ID', 'Date', 'Category', 'Description', 'Amount', 'Vendor', 'Payment Mode', 'Notes'],
      ...data.expenses.map(e => [
        e.id,
        e.date,
        e.category,
        e.description,
        e.amount,
        e.vendor || '',
        e.payment_mode || 'Cash',
        e.notes || ''
      ])
    ];

    // Prepare Settings rows
    const settingsEntries = Object.entries(data.settings);
    const settingsRows = [
      ['Key', 'Value'],
      ...settingsEntries.map(([k, v]) => [k, String(v)])
    ];

    // Clear and write all sheets
    const updates = [
      { range: 'Flats!A1:E1000', values: flatsRows },
      { range: 'Payments!A1:L2000', values: paymentsRows },
      { range: 'Expenses!A1:H2000', values: expensesRows },
      { range: 'Settings!A1:B100', values: settingsRows },
    ];

    // Clear old data first
    for (const sheetName of ['Flats', 'Payments', 'Expenses', 'Settings']) {
      await fetch(`${SHEETS_API_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(sheetName + '!A1:Z3000')}:clear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    // Write updated values
    for (const update of updates) {
      await fetch(`${SHEETS_API_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(update.range)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: update.values }),
      });
    }

    return {
      success: true,
      message: 'Successfully synced all data to Google Sheets!',
      flatsCount: data.flats.length,
      paymentsCount: data.payments.length,
      expensesCount: data.expenses.length,
      updatedAt: new Date().toISOString(),
    };
  }

  // PULL data from Google Sheets
  async pullDataFromSheet(): Promise<{
    flats: Flat[];
    payments: Payment[];
    expenses: Expense[];
    settings: Record<string, string>;
  }> {
    if (!this.accessToken) {
      throw new Error('Google Drive/Sheets access token required. Please sign in.');
    }

    await this.initializeSheetsStructure();

    const fetchSheetValues = async (range: string) => {
      const res = await fetch(`${SHEETS_API_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.values || [];
    };

    const flatsValues = await fetchSheetValues('Flats!A1:E1000');
    const paymentsValues = await fetchSheetValues('Payments!A1:L2000');
    const expensesValues = await fetchSheetValues('Expenses!A1:H2000');
    const settingsValues = await fetchSheetValues('Settings!A1:B100');

    // Parse Flats
    const flats: Flat[] = [];
    if (flatsValues.length > 1) {
      for (let i = 1; i < flatsValues.length; i++) {
        const row = flatsValues[i];
        if (row[0] || row[1]) {
          flats.push({
            id: Number(row[0]) || i,
            flat_number: String(row[1] || '').trim(),
            owner_name: String(row[2] || '').trim(),
            maintenance_amount: Number(row[3]) || 2000,
            notes: String(row[4] || '').trim(),
          });
        }
      }
    }

    // Parse Payments
    const payments: Payment[] = [];
    if (paymentsValues.length > 1) {
      for (let i = 1; i < paymentsValues.length; i++) {
        const row = paymentsValues[i];
        if (row[0] || row[1] || row[4]) {
          const amtReceived = Number(row[6]) || 0;
          const statusVal = String(row[7] || '').toLowerCase().trim();
          let status: any = 'paid';
          if (statusVal === 'not_paid' || statusVal === 'not paid' || statusVal === 'unpaid' || amtReceived === 0) {
            status = 'not_paid';
          } else if (statusVal === 'partial' || (Number(row[5]) > 0 && amtReceived < Number(row[5]))) {
            status = 'partial';
          }

          payments.push({
            id: Number(row[0]) || i,
            flat_id: Number(row[1]) || 0,
            flat_number: String(row[2] || '').trim(),
            owner_name: String(row[3] || '').trim(),
            month: String(row[4] || '').trim(),
            amount_expected: Number(row[5]) || 2000,
            amount_received: amtReceived,
            status: status,
            date_received: String(row[8] || '').trim(),
            is_arrears: String(row[9]).toLowerCase() === 'true' || String(row[9]) === '1',
            payment_mode: String(row[10] || 'Cash').trim(),
            remarks: String(row[11] || '').trim(),
          });
        }
      }
    }

    // Parse Expenses
    const expenses: Expense[] = [];
    if (expensesValues.length > 1) {
      for (let i = 1; i < expensesValues.length; i++) {
        const row = expensesValues[i];
        if (row[0] || row[1] || row[3]) {
          expenses.push({
            id: Number(row[0]) || i,
            date: String(row[1] || '').trim(),
            category: String(row[2] || 'Miscellaneous').trim(),
            description: String(row[3] || '').trim(),
            amount: Number(row[4]) || 0,
            vendor: String(row[5] || '').trim(),
            payment_mode: String(row[6] || 'Cash').trim(),
            notes: String(row[7] || '').trim(),
          });
        }
      }
    }

    // Parse Settings
    const settings: Record<string, string> = {};
    if (settingsValues.length > 1) {
      for (let i = 1; i < settingsValues.length; i++) {
        const row = settingsValues[i];
        if (row[0]) {
          settings[String(row[0]).trim()] = String(row[1] || '').trim();
        }
      }
    }

    return { flats, payments, expenses, settings };
  }
}
