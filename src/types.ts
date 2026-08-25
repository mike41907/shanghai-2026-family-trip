export type TransportMode = "walk" | "metro" | "taxi" | "maglev" | "flight" | "other";

export interface ItineraryItem {
  id: string;
  startTime: string;
  endTime?: string;
  title: string;
  address?: string;
  phone?: string;
  businessHours?: string;
  duration?: string;
  transportMode?: TransportMode;
  transportNote?: string;
  notes?: string;
  category?: string;
  completed?: boolean;
  flexible?: boolean;
  sourceRestaurantId?: string;
}

export interface TransitSegment {
  id: string;
  from: string;
  to: string;
  mode: TransportMode;
  detail?: string;
  duration?: string;
}

export interface TripDay {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  overview: string;
  items: ItineraryItem[];
  transitSegments: TransitSegment[];
}

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  address?: string;
  phone?: string;
  businessHours?: string;
  area?: string;
  notes?: string;
}

export type TripTaskCategory = "證件" | "網路" | "行李" | "行程" | "返程" | "其他";

export interface TripTask {
  id: string;
  title: string;
  category: TripTaskCategory;
  completed: boolean;
  assignee?: string;
  notes?: string;
}

export const DEFAULT_TRIP_TASKS: TripTask[] = [
  { id: "task-passport", title: "確認護照與台胞證", category: "證件", completed: false },
  { id: "task-sim", title: "準備網卡／中國門號", category: "網路", completed: false },
  { id: "task-charger", title: "準備充電器、轉接頭與行動電源", category: "行李", completed: false },
  { id: "task-medicine", title: "準備常備藥品", category: "行李", completed: false },
  { id: "task-tickets", title: "確認機票、訂位與付款資料", category: "行程", completed: false },
  { id: "task-checkout", title: "退房、確認房間並取回行李", category: "返程", completed: false }
];

export interface TripFlight {
  id: string;
  label: string;
  flightNumber?: string;
  date: string;
  time: string;
  route: string;
}

export interface TripInfo {
  hotel: {
    name: string;
    address: string;
    phone?: string;
  };
  flights: TripFlight[];
  members: string[];
  maglevStation: string;
  airport: string;
}

export interface TripSnapshot {
  id: string;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  days: TripDay[];
  restaurants: Restaurant[];
  tasks: TripTask[];
  info: TripInfo;
  publishedAt?: string;
}

export interface TripVersion {
  id: string;
  label: string;
  createdAt: string;
  note: string;
  snapshot: TripSnapshot;
}

export interface TripDocument extends TripSnapshot {
  versions: TripVersion[];
}

export interface TripBackup {
  kind: "family-trip-backup";
  schemaVersion: 1;
  savedAt: string;
  published: TripDocument;
  draft: TripDocument;
}

export interface RepositoryState {
  published: TripDocument;
  draft: TripDocument;
  lastRemoteSyncAt?: string;
  lastBackup?: TripBackup;
}

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  walk: "步行",
  metro: "地鐵",
  taxi: "滴滴",
  maglev: "磁浮",
  flight: "飛機",
  other: "其他"
};

export const TRANSPORT_EMOJI: Record<TransportMode, string> = {
  walk: "↗",
  metro: "⇄",
  taxi: "▰",
  maglev: "➝",
  flight: "✈",
  other: "•"
};
