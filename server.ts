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

app.use(express.json());

// Excel Database Helper
class ExcelDB {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  async init() {
    if (fs.existsSync(EXCEL_PATH)) {
      await this.workbook.xlsx.readFile(EXCEL_PATH);
    } else {
      // Create initial structure
      this.workbook.addWorksheet("Flats", { columns: [
        { header: "id", key: "id" },
        { header: "flat_number", key: "flat_number" },
        { header: "owner_name", key: "owner_name" },
        { header: "maintenance_amount", key: "maintenance_amount" },
        { header: "notes", key: "notes" }
      ]});
      this.workbook.addWorksheet("Payments", { columns: [
        { header: "id", key: "id" },
        { header: "flat_id", key: "flat_id" },
        { header: "month", key: "month" },
        { header: "amount_received", key: "amount_received" },
        { header: "date_received", key: "date_received" },
        { header: "is_arrears", key: "is_arrears" },
        { header: "payment_mode", key: "payment_mode" },
        { header: "remarks", key: "remarks" }
      ]});
      this.workbook.addWorksheet("Expenses", { columns: [
        { header: "id", key: "id" },
        { header: "date", key: "date" },
        { header: "category", key: "category" },
        { header: "description", key: "description" },
        { header: "amount", key: "amount" },
        { header: "vendor", key: "vendor" },
        { header: "payment_mode", key: "payment_mode" },
        { header: "notes", key: "notes" }
      ]});
      this.workbook.addWorksheet("Settings", { columns: [
        { header: "key", key: "key" },
        { header: "value", key: "value" }
      ]});
      
      // Default settings
      const settingsSheet = this.workbook.getWorksheet("Settings")!;
      settingsSheet.addRow({ key: "apartment_name", value: "Sri Sai Residency" });
      
      // Try to migrate from SQLite if it exists
      if (fs.existsSync(DB_PATH)) {
        console.log("Migrating data from SQLite to Excel...");
        try {
          const sqliteDb = new Database(DB_PATH);
          
          const flats = sqliteDb.prepare("SELECT * FROM flats").all() as any[];
          const flatsSheet = this.workbook.getWorksheet("Flats")!;
          flats.forEach(f => flatsSheet.addRow(f));

          const payments = sqliteDb.prepare("SELECT * FROM payments").all() as any[];
          const paymentsSheet = this.workbook.getWorksheet("Payments")!;
          payments.forEach(p => paymentsSheet.addRow(p));

          const expenses = sqliteDb.prepare("SELECT * FROM expenses").all() as any[];
          const expensesSheet = this.workbook.getWorksheet("Expenses")!;
          expenses.forEach(e => expensesSheet.addRow(e));

          const settings = sqliteDb.prepare("SELECT * FROM settings").all() as any[];
          const settingsSheet = this.workbook.getWorksheet("Settings")!;
          settings.forEach(s => {
            if (s.key !== "apartment_name") {
              settingsSheet.addRow(s);
            } else {
              const row = settingsSheet.getRow(2);
              row.getCell(2).value = s.value;
            }
          });
          
          sqliteDb.close();
        } catch (err) {
          console.error("Migration failed:", err);
        }
      }

      await this.save();
    }
  }

  async save() {
    await this.workbook.xlsx.writeFile(EXCEL_PATH);
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
        obj[col.key!] = (val && typeof val === 'object' && 'result' in val) ? (val as any).result : val;
      });
      data.push(obj);
    });
    return data;
  }

  async addRow(sheetName: string, data: any) {
    const sheet = this.workbook.getWorksheet(sheetName)!;
    const rows = this.getSheetData(sheetName);
    const nextId = rows.length > 0 ? Math.max(...rows.map(r => Number(r.id) || 0)) + 1 : 1;
    if (data.id === undefined) data.id = nextId;
    sheet.addRow(data);
    await this.save();
    return data;
  }

  async updateRow(sheetName: string, id: any, data: any) {
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
    if (found) await this.save();
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
}

const db = new ExcelDB();

// API Routes
app.get("/api/settings", async (req, res) => {
  const settings = db.getSheetData("Settings");
  const config: Record<string, string> = {};
  settings.forEach(s => config[s.key] = s.value);
  res.json(config);
});

app.post("/api/settings", async (req, res) => {
  const { apartment_name } = req.body;
  await db.upsertSetting("apartment_name", apartment_name);
  res.json({ success: true });
});

app.get("/api/flats", (req, res) => {
  const flats = db.getSheetData("Flats").sort((a, b) => String(a.flat_number).localeCompare(String(b.flat_number)));
  res.json(flats);
});

app.post("/api/flats", async (req, res) => {
  const data = req.body;
  const result = await db.addRow("Flats", data);
  res.json(result);
});

app.put("/api/flats/:id", async (req, res) => {
  const success = await db.updateRow("Flats", req.params.id, req.body);
  res.json({ success });
});

