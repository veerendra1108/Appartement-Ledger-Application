import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyPDF as formatCurrency, formatDate, getMonthDisplay, LedgerSummary, Payment, Expense, PendingReportItem } from './types';

export const generateMonthlyPDF = (
  apartmentName: string,
  monthKey: string,
  summary: LedgerSummary,
  payments: Payment[],
  expenses: Expense[],
  pending: PendingReportItem[]
) => {
  const doc = new jsPDF();
  const monthName = getMonthDisplay(monthKey);

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(apartmentName, 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(`Maintenance Ledger - ${monthName}`, 105, 30, { align: 'center' });

  // Summary Box
  doc.setFontSize(12);
  doc.rect(14, 40, 182, 40);
  doc.text(`Opening Balance: ${formatCurrency(summary.openingBalance)}`, 20, 50);
  doc.text(`Total Collection: ${formatCurrency(summary.receivedCollection)}`, 20, 60);
  doc.text(`Total Expenses: ${formatCurrency(summary.expenses)}`, 110, 50);
  doc.text(`Closing Balance: ${formatCurrency(summary.closingBalance)}`, 110, 60);
  doc.text(`Expected Collection: ${formatCurrency(summary.expectedCollection)}`, 20, 70);
  doc.text(`Pending this month: ${formatCurrency(summary.expectedCollection - summary.receivedCollection)}`, 110, 70);

  // Collections Table
  doc.setFontSize(14);
  doc.text('Collections Received', 14, 90);
  autoTable(doc, {
    startY: 95,
    head: [['Flat', 'Owner', 'Amount', 'Date', 'Mode']],
    body: payments.map(p => [
      p.flat_number,
      p.owner_name,
      formatCurrency(p.amount_received),
      formatDate(p.date_received),
      p.payment_mode
    ]),
  });

  // Expenses Table
  const expenseStartY = ((doc as any).lastAutoTable?.finalY || 95) + 15;
  if (expenseStartY > 270) doc.addPage();
  doc.text('Expenses Paid', 14, expenseStartY > 270 ? 20 : expenseStartY);
  autoTable(doc, {
    startY: (expenseStartY > 270 ? 20 : expenseStartY) + 5,
    head: [['Date', 'Category', 'Description', 'Amount', 'Vendor']],
    body: expenses.length > 0 ? [
      ...expenses.map(e => [
        formatDate(e.date),
        e.category,
        e.description,
        formatCurrency(e.amount),
        e.vendor || '-'
      ]),
      [{ content: 'Total Monthly Expenses', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(summary.expenses), styles: { fontStyle: 'bold' } }, '']
    ] : [['-', 'No expenses recorded', '-', '-', '-']],
  });

  // Pending List
  const pendingStartY = ((doc as any).lastAutoTable?.finalY || (expenseStartY + 20)) + 15;
  if (pendingStartY > 250) doc.addPage();
  doc.text('Pending Dues', 14, pendingStartY > 250 ? 20 : pendingStartY);
  autoTable(doc, {
    startY: (pendingStartY > 250 ? 20 : pendingStartY) + 5,
    head: [['Flat', 'Owner', 'Pending Months', 'Total Pending']],
    body: pending.map(p => [
      p.flat_number,
      p.owner_name,
      p.pendingMonths.length,
      formatCurrency(p.totalPendingAmount)
    ]),
  });

  // Footer
  const footerY = (doc as any).lastAutoTable.finalY + 30;
  if (footerY > 270) doc.addPage();
  const finalY = footerY > 270 ? 40 : footerY;
  doc.line(14, finalY, 60, finalY);
  doc.text('Treasurer Signature', 14, finalY + 5);
  doc.line(140, finalY, 186, finalY);
  doc.text('Manager Signature', 140, finalY + 5);

  doc.save(`Ledger_${monthKey}.pdf`);
};

export const generateRangePDF = (
  apartmentName: string,
  title: string,
  monthlyData: { month: string; received: number; spent: number; opening: number; closing: number; expenses: Expense[] }[]
) => {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.text(apartmentName, 105, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.text(title, 105, 30, { align: 'center' });

  // Summary Table
  autoTable(doc, {
    startY: 45,
    head: [['Month', 'Received', 'Spent', 'Closing Balance']],
    body: monthlyData.map(d => [
      getMonthDisplay(d.month),
      formatCurrency(d.received),
      formatCurrency(d.spent),
      formatCurrency(d.closing)
    ]),
  });

  const totalReceived = monthlyData.reduce((sum, d) => sum + d.received, 0);
  const totalSpent = monthlyData.reduce((sum, d) => sum + d.spent, 0);

  const summaryY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Yearly Total', 14, summaryY);
  doc.setFontSize(12);
  doc.text(`Total Collections: ${formatCurrency(totalReceived)}`, 14, summaryY + 10);
  doc.text(`Total Expenses: ${formatCurrency(totalSpent)}`, 14, summaryY + 20);
  doc.text(`Net Surplus/Deficit: ${formatCurrency(totalReceived - totalSpent)}`, 14, summaryY + 30);

  // Detailed Expenses Section
  doc.addPage();
  doc.setFontSize(18);
  doc.text('Detailed Annual Expenses', 105, 20, { align: 'center' });
  
  let currentY = 30;

  monthlyData.forEach((month) => {
    if (month.expenses.length === 0) return;

    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.text(getMonthDisplay(month.month), 14, currentY);
    
    doc.setFontSize(10);
    doc.text(`Opening Balance: ${formatCurrency(month.opening)}`, 14, currentY + 7);

    autoTable(doc, {
      startY: currentY + 10,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: [
        ...month.expenses.map(e => [
          formatDate(e.date),
          e.category,
          e.description,
          formatCurrency(e.amount)
        ]),
        [{ content: `Total Monthly Expenses`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(month.spent), styles: { fontStyle: 'bold' } }]
      ],
      margin: { left: 14, right: 14 },
      theme: 'striped',
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Closing Balance: ${formatCurrency(month.closing)}`, 196, tableEndY + 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    currentY = tableEndY + 25;
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};
