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
