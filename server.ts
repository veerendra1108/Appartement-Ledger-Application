import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";

const app = express();
const PORT = 3000;
const START_MONTH = "2025-06";

function getResolvedExcelPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "maintenance_data.xlsx"),
    path.resolve(process.cwd(), "maintenance_data.xls"),
    path.resolve(process.cwd(), "apartment_ledger.xlsx"),
    path.resolve(process.cwd(), "Apartment_Ledger.xlsx"),
    path.resolve(process.cwd(), "maintenance.xlsx")
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const files = fs.readdirSync(process.cwd());
    const xlsx = files.find(f => (f.endsWith(".xlsx") || f.endsWith(".xls")) && !f.startsWith("~$"));
    if (xlsx) return path.resolve(process.cwd(), xlsx);
  } catch (e) {}
  return path.resolve(process.cwd(), "maintenance_data.xlsx");
}

let EXCEL_PATH = getResolvedExcelPath();

app.use(express.json({ limit: "10mb" }));

const DEFAULT_SCHEMAS: Record<string, { header: string; key: string }[]> = {
  Flats: [
    { header: "id", key: "id" },
    { header: "flat_number", key: "flat_number" },
    { header: "owner_name", key: "owner_name" },
    { header: "maintenance_amount", key: "maintenance_amount" },
    { header: "notes", key: "notes" }
  ],
  Payments: [
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
  ],
  Expenses: [
    { header: "id", key: "id" },
    { header: "date", key: "date" },
    { header: "category", key: "category" },
    { header: "description", key: "description" },
    { header: "amount", key: "amount" },
    { header: "vendor", key: "vendor" },
    { header: "payment_mode", key: "payment_mode" },
    { header: "notes", key: "notes" }
  ],
  Settings: [
    { header: "key", key: "key" },
    { header: "value", key: "value" }
  ]
};

// Excel Database Helper
class ExcelDB {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  getFilePath() {
    return EXCEL_PATH;
  }

  findWorksheet(sheetName: string): ExcelJS.Worksheet | null {
    let ws = this.workbook.getWorksheet(sheetName);
    if (ws) return ws;
    const lower = sheetName.toLowerCase();
    for (const worksheet of this.workbook.worksheets) {
      if (worksheet.name.toLowerCase() === lower) {
        return worksheet;
      }
    }
    // Also try singular/plural
    if (lower === "flats") {
      for (const w of this.workbook.worksheets) {
        if (w.name.toLowerCase().includes("flat")) return w;
      }
    }
    if (lower === "payments") {
      for (const w of this.workbook.worksheets) {
        if (w.name.toLowerCase().includes("pay") || w.name.toLowerCase().includes("income") || w.name.toLowerCase().includes("collection")) return w;
      }
    }
    if (lower === "expenses") {
      for (const w of this.workbook.worksheets) {
        if (w.name.toLowerCase().includes("exp")) return w;
      }
    }
    if (lower === "settings") {
      for (const w of this.workbook.worksheets) {
        if (w.name.toLowerCase().includes("set") || w.name.toLowerCase().includes("config")) return w;
      }
    }
    return null;
  }

