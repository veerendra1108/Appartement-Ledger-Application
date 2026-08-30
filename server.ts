import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import Database from "better-sqlite3";

const app = express();
const PORT = 3000;
const EXCEL_PATH = "maintenance_data.xlsx";
const DB_PATH = "maintenance.db";
const START_MONTH = "2025-06";

app.use(express.json({ limit: "10mb" }));

// Excel Database Helper
class ExcelDB {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  async init() {
    const fileExists = fs.existsSync(EXCEL_PATH);
    if (fileExists) {
      try {
        await this.workbook.xlsx.readFile(EXCEL_PATH);
      } catch (err) {
        console.error("Error reading Excel file, might be corrupted or empty. Re-initializing...");
      }
    }

    const sheets = [
      { name: "Flats", columns: [
        { header: "id", key: "id" },
        { header: "flat_number", key: "flat_number" },
        { header: "owner_name", key: "owner_name" },
        { header: "maintenance_amount", key: "maintenance_amount" },
        { header: "notes", key: "notes" }
      ]},
      { name: "Payments", columns: [
        { header: "id", key: "id" },
        { header: "flat_id", key: "flat_id" },
        { header: "flat_number", key: "flat_number" },
        { header: "owner_name", key: "owner_name" },
        { header: "month", key: "month" },
        { header: "amount_expected", key: "amount_expected" },
        { header: "amount_received", key: "amount_received" },
        { header: "status", key: "status" },
        { header: "date_received", key: "date_received" },
        { header: "is_arrears", key: "is_arrears" },
        { header: "payment_mode", key: "payment_mode" },
        { header: "remarks", key: "remarks" }
      ]},
      { name: "Expenses", columns: [
        { header: "id", key: "id" },
        { header: "date", key: "date" },
        { header: "category", key: "category" },
        { header: "description", key: "description" },
        { header: "amount", key: "amount" },
        { header: "vendor", key: "vendor" },
        { header: "payment_mode", key: "payment_mode" },
        { header: "notes", key: "notes" }
      ]},
      { name: "Settings", columns: [
        { header: "key", key: "key" },
        { header: "value", key: "value" }
      ]}
    ];

    let sheetsCreated = false;
    for (const s of sheets) {
      if (!this.workbook.getWorksheet(s.name)) {
        const ws = this.workbook.addWorksheet(s.name);
        ws.columns = s.columns as any;
        sheetsCreated = true;
      }
    }