app.delete("/api/flats/:id", async (req, res) => {
  const success = await db.deleteRow("Flats", req.params.id);
  res.json({ success });
});

app.get("/api/payments", (req, res) => {
  const { month } = req.query;
  const payments = db.getSheetData("Payments");
  const flats = db.getSheetData("Flats");
  
  let filtered = payments.map(p => {
    const flat = flats.find(f => String(f.id) === String(p.flat_id));
    return { ...p, flat_number: flat?.flat_number, owner_name: flat?.owner_name };
  });

  if (month) {
    filtered = filtered.filter(p => p.month === month);
  }
  
  res.json(filtered.sort((a, b) => String(a.flat_number).localeCompare(String(b.flat_number))));
});

app.post("/api/payments", async (req, res) => {
  const data = req.body;
  const payments = db.getSheetData("Payments");
  const existing = payments.find(p => String(p.flat_id) === String(data.flat_id) && p.month === data.month);
  
  if (existing) {
    await db.updateRow("Payments", existing.id, data);
    res.json({ id: existing.id });
  } else {
    const result = await db.addRow("Payments", data);
    res.json({ id: result.id });
  }
});

app.delete("/api/payments/:id", async (req, res) => {
  const success = await db.deleteRow("Payments", req.params.id);
  res.json({ success });
});

app.get("/api/expenses", (req, res) => {
  const { month } = req.query;
  const expenses = db.getSheetData("Expenses");
  let filtered = expenses;
  if (month) {
    filtered = expenses.filter(e => String(e.date).startsWith(String(month)));
  }
  res.json(filtered.sort((a, b) => String(b.date).localeCompare(String(a.date))));
});

app.post("/api/expenses", async (req, res) => {
  const result = await db.addRow("Expenses", req.body);
  res.json(result);
});

app.delete("/api/expenses/:id", async (req, res) => {
  const success = await db.deleteRow("Expenses", req.params.id);
  res.json({ success });
});

app.get("/api/ledger-summary", (req, res) => {
  const { month } = req.query as { month: string };
  const flats = db.getSheetData("Flats");
  const allPayments = db.getSheetData("Payments");
  const allExpenses = db.getSheetData("Expenses");

  const calculateForMonth = (m: string) => {
    const monthPayments = allPayments.filter(p => p.month === m);
    const monthExpenses = allExpenses.filter(e => String(e.date).startsWith(m));
    
    const received = monthPayments.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);
    const spent = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expected = flats.reduce((sum, f) => sum + (Number(f.maintenance_amount) || 0), 0);
    
    return { received, spent, expected };
  };

  const currentMonthDate = new Date(month + "-01");
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

  const current = calculateForMonth(month);
  const closingBalance = openingBalance + current.received - current.spent;

  res.json({
    openingBalance,
    receivedCollection: current.received,
    expenses: current.spent,
    closingBalance,
    expectedCollection: current.expected
  });
});

app.post("/api/bulk-update-maintenance", async (req, res) => {
  const { startMonth, endMonth, maintenanceAmount, watchmanSalary } = req.body;
  const start = new Date(startMonth + "-01");
  const end = new Date(endMonth + "-01");
  const flats = db.getSheetData("Flats");

  let current = new Date(start);
  while (current <= end) {
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    const dateStr = `${monthKey}-01`;

    const expenses = db.getSheetData("Expenses");
    const existingSalary = expenses.find(e => String(e.date).startsWith(monthKey) && e.description === "Watchman Salary");
    if (existingSalary) {
      await db.updateRow("Expenses", existingSalary.id, { amount: watchmanSalary });
    } else {
      await db.addRow("Expenses", { date: dateStr, category: "Salary", description: "Watchman Salary", amount: watchmanSalary, vendor: "Watchman", payment_mode: "Cash" });
    }

    for (const f of flats) {
      const payments = db.getSheetData("Payments");
      const existing = payments.find(p => String(p.flat_id) === String(f.id) && p.month === monthKey);
      const payData = { flat_id: f.id, month: monthKey, amount_received: maintenanceAmount, date_received: dateStr, is_arrears: 0, payment_mode: "Cash" };
      if (existing) {
        await db.updateRow("Payments", existing.id, payData);
      } else {
        await db.addRow("Payments", payData);
      }
    }

    current.setMonth(current.getMonth() + 1);
  }

  res.json({ success: true });
});

app.get("/api/pending-report", (req, res) => {
  const flats = db.getSheetData("Flats");
  const allPayments = db.getSheetData("Payments");
  
  const today = new Date();
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const report = flats.map(flat => {
    const flatPayments = allPayments.filter(p => String(p.flat_id) === String(flat.id));
    const pendingMonths = months.filter(m => {
      const paid = flatPayments.some(p => p.month === m);
      return !paid;
    });
    
    return {
      ...flat,
      pendingMonths,
      totalPendingAmount: pendingMonths.length * (Number(flat.maintenance_amount) || 0)
    };
  }).filter(r => r.totalPendingAmount > 0);

  res.json(report);
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