  async init() {
    EXCEL_PATH = getResolvedExcelPath();
    const fileExists = fs.existsSync(EXCEL_PATH);
    if (fileExists) {
      try {
        await this.workbook.xlsx.readFile(EXCEL_PATH);
        console.log(`Successfully loaded existing Excel file from: ${EXCEL_PATH}`);
      } catch (err) {
        console.error("Error reading Excel file, re-initializing workbook:", err);
      }
    }

    // Ensure all standard sheets exist and have columns defined
    for (const [sheetName, columns] of Object.entries(DEFAULT_SCHEMAS)) {
      let ws = this.findWorksheet(sheetName);
      if (!ws) {
        ws = this.workbook.addWorksheet(sheetName);
        ws.columns = columns as any;
      } else {
        // ExcelJS does not assign ws.columns when loading an existing file.
        // We explicitly define columns so addRow/columns methods work safely.
        ws.columns = columns as any;
      }
    }

    // Check if initial seeding is required
    const flats = this.getSheetData("Flats");
    if (!fileExists || flats.length === 0) {
      if (this.getSheetData("Flats").length === 0) {
        const flatsSheet = this.findWorksheet("Flats")!;
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
      const settingsSheet = this.findWorksheet("Settings")!;
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

    // Run duplicate/orphan payment cleanup
    await this.cleanupOrphansAndDuplicates();
  }

  async cleanupOrphansAndDuplicates() {
    try {
      const flats = this.getSheetData("Flats");
      const validFlatIds = new Set(flats.map(f => String(f.id)));
      const paymentsSheet = this.findWorksheet("Payments");
      if (!paymentsSheet) return;

      const allPayments = this.getSheetData("Payments");
      if (allPayments.length === 0) return;

      const uniqueMap = new Map<string, any>();
      let hasChanges = false;

      for (const p of allPayments) {
        // Drop orphan payments for flats that no longer exist
        if (!validFlatIds.has(String(p.flat_id))) {
          hasChanges = true;
          continue;
        }

        const key = `${p.flat_id}_${p.month}`;
        if (uniqueMap.has(key)) {
          hasChanges = true;
          const prev = uniqueMap.get(key);
          if ((Number(p.amount_received) || 0) >= (Number(prev.amount_received) || 0)) {
            uniqueMap.set(key, p);
          }
        } else {
          uniqueMap.set(key, p);
        }
      }

      if (hasChanges || allPayments.length !== uniqueMap.size) {
        const rowCount = paymentsSheet.rowCount;
        if (rowCount > 1) {
          paymentsSheet.spliceRows(2, rowCount - 1);
        }
        Array.from(uniqueMap.values()).forEach(p => paymentsSheet.addRow(p));
        await this.save();
        console.log(`Cleaned up payments: kept ${uniqueMap.size} valid records, removed duplicates/orphans.`);
      }
    } catch (e) {
      console.error("Error during payment cleanup:", e);
    }
  }

  async deletePaymentsByFlatId(flatId: any) {
    const sheet = this.findWorksheet("Payments");
    if (!sheet) return;
    let modified = false;
    for (let i = sheet.rowCount; i >= 2; i--) {
      const row = sheet.getRow(i);
      const cellFlatId = row.getCell(2).value;
      if (String(cellFlatId) === String(flatId)) {
        sheet.spliceRows(i, 1);
        modified = true;
      }
    }
    if (modified) await this.save();
  }

  async save() {
    try {
      await this.workbook.xlsx.writeFile(EXCEL_PATH);
    } catch (err: any) {
      if (err.code === "EBUSY") {
        console.error("Cannot write to Excel file because it is open in another program (e.g. MS Excel). Please close it.");
      }
      throw err;
    }
  }

  getSheetData(sheetName: string): any[] {
    const sheet = this.findWorksheet(sheetName);
    if (!sheet) return [];

    const schema = DEFAULT_SCHEMAS[sheetName] || [];
    const headerMap: { colIndex: number; key: string }[] = [];
    const headerRow = sheet.getRow(1);

    if (headerRow && headerRow.cellCount > 0) {
      headerRow.eachCell((cell, colNumber) => {
        const raw = String(cell.value || "").trim();
        if (!raw) return;
        const norm = raw.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        let matchedKey = schema.find(s => s.key === norm || s.header.toLowerCase() === norm)?.key;

        if (!matchedKey) {
          if (norm.includes("flat") && (norm.includes("no") || norm.includes("num"))) matchedKey = "flat_number";
          else if (norm.includes("owner") || norm.includes("name")) matchedKey = "owner_name";
          else if (norm.includes("maint") || norm.includes("expected")) matchedKey = (sheetName === "Flats" ? "maintenance_amount" : "amount_expected");
          else if (norm.includes("received") || norm.includes("paid")) matchedKey = "amount_received";
          else if (norm.includes("mode") || norm.includes("type")) matchedKey = "payment_mode";
          else if (norm.includes("date")) matchedKey = (sheetName === "Payments" ? "date_received" : "date");
          else if (norm.includes("desc")) matchedKey = "description";
          else if (norm.includes("cat")) matchedKey = "category";
          else if (norm.includes("vendor")) matchedKey = "vendor";
          else if (norm.includes("rem") || norm.includes("note")) matchedKey = (sheetName === "Payments" ? "remarks" : "notes");
          else matchedKey = norm;
        }

        headerMap.push({ colIndex: colNumber, key: matchedKey });
      });
    }

    // If headers were not detected in row 1, map by schema order
    if (headerMap.length === 0 && schema.length > 0) {
      schema.forEach((s, idx) => {
        headerMap.push({ colIndex: idx + 1, key: s.key });
      });
    }

    const data: any[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const obj: any = {};
      let hasData = false;

      for (const h of headerMap) {
        const cell = row.getCell(h.colIndex);
        let val = cell.value;
        if (val && typeof val === "object") {
          if ("result" in val) val = (val as any).result;
          else if ("text" in val) val = (val as any).text;
          else if ("richText" in val) val = (val as any).richText.map((t: any) => t.text).join("");
        }
        if (val !== undefined && val !== null && val !== "") {
          hasData = true;
        }
        obj[h.key] = val !== undefined && val !== null ? val : "";
      }

      if (hasData) {
        if (obj.id !== undefined && obj.id !== "") obj.id = Number(obj.id) || obj.id;
        if (obj.flat_id !== undefined && obj.flat_id !== "") obj.flat_id = Number(obj.flat_id) || obj.flat_id;
        if (obj.maintenance_amount !== undefined) obj.maintenance_amount = Number(obj.maintenance_amount) || 0;
        if (obj.amount_expected !== undefined) obj.amount_expected = Number(obj.amount_expected) || 0;
        if (obj.amount_received !== undefined) obj.amount_received = Number(obj.amount_received) || 0;
        if (obj.amount !== undefined && sheetName === "Expenses") obj.amount = Number(obj.amount) || 0;
        data.push(obj);
      }
    });

    return data;
  }

  async addRow(sheetName: string, data: any, skipSave = false) {
    let sheet = this.findWorksheet(sheetName);
    if (!sheet) {
      sheet = this.workbook.addWorksheet(sheetName);
      sheet.columns = (DEFAULT_SCHEMAS[sheetName] || []) as any;
    }
    const rows = this.getSheetData(sheetName);
    const nextId = rows.length > 0 ? Math.max(...rows.map(r => Number(r.id) || 0)) + 1 : 1;
    if (data.id === undefined) data.id = nextId;
    sheet.addRow(data);
    if (!skipSave) await this.save();
    return data;
  }

  async updateRow(sheetName: string, id: any, data: any, skipSave = false) {
    const sheet = this.findWorksheet(sheetName);
    if (!sheet) return false;
    let found = false;
    const schema = DEFAULT_SCHEMAS[sheetName] || [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (String(row.getCell(1).value) === String(id)) {
        Object.keys(data).forEach(key => {
          const colIndex = schema.findIndex(c => c.key === key);
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
    const sheet = this.findWorksheet(sheetName);
    if (!sheet) return false;
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
    let sheet = this.findWorksheet("Settings");
    if (!sheet) {
      sheet = this.workbook.addWorksheet("Settings");
      sheet.columns = DEFAULT_SCHEMAS.Settings as any;
    }
    let found = false;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (String(row.getCell(1).value) === key) {
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
      const sheet = this.findWorksheet(name);
      if (sheet) {
        const rowCount = sheet.rowCount;
        if (rowCount > 1) {
          sheet.spliceRows(2, rowCount - 1);
        }
      }
    }

    const flatsSheet = this.findWorksheet("Flats")!;
    (payload.flats || []).forEach(f => flatsSheet.addRow(f));

    const paymentsSheet = this.findWorksheet("Payments")!;
    (payload.payments || []).forEach(p => paymentsSheet.addRow(p));

    const expensesSheet = this.findWorksheet("Expenses")!;
    (payload.expenses || []).forEach(e => expensesSheet.addRow(e));

    const settingsSheet = this.findWorksheet("Settings")!;
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
    const flatId = req.params.id;
    const success = await db.deleteRow("Flats", flatId);
    if (success) {
      await db.deletePaymentsByFlatId(flatId);
    }
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
    const validFlatMap = new Map(flats.map(f => [String(f.id), f]));
    
    // Filter out orphans and deduplicate by flat_id + month
    const dedupedMap = new Map<string, any>();
    for (const p of payments) {
      const flat = validFlatMap.get(String(p.flat_id));
      if (!flat) continue; // skip orphan
      
      const key = `${p.flat_id}_${p.month}`;
      if (!dedupedMap.has(key) || (Number(p.amount_received) || 0) >= (Number(dedupedMap.get(key).amount_received) || 0)) {
        const expected = Number(p.amount_expected) || Number(flat.maintenance_amount) || 2000;
        const received = Number(p.amount_received) || 0;
        let status = p.status;
        if (!status) {
          if (received >= expected) status = "paid";
          else if (received === 0) status = "not_paid";
          else status = "partial";
        }
        dedupedMap.set(key, {
          ...p,
          flat_number: flat.flat_number || p.flat_number,
          owner_name: flat.owner_name || p.owner_name,
          amount_expected: expected,
          amount_received: received,
          status: status
        });
      }
    }

    let combined = Array.from(dedupedMap.values());
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

// Clear past arrears by recording collection in the current active month (preserves historical month records intact)
app.post("/api/payments/clear-arrears-in-current-month", async (req, res) => {
  try {
    const { flat_id, due_month, target_collection_month, amount, payment_mode } = req.body;
    const flats = db.getSheetData("Flats");
    const flat = flats.find(f => String(f.id) === String(flat_id));
    if (!flat) return res.status(404).json({ error: "Flat not found" });

    const clearAmount = Number(amount) || Number(flat.maintenance_amount) || 2000;
    const targetMonth = target_collection_month || new Date().toISOString().slice(0, 7);
    const dateReceived = new Date().toISOString().split("T")[0];
    const mode = payment_mode || "UPI";

    const payments = db.getSheetData("Payments");
    const existingTargetPayment = payments.find(p => String(p.flat_id) === String(flat_id) && p.month === targetMonth);

    const baseExpected = Number(flat.maintenance_amount) || 2000;
    let newAmountReceived = clearAmount;
    let existingRemarks = "";

    if (existingTargetPayment) {
      newAmountReceived = (Number(existingTargetPayment.amount_received) || 0) + clearAmount;
      existingRemarks = existingTargetPayment.remarks ? `${existingTargetPayment.remarks}; ` : "";
    }

    const updatedRecord = {
      flat_id: flat.id,
      flat_number: flat.flat_number,
      owner_name: flat.owner_name,
      month: targetMonth,
      amount_expected: existingTargetPayment?.amount_expected || baseExpected,
      amount_received: newAmountReceived,
      status: "paid",
      date_received: existingTargetPayment?.date_received || dateReceived,
      is_arrears: 0,
      payment_mode: mode,
      remarks: `${existingRemarks}Cleared ${due_month} arrears (₹${clearAmount}) in ${targetMonth}`
    };

    if (existingTargetPayment) {
      await db.updateRow("Payments", existingTargetPayment.id, updatedRecord);
    } else {
      await db.addRow("Payments", updatedRecord);
    }

    res.json({
      success: true,
      message: `Recorded ₹${clearAmount} arrears collection in ${targetMonth} for Flat ${flat.flat_number}. Historical record for ${due_month} preserved.`
    });
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
    const targetMonthStr = month || START_MONTH;
    const flats = db.getSheetData("Flats");
    const validFlatIds = new Set(flats.map(f => String(f.id)));
    const allPaymentsRaw = db.getSheetData("Payments");
    const allExpenses = db.getSheetData("Expenses");

    // Deduplicate all payments by flat_id + month, ignoring orphans
    const dedupedPaymentsMap = new Map<string, any>();
    for (const p of allPaymentsRaw) {
      if (!validFlatIds.has(String(p.flat_id))) continue;
      const key = `${p.flat_id}_${p.month}`;
      if (!dedupedPaymentsMap.has(key) || (Number(p.amount_received) || 0) >= (Number(dedupedPaymentsMap.get(key).amount_received) || 0)) {
        dedupedPaymentsMap.set(key, p);
      }
    }
    const allPayments = Array.from(dedupedPaymentsMap.values());

    const currentMonthPayments = allPayments.filter(p => p.month === targetMonthStr);
    const currentMonthExpenses = allExpenses.filter(e => String(e.date).startsWith(targetMonthStr));

    const totalReceivedThisMonth = currentMonthPayments.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);
    const totalSpentThisMonth = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expectedCollection = flats.reduce((sum, f) => sum + (Number(f.maintenance_amount) || 2000), 0);

    // Opening balance strictly before targetMonthStr-01
    const currentMonthDate = new Date(targetMonthStr + "-01");
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

    const closingBalance = openingBalance + totalReceivedThisMonth - totalSpentThisMonth;

    // Timeline months from START_MONTH to targetMonthStr
    const startYear = parseInt(START_MONTH.split("-")[0]);
    const startMo = parseInt(START_MONTH.split("-")[1]) - 1;
    const targetYear = parseInt(targetMonthStr.split("-")[0]);
    const targetMo = parseInt(targetMonthStr.split("-")[1]) - 1;

    const allMonths: string[] = [];
    let cur = new Date(startYear, startMo, 1);
    const target = new Date(targetYear, targetMo, 1);
    while (cur <= target) {
      allMonths.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
      cur.setMonth(cur.getMonth() + 1);
    }

    // Cumulative arrears calculated per flat
    let totalCumulativeArrears = 0;
    let unpaidArrearsThisMonth = 0;

    flats.forEach(flat => {
      const flatPayments = allPayments.filter(p => String(p.flat_id) === String(flat.id));
      const expectedMaint = Number(flat.maintenance_amount) || 2000;
      
      let flatTotalExpected = 0;
      let flatTotalReceived = 0;

      allMonths.forEach(m => {
        const p = flatPayments.find(p => p.month === m);
        flatTotalExpected += Number(p?.amount_expected) || expectedMaint;
        flatTotalReceived += Number(p?.amount_received) || 0;
      });

      const netFlatDue = Math.max(0, flatTotalExpected - flatTotalReceived);
      totalCumulativeArrears += netFlatDue;

      // Current month flat status
      const currentMonthPayment = flatPayments.find(p => p.month === targetMonthStr);
      const curExpected = Number(currentMonthPayment?.amount_expected) || expectedMaint;
      const curReceived = Number(currentMonthPayment?.amount_received) || 0;
      if (curReceived < curExpected && netFlatDue > 0) {
        unpaidArrearsThisMonth += Math.min(curExpected - curReceived, netFlatDue);
      }
    });

    // Breakdown of received
    let regularReceived = 0;
    let arrearsReceived = 0;
    currentMonthPayments.forEach(p => {
      const exp = Number(p.amount_expected) || 2000;
      const rec = Number(p.amount_received) || 0;
      regularReceived += Math.min(rec, exp);
      if (rec > exp) {
        arrearsReceived += (rec - exp);
      }
    });

    res.json({
      openingBalance,
      receivedCollection: totalReceivedThisMonth,
      regularReceived,
      arrearsReceived,
      expenses: totalSpentThisMonth,
      closingBalance,
      expectedCollection,
      unpaidArrearsThisMonth,
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
    const { month } = req.query as { month?: string };
    const flats = db.getSheetData("Flats");
    const validFlatIds = new Set(flats.map(f => String(f.id)));
    const allPaymentsRaw = db.getSheetData("Payments");
    
    // Deduplicate and filter orphans
    const dedupedPaymentsMap = new Map<string, any>();
    for (const p of allPaymentsRaw) {
      if (!validFlatIds.has(String(p.flat_id))) continue;
      const key = `${p.flat_id}_${p.month}`;
      if (!dedupedPaymentsMap.has(key) || (Number(p.amount_received) || 0) >= (Number(dedupedPaymentsMap.get(key).amount_received) || 0)) {
        dedupedPaymentsMap.set(key, p);
      }
    }
    const allPayments = Array.from(dedupedPaymentsMap.values());

    // Generate all months from START_MONTH (June 2025) to current or selected month
    const startYear = parseInt(START_MONTH.split("-")[0]);
    const startMo = parseInt(START_MONTH.split("-")[1]) - 1;
    
    const targetMonthStr = month || new Date().toISOString().slice(0, 7);
    const targetYear = parseInt(targetMonthStr.split("-")[0]);
    const targetMo = parseInt(targetMonthStr.split("-")[1]) - 1;
    
    const allMonths: string[] = [];
    let cur = new Date(startYear, startMo, 1);
    const end = new Date(targetYear, targetMo, 1);

    while (cur <= end) {
      allMonths.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
      cur.setMonth(cur.getMonth() + 1);
    }

    const report = flats.map(flat => {
      const flatPayments = allPayments.filter(p => String(p.flat_id) === String(flat.id));
      const expectedMaint = Number(flat.maintenance_amount) || 2000;
      
      // Total received money up to target month
      let totalReceivedAcrossTimeline = 0;
      for (const m of allMonths) {
        const p = flatPayments.find(p => p.month === m);
        if (p) {
          totalReceivedAcrossTimeline += (Number(p.amount_received) || 0);
        }
      }

      // Chronologically satisfy month expected amounts
      let remainingMoney = totalReceivedAcrossTimeline;
      const pendingMonths: { month: string; amount: number; status: string }[] = [];
      let totalPending = 0;

      for (const m of allMonths) {
        const p = flatPayments.find(p => p.month === m);
        const exp = Number(p?.amount_expected) || expectedMaint;

        if (remainingMoney >= exp) {
          remainingMoney -= exp;
        } else if (remainingMoney > 0) {
          const due = exp - remainingMoney;
          pendingMonths.push({ month: m, amount: due, status: "partial" });
          totalPending += due;
          remainingMoney = 0;
        } else {
          pendingMonths.push({ month: m, amount: exp, status: "not_paid" });
          totalPending += exp;
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
app.get("/api/excel-status", (req, res) => {
  try {
    const filePath = db.getFilePath();
    const exists = fs.existsSync(filePath);
    const flats = db.getSheetData("Flats");
    const payments = db.getSheetData("Payments");
    const expenses = db.getSheetData("Expenses");
    res.json({
      filePath: path.basename(filePath),
      fullPath: filePath,
      exists,
      stats: {
        flatsCount: flats.length,
        paymentsCount: payments.length,
        expensesCount: expenses.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/excel-reload", async (req, res) => {
  try {
    await db.init();
    const flats = db.getSheetData("Flats");
    res.json({
      success: true,
      message: `Reloaded ${db.getFilePath()}`,
      flatsCount: flats.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