    // Check if initial seeding or migration is required
    const flats = this.getSheetData("Flats");
    if (!fileExists || flats.length === 0) {
      if (fs.existsSync(DB_PATH)) {
        console.log("Migrating data from SQLite to Excel...");
        try {
          const sqliteDb = new Database(DB_PATH);
          
          const dbFlats = sqliteDb.prepare("SELECT * FROM flats").all() as any[];
          const flatsSheet = this.workbook.getWorksheet("Flats")!;
          dbFlats.forEach(f => {
            flatsSheet.addRow({
              ...f,
              maintenance_amount: f.maintenance_amount || 2000
            });
          });

          const dbPayments = sqliteDb.prepare("SELECT * FROM payments").all() as any[];
          const paymentsSheet = this.workbook.getWorksheet("Payments")!;
          dbPayments.forEach(p => {
            const flat = dbFlats.find(f => f.id === p.flat_id);
            paymentsSheet.addRow({
              ...p,
              flat_number: flat?.flat_number || '',
              owner_name: flat?.owner_name || '',
              amount_expected: flat?.maintenance_amount || 2000,
              status: (p.amount_received > 0 ? 'paid' : 'not_paid')
            });
          });

          const dbExpenses = sqliteDb.prepare("SELECT * FROM expenses").all() as any[];
          const expensesSheet = this.workbook.getWorksheet("Expenses")!;
          dbExpenses.forEach(e => expensesSheet.addRow(e));

          const dbSettings = sqliteDb.prepare("SELECT * FROM settings").all() as any[];
          const settingsSheet = this.workbook.getWorksheet("Settings")!;
          dbSettings.forEach(s => settingsSheet.addRow(s));
          
          sqliteDb.close();
        } catch (err) {
          console.error("Migration failed, adding default records:", err);
        }
      }

      // If still empty, seed default flats (e.g. 101-105, 201-205, etc.) with ₹2000 default maintenance
      if (this.getSheetData("Flats").length === 0) {
        const flatsSheet = this.workbook.getWorksheet("Flats")!;
        const defaultFlats = [
          { id: 1, flat_number: "101", owner_name: "Ramesh Kumar", maintenance_amount: 2000, notes: "First Floor" },
          { id: 2, flat_number: "102", owner_name: "Suresh Sharma", maintenance_amount: 2000, notes: "First Floor" },
          { id: 3, flat_number: "201", owner_name: "Anita Rao", maintenance_amount: 2000, notes: "Second Floor" },
          { id: 4, flat_number: "202", owner_name: "Venkatesh P", maintenance_amount: 2000, notes: "Second Floor" },
          { id: 5, flat_number: "301", owner_name: "Kiran Reddy", maintenance_amount: 2000, notes: "Third Floor" },
          { id: 6, flat_number: "302", owner_name: "Sunil Verma", maintenance_amount: 2000, notes: "Third Floor" },
          { id: 7, flat_number: "401", owner_name: "Naveen Babu", maintenance_amount: 2000, notes: "Fourth Floor" },
          { id: 8, flat_number: "402", owner_name: "Lakshmi Narayana", maintenance_amount: 2000, notes: "Fourth Floor" },
        ];
        defaultFlats.forEach(f => flatsSheet.addRow(f));
      }

      // Ensure default settings
      const settingsSheet = this.workbook.getWorksheet("Settings")!;
      const currentSettings = this.getSheetData("Settings");
      const defaults = [
        { key: "apartment_name", value: "Sri Sai Residency" },
        { key: "start_month", value: "2025-06" },
        { key: "default_maintenance", value: "2000" },
        { key: "default_watchman_salary", value: "9000" },
        { key: "default_dustbin_amount", value: "500" },
        { key: "google_sheet_id", value: "1bE88sNbxCvKH-fNOh2-75SWBo4lkoSuL7T_G9s5Si_U" }
      ];

      defaults.forEach(d => {
        if (!currentSettings.some(s => s.key === d.key)) {
          settingsSheet.addRow(d);
        }
      });

      await this.save();
    }
  }

  async save() {
    try {
      await this.workbook.xlsx.writeFile(EXCEL_PATH);
    } catch (err: any) {
      if (err.code === "EBUSY") {
        console.error("Cannot write to Excel file because it is open in another program.");
      }
      throw err;
    }
  }

  getSheetData(sheetName: string) {
    const sheet = this.workbook.getWorksheet(sheetName);
    if (!sheet) return [];
    const data: any[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const obj: any = {};
      sheet.columns.forEach((col, i) => {
        const val = row.getCell(i + 1).value;
        obj[col.key!] = (val && typeof val === "object" && "result" in val) ? (val as any).result : val;
      });
      data.push(obj);
    });
    return data;
  }

  async addRow(sheetName: string, data: any, skipSave = false) {
    const sheet = this.workbook.getWorksheet(sheetName)!;
    const rows = this.getSheetData(sheetName);
    const nextId = rows.length > 0 ? Math.max(...rows.map(r => Number(r.id) || 0)) + 1 : 1;
    if (data.id === undefined) data.id = nextId;
    sheet.addRow(data);
    if (!skipSave) await this.save();
    return data;
  }

  async updateRow(sheetName: string, id: any, data: any, skipSave = false) {
    const sheet = this.workbook.getWorksheet(sheetName)!;
    let found = false;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (String(row.getCell(1).value) === String(id)) {
        Object.keys(data).forEach(key => {
          const colIndex = sheet.columns.findIndex(c => c.key === key);
          if (colIndex !== -1) {
            row.getCell(colIndex + 1).value = data[key];
          }
        });
        found = true;
      }
    });
    if (found && !skipSave) await this.save();
    return found;
  }

  async deleteRow(sheetName: string, id: any) {
    const sheet = this.workbook.getWorksheet(sheetName)!;
    let rowIndexToDelete = -1;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (String(row.getCell(1).value) === String(id)) {
        rowIndexToDelete = rowNumber;
      }
    });
    if (rowIndexToDelete !== -1) {
      sheet.spliceRows(rowIndexToDelete, 1);
      await this.save();
      return true;
    }
    return false;
  }

  async upsertSetting(key: string, value: string) {
    const sheet = this.workbook.getWorksheet("Settings")!;
    let found = false;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (row.getCell(1).value === key) {
        row.getCell(2).value = value;
        found = true;
      }
    });
    if (!found) {
      sheet.addRow({ key, value });
    }
    await this.save();
  }

  async replaceAllData(payload: { flats: any[]; payments: any[]; expenses: any[]; settings: any[] }) {
    for (const name of ["Flats", "Payments", "Expenses", "Settings"]) {
      const sheet = this.workbook.getWorksheet(name);
      if (sheet) {
        const rowCount = sheet.rowCount;
        if (rowCount > 1) {
          sheet.spliceRows(2, rowCount - 1);
        }
      }
    }

    const flatsSheet = this.workbook.getWorksheet("Flats")!;
    (payload.flats || []).forEach(f => flatsSheet.addRow(f));

    const paymentsSheet = this.workbook.getWorksheet("Payments")!;
    (payload.payments || []).forEach(p => paymentsSheet.addRow(p));

    const expensesSheet = this.workbook.getWorksheet("Expenses")!;
    (payload.expenses || []).forEach(e => expensesSheet.addRow(e));

    const settingsSheet = this.workbook.getWorksheet("Settings")!;
    (payload.settings || []).forEach(s => settingsSheet.addRow(s));

    await this.save();
  }
}

