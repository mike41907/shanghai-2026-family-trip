import { INITIAL_TRIP } from "../data/initialTrip";
import type { RepositoryState, TripBackup, TripDocument, TripSnapshot, TripVersion } from "../types";
import {
  clone,
  documentFromSnapshot,
  isTripDocument,
  normalizeTrip,
  snapshotFromDocument
} from "./utils";

const PUBLISHED_KEY = "shanghai-2026:published";
const DRAFT_KEY = "shanghai-2026:draft";
const BACKUP_KEY = "shanghai-2026:last-backup";
const INITIAL_VERSION_DATE = "2026-08-25T10:30:00+08:00";

export interface TripRepository {
  load(): Promise<RepositoryState>;
  saveDraft(draft: TripDocument): void;
  publish(draft: TripDocument, note?: string): TripDocument;
  saveBackup(backup: TripBackup): void;
  getLastBackup(): TripBackup | undefined;
}

export function withInitialVersion(trip: TripDocument): TripDocument {
  const normalized = normalizeTrip(trip);
  if (normalized.versions.length > 0) return normalized;
  const snapshot = snapshotFromDocument(normalized);
  const initialVersion: TripVersion = {
    id: "version-1-0",
    label: "V1.0",
    createdAt: normalized.publishedAt ?? INITIAL_VERSION_DATE,
    note: "初始匯入：2026 上海五天四夜家庭旅行",
    snapshot
  };
  return { ...normalized, versions: [initialVersion] };
}

function readTrip(key: string): TripDocument | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isTripDocument(parsed) ? withInitialVersion(parsed) : undefined;
  } catch {
    return undefined;
  }
}

function writeTrip(key: string, value: TripDocument): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function readBackup(): TripBackup | undefined {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as TripBackup;
    if (parsed?.kind !== "family-trip-backup" || !isTripDocument(parsed.draft) || !isTripDocument(parsed.published)) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export class LocalTripRepository implements TripRepository {
  private readonly tripUrl: string;

  constructor() {
    const base = new URL(import.meta.env.BASE_URL, window.location.origin);
    this.tripUrl = new URL("trip.json", base).toString();
  }

  async load(): Promise<RepositoryState> {
    let published = readTrip(PUBLISHED_KEY);
    let lastRemoteSyncAt: string | undefined;

    try {
      const response = await fetch(this.tripUrl, { cache: "no-store" });
      if (response.ok) {
        const payload: unknown = await response.json();
        if (isTripDocument(payload)) {
          published = withInitialVersion(payload);
          writeTrip(PUBLISHED_KEY, published);
          lastRemoteSyncAt = new Date().toISOString();
        }
      }
    } catch {
      // Offline launch intentionally falls back to the last published local snapshot.
    }

    if (!published) {
      published = withInitialVersion(INITIAL_TRIP);
      writeTrip(PUBLISHED_KEY, published);
    }

    const draft = readTrip(DRAFT_KEY) ?? clone(published);
    return {
      published,
      draft,
      lastRemoteSyncAt,
      lastBackup: readBackup()
    };
  }

  saveDraft(draft: TripDocument): void {
    writeTrip(DRAFT_KEY, normalizeTrip(draft));
  }

  publish(draft: TripDocument, note = "管理者發布最新版"): TripDocument {
    const base = withInitialVersion(draft);
    const createdAt = new Date().toISOString();
    const snapshot: TripSnapshot = {
      ...snapshotFromDocument(base),
      publishedAt: createdAt
    };
    const versionNumber = base.versions.length;
    const version: TripVersion = {
      id: `version-1-${versionNumber}`,
      label: `V1.${versionNumber}`,
      createdAt,
      note,
      snapshot
    };
    const published: TripDocument = {
      ...clone(base),
      publishedAt: createdAt,
      versions: [...clone(base.versions), version]
    };
    writeTrip(PUBLISHED_KEY, published);
    writeTrip(DRAFT_KEY, published);
    return published;
  }

  saveBackup(backup: TripBackup): void {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  }

  getLastBackup(): TripBackup | undefined {
    return readBackup();
  }

  static restoreVersion(current: TripDocument, version: TripVersion): TripDocument {
    return documentFromSnapshot(version.snapshot, current.versions);
  }
}

