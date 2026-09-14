import { makeId } from "./utils";

export type ExpenseCategory = "餐飲" | "交通" | "住宿" | "機票" | "門票" | "購物" | "其他";
export type ExpensePaymentMethod = "現金" | "支付寶" | "微信支付" | "美團" | "信用卡" | "其他";
export type ExpenseCurrency = "CNY" | "TWD";

export interface ExpenseRecord {
  id: string;
  date: string;
  title: string;
  amount: number;
  currency: ExpenseCurrency;
  payer: string;
  category: ExpenseCategory;
  paymentMethod?: ExpensePaymentMethod;
  dayNumber?: number;
  note?: string;
  createdAt: string;
}

export type AttachmentCategory = "機票／登機證" | "訂位資訊" | "付款 QR Code" | "其他";

export interface AttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category: AttachmentCategory;
  note?: string;
  createdAt: string;
}

export interface AttachmentInput {
  category: AttachmentCategory;
  note?: string;
}

export interface TravelToolsData {
  expenses: ExpenseRecord[];
  attachments: AttachmentMeta[];
}

interface StoredAttachment extends AttachmentMeta {
  blob: Blob;
}

const EXPENSES_KEY = "shanghai-2026:local-expenses";
const ATTACHMENT_DB_NAME = "shanghai-2026-local-tools";
const ATTACHMENT_STORE_NAME = "attachments";

function readExpenses(): ExpenseRecord[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeExpenseRecord).filter((expense): expense is ExpenseRecord => expense !== undefined);
  } catch {
    return [];
  }
}

export function normalizeExpenseRecord(value: unknown): ExpenseRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<ExpenseRecord> & { amountCny?: unknown; currency?: unknown };
  const isLegacyCny = typeof candidate.amountCny === "number";
  const amount = typeof candidate.amount === "number" ? candidate.amount : isLegacyCny ? candidate.amountCny : undefined;
  const currency = candidate.currency === "CNY" || candidate.currency === "TWD"
    ? candidate.currency
    : isLegacyCny ? "CNY" : undefined;
  if (typeof candidate.id !== "string" ||
    typeof candidate.date !== "string" ||
    typeof candidate.title !== "string" ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (currency !== "CNY" && currency !== "TWD") ||
    typeof candidate.payer !== "string" ||
    typeof candidate.category !== "string") {
    return undefined;
  }

  const paymentMethod = candidate.paymentMethod === "現金" || candidate.paymentMethod === "支付寶" || candidate.paymentMethod === "微信支付" || candidate.paymentMethod === "美團" || candidate.paymentMethod === "信用卡" || candidate.paymentMethod === "其他"
    ? candidate.paymentMethod
    : undefined;
  const dayNumber = typeof candidate.dayNumber === "number" && Number.isInteger(candidate.dayNumber) ? candidate.dayNumber : undefined;
  return {
    id: candidate.id,
    date: candidate.date,
    title: candidate.title,
    amount: Number(amount.toFixed(2)),
    currency,
    payer: candidate.payer,
    category: candidate.category as ExpenseCategory,
    paymentMethod,
    dayNumber,
    note: typeof candidate.note === "string" ? candidate.note : undefined,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString()
  };
}

export function isExpenseRecord(value: unknown): value is ExpenseRecord {
  return normalizeExpenseRecord(value) !== undefined;
}

function writeExpenses(expenses: ExpenseRecord[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

function openAttachmentDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("此瀏覽器不支援本機附件儲存。"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ATTACHMENT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ATTACHMENT_STORE_NAME)) {
        request.result.createObjectStore(ATTACHMENT_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("附件資料庫無法開啟。"));
  });
}

function listStoredAttachments(): Promise<StoredAttachment[]> {
  return openAttachmentDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(ATTACHMENT_STORE_NAME, "readonly");
    const request = transaction.objectStore(ATTACHMENT_STORE_NAME).getAll();
    request.onsuccess = () => {
      database.close();
      resolve((request.result as StoredAttachment[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("附件清單無法讀取。"));
    };
  }));
}

export class LocalTravelToolsRepository {
  async load(): Promise<TravelToolsData> {
    let attachments: AttachmentMeta[] = [];
    try {
      attachments = (await listStoredAttachments()).map(({ blob: _blob, ...metadata }) => metadata);
    } catch {
      // The rest of the local travel tools remain usable when IndexedDB is unavailable.
    }
    return { expenses: readExpenses(), attachments };
  }

  saveExpenses(expenses: ExpenseRecord[]): void {
    writeExpenses(expenses);
  }

