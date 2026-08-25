import type { ItineraryItem, TripDay, TripDocument, TripSnapshot } from "../types";

export function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTime(time: string): number {
  const match = time.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${dateString}T12:00:00`));
}

export function formatMonthDay(dateString: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric"
  }).format(new Date(`${dateString}T12:00:00`));
}

export function formatWeekday(dateString: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    weekday: "short"
  }).format(new Date(`${dateString}T12:00:00`));
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "尚未發布";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));
}

export function formatTimeRange(item: Pick<ItineraryItem, "startTime" | "endTime">): string {
  return item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime;
}

export function getItemDate(day: TripDay, item: Pick<ItineraryItem, "startTime">): Date {
  const [year, month, date] = day.date.split("-").map(Number);
  const minutes = parseTime(item.startTime);
  return new Date(year, month - 1, date, Math.floor(minutes / 60), minutes % 60);
}

export function formatDistanceUntil(target: Date, now = new Date()): string {
  const distance = target.getTime() - now.getTime();
  if (distance <= 0) return "現在";
  const minutes = Math.round(distance / 60000);
  if (minutes < 60) return `還有 ${minutes} 分鐘`;
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `還有 ${hours} 小時 ${remainder} 分` : `還有 ${hours} 小時`;
  }
  const days = Math.floor(minutes / (24 * 60));
  const remainderHours = Math.floor((minutes % (24 * 60)) / 60);
  return remainderHours ? `還有 ${days} 天 ${remainderHours} 小時` : `還有 ${days} 天`;
}

export type DayRelation = "before" | "today" | "after";

export function resolveReferenceDay(days: TripDay[], now = new Date()): {
  day: TripDay;
  relation: DayRelation;
} {
  const today = getDateKey(now);
  const exact = days.find((day) => day.date === today);
  if (exact) return { day: exact, relation: "today" };
  const upcoming = days.find((day) => day.date > today);
  if (upcoming) return { day: upcoming, relation: "before" };
  return { day: days[days.length - 1], relation: "after" };
}

export type DayProgress = {
  status: "before" | "active" | "between" | "complete";
  current?: ItineraryItem;
  next?: ItineraryItem;
};

export function getDayProgress(day: TripDay, now = new Date()): DayProgress {
  const today = getDateKey(now);
  if (day.date > today) return { status: "before", next: day.items[0] };
  if (day.date < today) return { status: "complete" };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const sorted = [...day.items].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  const next = sorted.find((item) => parseTime(item.startTime) > nowMinutes);
  const currentIndex = sorted.reduce((found, item, index) => {
    const start = parseTime(item.startTime);
    const end = item.endTime ? parseTime(item.endTime) : parseTime(sorted[index + 1]?.startTime ?? "23:59");
    return start <= nowMinutes && nowMinutes < end ? index : found;
  }, -1);

  if (currentIndex >= 0) return { status: "active", current: sorted[currentIndex], next };
  if (next) return { status: nowMinutes < parseTime(sorted[0]?.startTime ?? "23:59") ? "before" : "between", next };
  return { status: "complete" };
}

export function getMapUrl(title: string, address?: string): string {
  const query = encodeURIComponent(address ? `${title} ${address}` : title);
  return `https://uri.amap.com/search?keyword=${query}&city=${encodeURIComponent("上海")}`;
}

export function openAmap(title: string, address?: string): void {
  const webUrl = getMapUrl(title, address);
  const query = encodeURIComponent(address ? `${title} ${address}` : title);
  const appUrl = `amapuri://search?keyword=${query}&city=${encodeURIComponent("上海")}`;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isMobile) {
    window.open(webUrl, "_blank", "noopener,noreferrer");
    return;
  }

  let leftPage = false;
  const onVisibilityChange = () => {
    leftPage = document.visibilityState === "hidden";
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.location.href = appUrl;
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (!leftPage && document.visibilityState === "visible") window.location.href = webUrl;
  }, 900);
}

export function getMeituanUrl(name: string): string {
  return `https://www.meituan.com/s/${encodeURIComponent(name)}`;
}

export function openMeituan(name: string): void {
  const webUrl = getMeituanUrl(name);
  const appUrl = `imeituan://www.meituan.com/search?keyword=${encodeURIComponent(name)}`;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) {
    window.open(webUrl, "_blank", "noopener,noreferrer");
    return;
  }

  let leftPage = false;
  const onVisibilityChange = () => {
    leftPage = document.visibilityState === "hidden";
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.location.href = appUrl;
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (!leftPage && document.visibilityState === "visible") window.location.href = webUrl;
  }, 900);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  }
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function snapshotFromDocument(documentData: TripDocument): TripSnapshot {
  const { versions: _versions, ...snapshot } = clone(documentData);
  return snapshot;
}

export function documentFromSnapshot(snapshot: TripSnapshot, versions: TripDocument["versions"]): TripDocument {
  return { ...clone(snapshot), versions: clone(versions) };
}

export function isTripDocument(value: unknown): value is TripDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TripDocument>;
  return Boolean(
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.startDate === "string" &&
    typeof candidate.endDate === "string" &&
    Array.isArray(candidate.days) &&
    Array.isArray(candidate.restaurants) &&
    candidate.info &&
    typeof candidate.info === "object"
  );
}

export function normalizeTrip(value: TripDocument): TripDocument {
  return {
    ...clone(value),
    versions: Array.isArray(value.versions) ? clone(value.versions) : []
  };
}