const db = new ExcelDB();

// API Routes
app.get("/api/settings", async (req, res) => {
  try {
    const settings = db.getSheetData("Settings");
    const config: Record<string, string> = {};
    settings.forEach(s => config[s.key] = s.value);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await db.upsertSetting(key, String(value));
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/flats", (req, res) => {
  try {
    const flats = db.getSheetData("Flats").sort((a, b) => String(a.flat_number).localeCompare(String(b.flat_number)));
    res.json(flats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/flats", async (req, res) => {
  try {
    const data = req.body;
    if (!data.maintenance_amount) data.maintenance_amount = 2000;
    const result = await db.addRow("Flats", data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/flats/:id", async (req, res) => {
  try {
    const success = await db.updateRow("Flats", req.params.id, req.body);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/flats/:id", async (req, res) => {
  try {
    const success = await db.deleteRow("Flats", req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payments", (req, res) => {
  try {
    const { month } = req.query;
    const payments = db.getSheetData("Payments");
    const flats = db.getSheetData("Flats");
    
    let combined = payments.map(p => {
      const flat = flats.find(f => String(f.id) === String(p.flat_id));
      const expected = Number(p.amount_expected) || Number(flat?.maintenance_amount) || 2000;
      const received = Number(p.amount_received) || 0;
      let status = p.status;
      if (!status) {
        if (received >= expected) status = "paid";
        else if (received === 0) status = "not_paid";
        else status = "partial";
      }

      return {
        ...p,
        flat_number: flat?.flat_number || p.flat_number,
        owner_name: flat?.owner_name || p.owner_name,
        amount_expected: expected,
        amount_received: received,
        status: status
      };
    });

    if (month) {
      combined = combined.filter(p => p.month === month);
    }
    
    res.json(combined.sort((a, b) => String(a.flat_number).localeCompare(String(b.flat_number))));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const data = req.body;
    const flats = db.getSheetData("Flats");
    const flat = flats.find(f => String(f.id) === String(data.flat_id));
    if (flat) {
      data.flat_number = flat.flat_number;
      data.owner_name = flat.owner_name;
      if (!data.amount_expected) data.amount_expected = flat.maintenance_amount || 2000;
    }

    const received = Number(data.amount_received) || 0;
    const expected = Number(data.amount_expected) || 2000;

    if (!data.status) {
      if (received >= expected) data.status = "paid";
      else if (received === 0) data.status = "not_paid";
      else data.status = "partial";
    }

    const payments = db.getSheetData("Payments");
    const existing = payments.find(p => String(p.flat_id) === String(data.flat_id) && p.month === data.month);
    
    if (existing) {
      await db.updateRow("Payments", existing.id, data);
      res.json({ id: existing.id });
    } else {
      const result = await db.addRow("Payments", data);
      res.json({ id: result.id });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quick toggle status: mark paid or mark not-paid
app.post("/api/payments/toggle-status", async (req, res) => {
  try {
    const { flat_id, month, status, payment_mode } = req.body;
    const flats = db.getSheetData("Flats");
    const flat = flats.find(f => String(f.id) === String(flat_id));
    if (!flat) return res.status(404).json({ error: "Flat not found" });

    const expected = Number(flat.maintenance_amount) || 2000;
    const amountReceived = status === "paid" ? expected : 0;
    const dateReceived = status === "paid" ? new Date().toISOString().split("T")[0] : "";

    const payments = db.getSheetData("Payments");
    const existing = payments.find(p => String(p.flat_id) === String(flat_id) && p.month === month);

    const record = {
      flat_id: flat.id,
      flat_number: flat.flat_number,
      owner_name: flat.owner_name,
      month: month,
      amount_expected: expected,
      amount_received: amountReceived,
      status: status,
      date_received: dateReceived,
      is_arrears: status === "not_paid" ? 1 : 0,
      payment_mode: status === "paid" ? (payment_mode || "UPI") : "Pending",
      remarks: status === "not_paid" ? "Marked as Not Paid (Arrears)" : "Regular Maintenance"
    };

    if (existing) {
      await db.updateRow("Payments", existing.id, record);
      res.json({ id: existing.id });
    } else {
      const result = await db.addRow("Payments", record);
      res.json({ id: result.id });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/payments/:id", async (req, res) => {
  try {
    const success = await db.deleteRow("Payments", req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/expenses", (req, res) => {
  try {
    const { month } = req.query;
    const expenses = db.getSheetData("Expenses");
    let filtered = expenses;
    if (month) {
      filtered = expenses.filter(e => String(e.date).startsWith(String(month)));
    }
    res.json(filtered.sort((a, b) => String(b.date).localeCompare(String(a.date))));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const result = await db.addRow("Expenses", req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const success = await db.deleteRow("Expenses", req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/ledger-summary", (req, res) => {
  try {
    const { month } = req.query as { month: string };
    const flats = db.getSheetData("Flats");
    const allPayments = db.getSheetData("Payments");
    const allExpenses = db.getSheetData("Expenses");

    const calculateForMonth = (m: string) => {
      const monthPayments = allPayments.filter(p => p.month === m);
      const monthExpenses = allExpenses.filter(e => String(e.date).startsWith(m));
      
      const received = monthPayments.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);
      const spent = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const expected = flats.reduce((sum, f) => sum + (Number(f.maintenance_amount) || 2000), 0);
      const unpaidArrearsThisMonth = Math.max(0, expected - received);
      
      return { received, spent, expected, unpaidArrearsThisMonth };
    };

    const currentMonthDate = new Date((month || START_MONTH) + "-01");
    let openingBalance = 0;
    
    allPayments.forEach(p => {
      if (new Date(p.month + "-01") < currentMonthDate) {
        openingBalance += (Number(p.amount_received) || 0);
      }
    });
    allExpenses.forEach(e => {
      if (new Date(String(e.date)) < currentMonthDate) {
        openingBalance -= (Number(e.amount) || 0);
      }
    });

    const current = calculateForMonth(month || START_MONTH);
    const closingBalance = openingBalance + current.received - current.spent;

    // Cumulative arrears from START_MONTH to current month
    let totalCumulativeArrears = 0;
    const startYear = parseInt(START_MONTH.split("-")[0]);
    const startMo = parseInt(START_MONTH.split("-")[1]) - 1;
    const targetYear = parseInt(month.split("-")[0]);
    const targetMo = parseInt(month.split("-")[1]) - 1;

    let cur = new Date(startYear, startMo, 1);
    const target = new Date(targetYear, targetMo, 1);

    while (cur <= target) {
      const mKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      const mData = calculateForMonth(mKey);
      totalCumulativeArrears += mData.unpaidArrearsThisMonth;
      cur.setMonth(cur.getMonth() + 1);
    }

    res.json({
      openingBalance,
      receivedCollection: current.received,
      expenses: current.spent,
      closingBalance,
      expectedCollection: current.expected,
      unpaidArrearsThisMonth: current.unpaidArrearsThisMonth,
      totalCumulativeArrears
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize month with Watchman Salary (Rs 9000), Dustbin Collection (Rs 500 or custom), and flat payments
app.post("/api/initialize-month", async (req, res) => {
  try {
    const { 
      month, 
      watchmanSalary = 9000, 
      dustbinAmount = 500, 
      defaultPaymentStatus = 'paid', // 'paid' or 'not_paid'
      maintenanceAmount = 2000
    } = req.body;

    const flats = db.getSheetData("Flats");
    const dateStr = `${month}-01`;

    // 1. Add/Update Watchman Salary
    const expenses = db.getSheetData("Expenses");
    const existingSalary = expenses.find(e => String(e.date).startsWith(month) && (e.description?.toLowerCase().includes("watchman") || e.category === "Salary"));
    if (existingSalary) {
      await db.updateRow("Expenses", existingSalary.id, { amount: Number(watchmanSalary) }, true);
    } else {
      await db.addRow("Expenses", {
        date: dateStr,
        category: "Salary",
        description: "Watchman Salary",
        amount: Number(watchmanSalary),
        vendor: "Watchman",
        payment_mode: "Cash",
        notes: "Monthly security salary"
      }, true);
    }

    // 2. Add/Update Dustbin Collection
    const existingDustbin = expenses.find(e => String(e.date).startsWith(month) && (e.description?.toLowerCase().includes("dustbin") || e.category === "Dustbin Collection"));
    if (existingDustbin) {
      await db.updateRow("Expenses", existingDustbin.id, { amount: Number(dustbinAmount) }, true);
    } else {
      await db.addRow("Expenses", {
        date: dateStr,
        category: "Dustbin Collection",
        description: "Monthly Dustbin & Garbage Collection",
        amount: Number(dustbinAmount),
        vendor: "Sanitation Service",
        payment_mode: "Cash",
        notes: "Monthly waste collection fee"
      }, true);
    }

    // 3. Populate flat payments
    const payments = db.getSheetData("Payments");
    for (const f of flats) {
      const flatMaint = Number(f.maintenance_amount) || maintenanceAmount;
      const isPaid = defaultPaymentStatus === 'paid';
      const existing = payments.find(p => String(p.flat_id) === String(f.id) && p.month === month);

      const payData = {
        flat_id: f.id,
        flat_number: f.flat_number,
        owner_name: f.owner_name,
        month: month,
        amount_expected: flatMaint,
        amount_received: isPaid ? flatMaint : 0,
        status: isPaid ? "paid" : "not_paid",
        date_received: isPaid ? dateStr : "",
        is_arrears: isPaid ? 0 : 1,
        payment_mode: isPaid ? "UPI" : "Pending",
        remarks: isPaid ? "Monthly Maintenance" : "Pending Arrears"
      };

      if (existing) {
        await db.updateRow("Payments", existing.id, payData, true);
      } else {
        await db.addRow("Payments", payData, true);
      }
    }

    await db.save();
    res.json({ success: true, message: `Month ${month} initialized with Watchman Salary (₹${watchmanSalary}), Dustbin Collection (₹${dustbinAmount}), and flat records.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update maintenance & expenses across month ranges from June 2025 onwards
app.post("/api/bulk-update-maintenance", async (req, res) => {
  try {
    const { 
      startMonth = "2025-06", 
      endMonth = "2026-12", 
      maintenanceAmount = 2000, 
      watchmanSalary = 9000, 
      dustbinAmount = 500,
      overwriteExistingPayments = false,
      markAsPaid = true
    } = req.body;

    const start = new Date(startMonth + "-01");
    const end = new Date(endMonth + "-01");
    const flats = db.getSheetData("Flats");

    // Update base maintenance on all flats
    for (const f of flats) {
      await db.updateRow("Flats", f.id, { maintenance_amount: maintenanceAmount }, true);
    }

    let current = new Date(start);
    while (current <= end) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      const dateStr = `${monthKey}-01`;

      // Expenses: Watchman Salary
      const expenses = db.getSheetData("Expenses");
      const existingSalary = expenses.find(e => String(e.date).startsWith(monthKey) && (e.description?.toLowerCase().includes("watchman") || e.category === "Salary"));
      if (existingSalary) {
        await db.updateRow("Expenses", existingSalary.id, { amount: watchmanSalary }, true);
      } else {
        await db.addRow("Expenses", { date: dateStr, category: "Salary", description: "Watchman Salary", amount: watchmanSalary, vendor: "Watchman", payment_mode: "Cash", notes: "" }, true);
      }

      // Expenses: Dustbin Collection
      const existingDustbin = expenses.find(e => String(e.date).startsWith(monthKey) && (e.description?.toLowerCase().includes("dustbin") || e.category === "Dustbin Collection"));
      if (existingDustbin) {
        await db.updateRow("Expenses", existingDustbin.id, { amount: dustbinAmount }, true);
      } else {
        await db.addRow("Expenses", { date: dateStr, category: "Dustbin Collection", description: "Monthly Dustbin & Garbage Collection", amount: dustbinAmount, vendor: "Sanitation Service", payment_mode: "Cash", notes: "" }, true);
      }

      // Payments for flats
      const payments = db.getSheetData("Payments");
      for (const f of flats) {
        const existing = payments.find(p => String(p.flat_id) === String(f.id) && p.month === monthKey);
        const payData = {
          flat_id: f.id,
          flat_number: f.flat_number,
          owner_name: f.owner_name,
          month: monthKey,
          amount_expected: maintenanceAmount,
          amount_received: markAsPaid ? maintenanceAmount : 0,
          status: markAsPaid ? "paid" : "not_paid",
          date_received: markAsPaid ? dateStr : "",
          is_arrears: markAsPaid ? 0 : 1,
          payment_mode: markAsPaid ? "UPI" : "Pending",
          remarks: markAsPaid ? "Maintenance Payment" : "Pending Arrears"
        };

        if (existing) {
          if (overwriteExistingPayments || existing.amount_received === undefined) {
            await db.updateRow("Payments", existing.id, payData, true);
          }
        } else {
          await db.addRow("Payments", payData, true);
        }
      }

      current.setMonth(current.getMonth() + 1);
    }

    await db.save();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Comprehensive Pending Arrears Report starting from June 2025
app.get("/api/pending-report", (req, res) => {
  try {
    const flats = db.getSheetData("Flats");
    const allPayments = db.getSheetData("Payments");
    
    // Generate all months from START_MONTH (June 2025) to current or selected month
    const startYear = parseInt(START_MONTH.split("-")[0]);
    const startMo = parseInt(START_MONTH.split("-")[1]) - 1;
    const now = new Date();
    
    const allMonths: string[] = [];
    let cur = new Date(startYear, startMo, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);

    while (cur <= end) {
      allMonths.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
      cur.setMonth(cur.getMonth() + 1);
    }

    const report = flats.map(flat => {
      const flatPayments = allPayments.filter(p => String(p.flat_id) === String(flat.id));
      const expectedMaint = Number(flat.maintenance_amount) || 2000;
      
      const pendingMonths: { month: string; amount: number; status: string }[] = [];
      let totalPending = 0;

      for (const m of allMonths) {
        const payment = flatPayments.find(p => p.month === m);
        if (!payment) {
          pendingMonths.push({ month: m, amount: expectedMaint, status: "not_paid" });
          totalPending += expectedMaint;
        } else {
          const rec = Number(payment.amount_received) || 0;
          const exp = Number(payment.amount_expected) || expectedMaint;
          if (rec < exp || payment.status === "not_paid") {
            const due = Math.max(0, exp - rec);
            pendingMonths.push({ month: m, amount: due, status: payment.status || "not_paid" });
            totalPending += due;
          }
        }
      }
      
      const lastPayment = flatPayments
        .filter(p => Number(p.amount_received) > 0)
        .sort((a, b) => String(b.date_received || b.month).localeCompare(String(a.date_received || a.month)))[0];

      return {
        ...flat,
        pendingMonths,
        totalPendingAmount: totalPending,
        lastPaymentDate: lastPayment?.date_received || lastPayment?.month || 'None'
      };
    }).filter(r => r.totalPendingAmount > 0);

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full database export & import for backup / Google Sheets sync
app.get("/api/export", (req, res) => {
  try {
    const data = {
      flats: db.getSheetData("Flats"),
      payments: db.getSheetData("Payments"),
      expenses: db.getSheetData("Expenses"),
      settings: db.getSheetData("Settings"),
      exportedAt: new Date().toISOString()
    };
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/import", async (req, res) => {
  try {
    const { flats, payments, expenses, settings } = req.body;
    await db.replaceAllData({ flats, payments, expenses, settings });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  await db.init();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
