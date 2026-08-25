import Tesseract from "tesseract.js";

export type PaymentSource = "支付寶" | "微信支付" | "美團外送" | "其他付款截圖";

export interface PaymentOcrResult {
  text: string;
  source: PaymentSource;
  merchant?: string;
  amountCny?: number;
  date?: string;
  confidence?: number;
}

type ProgressHandler = (progress: number, status: string) => void;

let workerPromise: Promise<Tesseract.Worker> | null = null;
let activeProgressHandler: ProgressHandler | undefined;

function getWorker(onProgress?: ProgressHandler): Promise<Tesseract.Worker> {
  activeProgressHandler = onProgress;
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker("chi_sim+eng", 1, {
      logger: (message) => activeProgressHandler?.(message.progress, message.status)
    }).catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

export async function recognizePaymentScreenshot(file: File, onProgress?: ProgressHandler): Promise<PaymentOcrResult> {
  const worker = await getWorker(onProgress);
  const result = await worker.recognize(file, { rotateAuto: true });
  return parsePaymentText(result.data.text, result.data.confidence);
}

export function parsePaymentText(text: string, confidence?: number): PaymentOcrResult {
  const source = detectPaymentSource(text);
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const merchant = detectMerchant(lines);
  const amountCny = detectAmount(text);
  const date = detectDate(text);
  const normalizedConfidence = typeof confidence === "number" && Number.isFinite(confidence) ? confidence : undefined;

  return {
    text,
    source,
    merchant,
    amountCny,
    date,
    confidence: normalizedConfidence
  };
}

function detectPaymentSource(text: string): PaymentSource {
  if (/美團|美团|外送|外賣|外卖|meituan/i.test(text)) return "美團外送";
  if (/支付寶|支付宝|alipay/i.test(text)) return "支付寶";
  if (/微信支付|微信|wechat/i.test(text)) return "微信支付";
  return "其他付款截圖";
}

function detectAmount(text: string): number | undefined {
  const labeledAmount = text.match(/(?:實付|实付|付款金額|支付金額|付款金额|支付金额|合計|合计|總計|总计|訂單金額|订单金额|應付|应付|收款)[^\d¥￥]{0,18}(?:¥|￥|CNY|RMB)?\s*([\d][\d,.]*)/i);
  const currencyAmount = text.match(/(?:¥|￥|CNY|RMB)\s*([\d][\d,.]*)/i);
  const raw = labeledAmount?.[1] ?? currencyAmount?.[1];
  if (!raw) return undefined;

  const normalized = raw.replace(/[，,](?=\d{3}(?:\D|$))/g, "").replace(/[，,]/g, ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : undefined;
}

function detectDate(text: string): string | undefined {
  const match = text.match(/(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*[日号]?/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return undefined;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function detectMerchant(lines: string[]): string | undefined {
  const merchantLabel = /(?:收款方|收款人|商戶|商户|商家|店鋪|店铺|店名)\s*[:：]?\s*(.+)$/;
  for (const line of lines) {
    const match = line.match(merchantLabel);
    if (match?.[1]) return normalizeMerchant(match[1]);
  }

  const excludedLine = /支付寶|支付宝|alipay|微信支付|wechat|美團|美团|meituan|外送|外賣|外卖|付款成功|支付成功|交易成功|已完成|收款|付款|實付|实付|訂單|订单|¥|￥|cny|rmb|時間|时间|日期|合計|合计/i;
  const fallback = lines.find((line) => {
    if (line.length < 2 || line.length > 50 || excludedLine.test(line)) return false;
    if (/^\d[\d\s:./-]*$/.test(line)) return false;
    return !/^扫码|掃碼|扫一扫|掃一掃|账单|帳單|明細|明细|首頁|首页/i.test(line);
  });
  return fallback ? normalizeMerchant(fallback) : undefined;
}

function normalizeMerchant(value: string): string | undefined {
  const cleaned = value.replace(/[|｜]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function formatPaymentOcrStatus(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("loading tesseract core")) return "載入 OCR 核心";
  if (normalized.includes("loading language traineddata")) return "載入中文辨識模型";
  if (normalized.includes("initializing api")) return "初始化辨識工具";
  if (normalized.includes("recognizing text")) return "辨識付款截圖文字";
  if (normalized.includes("initializing tesseract")) return "準備 OCR";
  return status || "準備辨識";
}