  async addAttachment(file: File, input: AttachmentInput): Promise<AttachmentMeta> {
    const metadata: AttachmentMeta = {
      id: makeId("attachment"),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      category: input.category,
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString()
    };
    const database = await openAttachmentDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ATTACHMENT_STORE_NAME, "readwrite");
      transaction.objectStore(ATTACHMENT_STORE_NAME).put({ ...metadata, blob: file } satisfies StoredAttachment);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("附件無法保存。"));
      transaction.onabort = () => reject(transaction.error ?? new Error("附件保存已取消。"));
    }).finally(() => database.close());
    return metadata;
  }

  async getAttachment(id: string): Promise<StoredAttachment | undefined> {
    const database = await openAttachmentDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(ATTACHMENT_STORE_NAME, "readonly").objectStore(ATTACHMENT_STORE_NAME).get(id);
      request.onsuccess = () => {
        database.close();
        resolve(request.result as StoredAttachment | undefined);
      };
      request.onerror = () => {
        database.close();
        reject(request.error ?? new Error("附件無法讀取。"));
      };
    });
  }

  async deleteAttachment(id: string): Promise<void> {
    const database = await openAttachmentDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ATTACHMENT_STORE_NAME, "readwrite");
      transaction.objectStore(ATTACHMENT_STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("附件無法刪除。"));
      transaction.onabort = () => reject(transaction.error ?? new Error("附件刪除已取消。"));
    }).finally(() => database.close());
  }
}

export type ExpenseTotals = Record<ExpenseCurrency, number>;

function emptyExpenseTotals(): ExpenseTotals {
  return { CNY: 0, TWD: 0 };
}

function addExpenseTotal(totals: Record<string, ExpenseTotals>, key: string, expense: ExpenseRecord): void {
  const current = totals[key] ?? emptyExpenseTotals();
  current[expense.currency] += expense.amount;
  totals[key] = current;
}

export function summarizeExpenses(expenses: ExpenseRecord[]): {
  byCurrency: ExpenseTotals;
  byPayer: Record<string, ExpenseTotals>;
  byCategory: Record<string, ExpenseTotals>;
} {
  return expenses.reduce((summary, expense) => {
    summary.byCurrency[expense.currency] += expense.amount;
    addExpenseTotal(summary.byPayer, expense.payer, expense);
    addExpenseTotal(summary.byCategory, expense.category, expense);
    return summary;
  }, { byCurrency: emptyExpenseTotals(), byPayer: {}, byCategory: {} } as { byCurrency: ExpenseTotals; byPayer: Record<string, ExpenseTotals>; byCategory: Record<string, ExpenseTotals> });
}

export function formatExpenseAmount(amount: number, currency: ExpenseCurrency): string {
  return `${currency === "TWD" ? "NT$" : "¥"} ${amount.toFixed(2)}`;
}

export interface ExpensePdfExportOptions {
  expenses: ExpenseRecord[];
  scopeLabel: string;
  tripTitle?: string;
}

function escapePrintHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatExpensePrintDate(date: string): string {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${year}/${Number(month)}/${Number(day)}`;
}

/**
 * Creates a self-contained, printable expense report. The caller can open it
 * in a new local browser document and let the operating system save it as PDF.
 * No report data is sent to a server or added to the public itinerary JSON.
 */
export function createExpensePdfHtml({ expenses, scopeLabel, tripTitle = "上海 2026" }: ExpensePdfExportOptions): string {
  const sorted = [...expenses].sort((a, b) => `${a.date}${a.createdAt}`.localeCompare(`${b.date}${b.createdAt}`));
  const totals = summarizeExpenses(sorted).byCurrency;
  const generatedAt = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
  const rows = sorted.map((expense) => `
    <tr>
      <td>${escapePrintHtml(formatExpensePrintDate(expense.date))}${expense.dayNumber ? `<small>Day ${expense.dayNumber}</small>` : ""}</td>
      <td><strong>${escapePrintHtml(expense.title)}</strong></td>
      <td>${escapePrintHtml(expense.category)}</td>
      <td>${escapePrintHtml(expense.payer)}</td>
      <td>${escapePrintHtml(expense.paymentMethod ?? "未填寫")}</td>
      <td class="amount">${expense.currency === "CNY" ? escapePrintHtml(formatExpenseAmount(expense.amount, "CNY")) : ""}</td>
      <td class="amount">${expense.currency === "TWD" ? escapePrintHtml(formatExpenseAmount(expense.amount, "TWD")) : ""}</td>
      <td class="note">${escapePrintHtml(expense.note ?? "").replace(/\n/g, "<br>")}</td>
    </tr>`).join("");
  const bodyRows = rows || "<tr><td class=\"empty\" colspan=\"8\">這個篩選目前沒有旅費記錄。</td></tr>";

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapePrintHtml(tripTitle)}｜旅費明細</title>
  <style>
    @page { size: A4 landscape; margin: 11mm; }
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #142832; background: #f2f5f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif; }
    .sheet { max-width: 1120px; margin: 0 auto; padding: 28px; background: #fff; }
    .topline { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 18px; border-bottom: 1px solid #dce4e6; }
    .eyebrow { margin: 0 0 6px; color: #b77a37; font-size: 11px; font-weight: 800; letter-spacing: .13em; }
    h1 { margin: 0; font-size: 27px; letter-spacing: -.04em; }
    .scope, .meta { margin: 7px 0 0; color: #587079; font-size: 13px; }
    .meta { text-align: right; font-size: 11px; }
    .totals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
    .total { padding: 14px 16px; border: 1px solid #dce4e6; border-radius: 12px; background: #f6faf9; }
    .total span { display: block; color: #657a81; font-size: 11px; }
    .total strong { display: block; margin-top: 4px; color: #143f4d; font-size: 24px; letter-spacing: -.04em; }
    .count { margin: -8px 0 20px; color: #657a81; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { padding: 9px 8px; color: #5a6d73; border-bottom: 2px solid #bfcfd2; text-align: left; font-size: 10px; letter-spacing: .04em; }
    td { padding: 10px 8px; border-bottom: 1px solid #e4eaeb; vertical-align: top; color: #263e46; font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
    td strong { color: #142832; font-size: 12px; }
    td small { display: block; margin-top: 3px; color: #76898f; font-size: 10px; }
    th:nth-child(1) { width: 10%; } th:nth-child(2) { width: 18%; } th:nth-child(3) { width: 9%; } th:nth-child(4) { width: 10%; }
    th:nth-child(5) { width: 11%; } th:nth-child(6), th:nth-child(7) { width: 10%; } th:nth-child(8) { width: 22%; }
    .amount { color: #8d5d24; font-weight: 800; text-align: right; white-space: nowrap; }
    .note { color: #587079; }
    .empty { padding: 30px; color: #657a81; text-align: center; }
    .privacy { margin: 18px 0 0; color: #657a81; font-size: 10px; }
    .screen-actions { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .screen-actions button { min-height: 42px; padding: 0 16px; border: 0; border-radius: 10px; color: #fff; background: #164a59; font: inherit; font-weight: 750; cursor: pointer; }
    @media print { body { background: #fff; } .sheet { max-width: none; padding: 0; } .screen-actions { display: none; } }
  </style>
</head>
<body>
  <main class="sheet">
    <div class="screen-actions"><button type="button" onclick="window.print()">列印／儲存 PDF</button></div>
    <header class="topline">
      <div><p class="eyebrow">PRIVATE EXPENSE REPORT</p><h1>${escapePrintHtml(tripTitle)}｜旅費明細</h1><p class="scope">範圍：${escapePrintHtml(scopeLabel)}</p></div>
      <p class="meta">產生時間：${escapePrintHtml(generatedAt)}<br>本報表僅由目前裝置的本機帳本產生</p>
    </header>
    <section class="totals" aria-label="旅費合計">
      <div class="total"><span>人民幣合計</span><strong>${escapePrintHtml(formatExpenseAmount(totals.CNY, "CNY"))}</strong></div>
      <div class="total"><span>新台幣合計</span><strong>${escapePrintHtml(formatExpenseAmount(totals.TWD, "TWD"))}</strong></div>
    </section>
    <p class="count">共 ${sorted.length} 筆記錄。兩種幣別分開統計，未自行換算匯率。</p>
    <table>
      <thead><tr><th>日期</th><th>項目</th><th>分類</th><th>付款人</th><th>付款方式</th><th>人民幣</th><th>新台幣</th><th>備註</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <p class="privacy">提醒：列印或儲存後的 PDF 可能包含付款人與消費資訊，請自行保管；資料不會寫入公開行程或上傳 GitHub。</p>
  </main>
</body>
</html>`;
}

export function openExpensePdfPrintView(options: ExpensePdfExportOptions): boolean {
  if (typeof window === "undefined") return false;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  try {
    printWindow.opener = null;
  } catch {
    // The generated report is an in-app blank document regardless of opener support.
  }

  printWindow.document.open();
  printWindow.document.write(createExpensePdfHtml(options));
  printWindow.document.close();
  window.setTimeout(() => {
    if (printWindow.closed) return;
    printWindow.focus();
    printWindow.print();
  }, 220);
  return true;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function expensesToCsv(expenses: ExpenseRecord[]): string {
  const rows = [
    ["日期", "行程日", "項目", "幣別", "金額", "付款人", "付款方式", "分類", "備註"],
    ...[...expenses].sort((a, b) => a.date.localeCompare(b.date)).map((expense) => [
      expense.date,
      expense.dayNumber ? `Day ${expense.dayNumber}` : "",
      expense.title,
      expense.currency,
      expense.amount.toFixed(2),
      expense.payer,
      expense.paymentMethod ?? "未填寫",
      expense.category,
      expense.note ?? ""
    ])
  ];
  return `\uFEFF${rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n")}\r\n`;
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
