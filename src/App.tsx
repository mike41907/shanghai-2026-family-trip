import {
  CalendarDays,
  Check,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clipboard,
  Clock3,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  GripVertical,
  History,
  Hotel,
  Info,
  Luggage,
  Map,
  MapPin,
  Moon,
  Navigation,
  Pencil,
  Paperclip,
  Plane,
  PhoneCall,
  Plus,
  RotateCcw,
  Route,
  Save,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Utensils,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LocalTripRepository, withInitialVersion } from "./lib/repository";
import {
  expensesToCsv,
  formatFileSize,
  LocalTravelToolsRepository,
  summarizeExpenses,
  type AttachmentCategory,
  type AttachmentMeta,
  type ExpenseCategory,
  type ExpenseRecord,
  type TravelToolsData
} from "./lib/travelTools";
import {
  clone,
  copyText,
  documentFromSnapshot,
  downloadJson,
  formatDate,
  formatDateTime,
  formatDistanceUntil,
  formatMonthDay,
  formatTimeRange,
  formatWeekday,
  getDateKey,
  getDayProgress,
  getItemDate,
  isTripDocument,
  makeId,
  openAmap,
  openMeituan,
  parseTime,
  resolveReferenceDay,
  snapshotFromDocument
} from "./lib/utils";
import {
  TRANSPORT_EMOJI,
  TRANSPORT_LABELS,
  type ItineraryItem,
  type Restaurant,
  type RepositoryState,
  type TransportMode,
  type TransitSegment,
  type TripDay,
  type TripDocument,
  type TripInfo,
  type TripTask,
  type TripTaskCategory,
  type TripVersion
} from "./types";
import "./styles.css";

type Page = "today" | "schedule" | "eat" | "trip";
type Theme = "light" | "dark";
type FontScale = "small" | "standard" | "large";
type ToastTone = "default" | "success" | "error";

interface ToastState {
  message: string;
  tone: ToastTone;
}

const NAV_ITEMS: Array<{ id: Page; label: string; icon: LucideIcon }> = [
  { id: "today", label: "今天", icon: Sun },
  { id: "schedule", label: "行程", icon: CalendarDays },
  { id: "eat", label: "想吃", icon: Utensils },
  { id: "trip", label: "旅程", icon: Luggage }
];

function App() {
  const repository = useMemo(() => new LocalTripRepository(), []);
  const travelToolsRepository = useMemo(() => new LocalTravelToolsRepository(), []);
  const [appState, setAppState] = useState<RepositoryState | null>(null);
  const [travelTools, setTravelTools] = useState<TravelToolsData | null>(null);
  const [activePage, setActivePage] = useState<Page>("today");
  const [selectedDay, setSelectedDay] = useState(1);
  const [managerMode, setManagerMode] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("shanghai-2026:theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [fontScale, setFontScale] = useState<FontScale>(() => {
    const saved = localStorage.getItem("shanghai-2026:font-scale");
    return saved === "small" || saved === "large" ? saved : "standard";
  });
  const [now, setNow] = useState(() => new Date());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ dayId: string; item?: ItineraryItem } | null>(null);
  const [addingRestaurant, setAddingRestaurant] = useState<Restaurant | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null | undefined>(undefined);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingTask, setEditingTask] = useState<TripTask | null | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null | undefined>(undefined);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [viewingTrafficDay, setViewingTrafficDay] = useState<TripDay | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    repository.load().then((loaded) => {
      if (active) setAppState(loaded);
    }).catch(() => {
      if (active) setLoadingError("行程載入失敗，請重新整理頁面。離線資料也無法讀取。 ");
    });
    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    let active = true;
    travelToolsRepository.load().then((loaded) => {
      if (active) setTravelTools(loaded);
    });
    return () => {
      active = false;
    };
  }, [travelToolsRepository]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("shanghai-2026:theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("shanghai-2026:font-scale", fontScale);
  }, [fontScale]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const showToast = (message: string, tone: ToastTone = "default") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4200);
  };

  const updateDraft = (updater: (draft: TripDocument) => TripDocument) => {
    setAppState((current) => {
      if (!current) return current;
      const nextDraft = withInitialVersion(updater(clone(current.draft)));
      repository.saveDraft(nextDraft);
      return { ...current, draft: nextDraft };
    });
  };

  const isDirty = useMemo(() => {
    if (!appState) return false;
    return JSON.stringify(snapshotFromDocument(appState.draft)) !== JSON.stringify(snapshotFromDocument(appState.published));
  }, [appState]);

  const visibleTrip = managerMode ? appState?.draft : appState?.published;
  const selectedDayData = visibleTrip?.days.find((day) => day.dayNumber === selectedDay) ?? visibleTrip?.days[0];

  const handlePublish = (note: string) => {
    if (!appState) return;
    const published = repository.publish(appState.draft, note || "管理者發布最新版");
    setAppState({ ...appState, published, draft: clone(published) });
    downloadJson("trip.json", published);
    showToast(`${published.versions[published.versions.length - 1]?.label ?? "最新版"} 已發布，已下載 trip.json。`, "success");
  };

  const handleDownloadDraft = () => {
    if (!appState) return;
    downloadJson("trip-draft.json", appState.draft);
    showToast("草稿已下載。", "success");
  };

  const handleBackup = () => {
    if (!appState) return;
    const backup = {
      kind: "family-trip-backup" as const,
      schemaVersion: 1 as const,
      savedAt: new Date().toISOString(),
      published: appState.published,
      draft: appState.draft
    };
    repository.saveBackup(backup);
    setAppState({ ...appState, lastBackup: backup });
    downloadJson(`shanghai-2026-backup-${getDateKey(new Date())}.json`, backup);
    showToast("完整備份已下載，並保存在本機供還原。", "success");
  };

  const handleRestoreBackup = () => {
    const backup = repository.getLastBackup();
    if (!backup) {
      showToast("本機目前沒有可還原的備份。", "error");
      return;
    }
    if (!window.confirm(`還原 ${formatDateTime(backup.savedAt)} 的本機備份？這會覆蓋目前草稿。`)) return;
    updateDraft(() => clone(backup.draft));
    showToast("備份已還原到草稿，請確認後再發布。", "success");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const candidate = parsed && typeof parsed === "object" && "kind" in parsed && (parsed as { kind?: string }).kind === "family-trip-backup"
        ? (parsed as { draft?: TripDocument }).draft
        : parsed;
      if (!isTripDocument(candidate)) {
        throw new Error("invalid");
      }
      updateDraft(() => withInitialVersion(candidate));
      showToast("JSON 已匯入草稿，尚未影響家人看到的發布版本。", "success");
    } catch {
      showToast("JSON 格式無法辨識，請選擇 trip.json 或本 App 的備份檔。", "error");
    }
  };

  const handleRestoreVersion = (version: TripVersion) => {
    if (!appState) return;
    if (!window.confirm(`將草稿還原為 ${version.label}？還原後仍需按「發布最新版」才會對外更新。`)) return;
    updateDraft((draft) => documentFromSnapshot(version.snapshot, draft.versions));
    showToast(`${version.label} 已還原到草稿。`, "success");
  };

  const saveItem = (dayId: string, nextItem: ItineraryItem) => {
    updateDraft((draft) => ({
      ...draft,
      days: draft.days.map((day) => {
        if (day.id !== dayId) return day;
        const exists = day.items.some((item) => item.id === nextItem.id);
        const items = exists
          ? day.items.map((item) => item.id === nextItem.id ? nextItem : item)
          : [...day.items, nextItem];
        return { ...day, items: items.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime)) };
      })
    }));
    setEditingItem(null);
    showToast("行程草稿已儲存。", "success");
  };

  const deleteItem = (dayId: string, itemId: string) => {
    if (!window.confirm("確定刪除這個行程？刪除只會影響尚未發布的草稿。")) return;
    updateDraft((draft) => ({
      ...draft,
      days: draft.days.map((day) => day.id === dayId ? { ...day, items: day.items.filter((item) => item.id !== itemId) } : day)
    }));
    showToast("行程已從草稿刪除。", "success");
  };

  const duplicateItem = (dayId: string, source: ItineraryItem) => {
    const duplicate = { ...clone(source), id: makeId("item"), title: `${source.title}（複製）`, completed: false };
    updateDraft((draft) => ({
      ...draft,
      days: draft.days.map((day) => day.id === dayId
        ? { ...day, items: [...day.items, duplicate].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime)) }
        : day)
    }));
    showToast("行程已複製到草稿。", "success");
  };

  const toggleItemComplete = (dayId: string, itemId: string) => {
    updateDraft((draft) => ({
      ...draft,
      days: draft.days.map((day) => day.id === dayId
        ? { ...day, items: day.items.map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item) }
        : day)
    }));
  };

  const reorderItems = (dayId: string, sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    updateDraft((draft) => ({
      ...draft,
      days: draft.days.map((day) => {
        if (day.id !== dayId) return day;
        const items = [...day.items];
        const sourceIndex = items.findIndex((item) => item.id === sourceId);
        const targetIndex = items.findIndex((item) => item.id === targetId);
        if (sourceIndex < 0 || targetIndex < 0) return day;
        const [moved] = items.splice(sourceIndex, 1);
        items.splice(targetIndex, 0, moved);
        return { ...day, items };
      })
    }));
    showToast("排序已更新到草稿。", "success");
  };

  const saveRestaurant = (restaurant: Restaurant) => {
    updateDraft((draft) => ({
      ...draft,
      restaurants: draft.restaurants.some((item) => item.id === restaurant.id)
        ? draft.restaurants.map((item) => item.id === restaurant.id ? restaurant : item)
        : [...draft.restaurants, restaurant]
    }));
    setEditingRestaurant(undefined);
    showToast("餐廳口袋名單已更新。", "success");
  };

  const deleteRestaurant = (restaurantId: string) => {
    if (!window.confirm("確定刪除這間備選餐廳？已加入行程的項目不會被刪除。")) return;
    updateDraft((draft) => ({ ...draft, restaurants: draft.restaurants.filter((restaurant) => restaurant.id !== restaurantId) }));
    showToast("餐廳已從口袋名單移除。", "success");
  };

  const addRestaurantToSchedule = (restaurant: Restaurant, dayId: string, startTime: string, notes: string) => {
    const day = visibleTrip?.days.find((candidate) => candidate.id === dayId);
    if (!day) return;
    const nextItem: ItineraryItem = {
      id: makeId("restaurant-item"),
      startTime,
      title: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone,
      businessHours: restaurant.businessHours,
      category: restaurant.category,
      notes: notes || restaurant.notes,
      sourceRestaurantId: restaurant.id
    };
    updateDraft((draft) => ({
      ...draft,
      days: draft.days.map((candidate) => candidate.id === dayId
        ? { ...candidate, items: [...candidate.items, nextItem].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime)) }
        : candidate)
    }));
    setAddingRestaurant(null);
    setSelectedDay(day.dayNumber);
    showToast(`${restaurant.name} 已加入 Day ${day.dayNumber} 草稿。`, "success");
  };

  const removeRestaurantFromSchedule = (restaurant: Restaurant, dayId: string, itemId: string) => {
    if (!window.confirm(`將「${restaurant.name}」移回備選餐廳？正式行程中的這一站會被移除。`)) return;
    updateDraft((draft) => ({
      ...draft,
      days: draft.days.map((day) => day.id === dayId
        ? { ...day, items: day.items.filter((item) => item.id !== itemId) }
        : day)
    }));
    showToast(`${restaurant.name} 已移回備選餐廳。`, "success");
  };

  const saveTripInfo = (info: TripInfo) => {
    updateDraft((draft) => ({ ...draft, info }));
    setEditingInfo(false);
    showToast("旅程資料已更新到草稿。", "success");
  };

  const saveTask = (task: TripTask) => {
    updateDraft((draft) => ({
      ...draft,
      tasks: draft.tasks.some((candidate) => candidate.id === task.id)
        ? draft.tasks.map((candidate) => candidate.id === task.id ? task : candidate)
        : [...draft.tasks, task]
    }));
    setEditingTask(undefined);
    showToast("家庭任務已更新到草稿。", "success");
  };

  const toggleTask = (taskId: string) => {
    updateDraft((draft) => ({
      ...draft,
      tasks: draft.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task)
    }));
  };

  const deleteTask = (taskId: string) => {
    if (!window.confirm("確定刪除這項家庭任務？刪除只會影響尚未發布的草稿。")) return;
    updateDraft((draft) => ({ ...draft, tasks: draft.tasks.filter((task) => task.id !== taskId) }));
    showToast("家庭任務已刪除。", "success");
  };

  const saveExpense = (expense: ExpenseRecord) => {
    if (!travelTools) return;
    const expenses = travelTools.expenses.some((candidate) => candidate.id === expense.id)
      ? travelTools.expenses.map((candidate) => candidate.id === expense.id ? expense : candidate)
      : [...travelTools.expenses, expense];
    travelToolsRepository.saveExpenses(expenses);
    setTravelTools({ ...travelTools, expenses });
    setEditingExpense(undefined);
    showToast("旅費已保存在本機。", "success");
  };

  const deleteExpense = (expenseId: string) => {
    if (!travelTools || !window.confirm("確定刪除這筆旅費？")) return;
    const expenses = travelTools.expenses.filter((expense) => expense.id !== expenseId);
    travelToolsRepository.saveExpenses(expenses);
    setTravelTools({ ...travelTools, expenses });
    showToast("旅費已刪除。", "success");
  };

  const exportExpenses = () => {
    if (!travelTools) return;
    const summary = summarizeExpenses(travelTools.expenses);
    downloadJson("shanghai-2026-expenses.json", {
      kind: "family-trip-expenses",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      summary,
      expenses: travelTools.expenses
    });
    const csvBlob = new Blob([expensesToCsv(travelTools.expenses)], { type: "text/csv;charset=utf-8" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const anchor = document.createElement("a");
    anchor.href = csvUrl;
    anchor.download = "shanghai-2026-expenses.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(csvUrl);
    showToast("已下載旅費 JSON 與 CSV 統計。", "success");
  };

  const handleAttachmentFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setPendingAttachment(file);
  };

  const saveAttachment = async (category: AttachmentCategory, note: string) => {
    if (!pendingAttachment || !travelTools) return;
    try {
      const metadata = await travelToolsRepository.addAttachment(pendingAttachment, { category, note });
      setTravelTools({ ...travelTools, attachments: [metadata, ...travelTools.attachments] });
      setPendingAttachment(null);
      showToast("附件已保存在本機，不會上傳到公開行程。", "success");
    } catch {
      showToast("附件無法保存，請確認瀏覽器允許本機儲存。", "error");
    }
  };

  const downloadAttachment = async (attachment: AttachmentMeta) => {
    try {
      const stored = await travelToolsRepository.getAttachment(attachment.id);
      if (!stored) throw new Error("missing");
      const url = URL.createObjectURL(stored.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast("附件無法讀取，可能已被清除。", "error");
    }
  };

  const deleteAttachment = async (attachment: AttachmentMeta) => {
    if (!travelTools || !window.confirm(`刪除「${attachment.name}」？`)) return;
    try {
      await travelToolsRepository.deleteAttachment(attachment.id);
      setTravelTools({ ...travelTools, attachments: travelTools.attachments.filter((item) => item.id !== attachment.id) });
      showToast("附件已從本機移除。", "success");
    } catch {
      showToast("附件刪除失敗。", "error");
    }
  };

  if (loadingError) return <div className="fatal-state"><CircleAlert size={24} />{loadingError}</div>;
  if (!appState || !visibleTrip) return <LoadingScreen />;

  return (
    <div className={`app-shell font-scale-${fontScale}`}>
      <AppHeader
        trip={visibleTrip}
        managerMode={managerMode}
        managerDirty={isDirty}
        theme={theme}
        fontScale={fontScale}
        onToggleTheme={() => setTheme((current) => current === "light" ? "dark" : "light")}
        onFontScaleChange={setFontScale}
        onOpenManager={() => {
          setManagerMode(true);
          setManagerOpen(true);
        }}
      />

      {managerMode && (
        <div className="manager-strip">
          <div>
            <span className="status-dot" /> 管理模式
            <span className="manager-strip-detail">{isDirty ? "尚未發布 · 修改只存在本機草稿" : "目前與發布版本一致"}</span>
          </div>
          <button className="quiet-button" onClick={() => setManagerOpen(true)}><Settings size={15} /> 管理工具</button>
        </div>
      )}

      <main className="page-content">
        {activePage === "today" && (
          <TodayPage
            trip={visibleTrip}
            tasks={visibleTrip.tasks}
            now={now}
            managerMode={managerMode}
            onToggleTask={toggleTask}
            onGoToTrip={() => setActivePage("trip")}
            onGoToSchedule={(dayNumber) => {
              setSelectedDay(dayNumber);
              setActivePage("schedule");
            }}
          />
        )}
        {activePage === "schedule" && selectedDayData && (
          <SchedulePage
            trip={visibleTrip}
            selectedDay={selectedDayData}
            managerMode={managerMode}
            onSelectDay={setSelectedDay}
            onAdd={() => setEditingItem({ dayId: selectedDayData.id })}
            onEdit={(dayId, item) => setEditingItem({ dayId, item })}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
            onToggleComplete={toggleItemComplete}
            onReorder={reorderItems}
            onViewTraffic={() => setViewingTrafficDay(selectedDayData)}
          />
        )}
        {activePage === "eat" && (
          <EatPage
            trip={visibleTrip}
            managerMode={managerMode}
            onAddRestaurant={() => setEditingRestaurant(null)}
            onEditRestaurant={setEditingRestaurant}
            onDeleteRestaurant={deleteRestaurant}
            onAddToSchedule={setAddingRestaurant}
            onRemoveFromSchedule={removeRestaurantFromSchedule}
          />
        )}
        {activePage === "trip" && (
          <TripInfoPage
            trip={visibleTrip}
            managerMode={managerMode}
            onEdit={() => setEditingInfo(true)}
            onAddTask={() => setEditingTask(null)}
            onEditTask={setEditingTask}
            onDeleteTask={deleteTask}
            onToggleTask={toggleTask}
            travelTools={travelTools}
            onAddExpense={() => setEditingExpense(null)}
            onEditExpense={setEditingExpense}
            onDeleteExpense={deleteExpense}
            onExportExpenses={exportExpenses}
            onAddAttachment={() => attachmentInputRef.current?.click()}
            onDownloadAttachment={downloadAttachment}
            onDeleteAttachment={deleteAttachment}
          />
        )}
      </main>

      <BottomNavigation activePage={activePage} onNavigate={setActivePage} />

      {managerOpen && (
        <ManagerDrawer
          trip={appState.draft}
          published={appState.published}
          isDirty={isDirty}
          lastRemoteSyncAt={appState.lastRemoteSyncAt}
          lastBackupAt={appState.lastBackup?.savedAt}
          onClose={() => setManagerOpen(false)}
          onPublish={handlePublish}
          onDownloadDraft={handleDownloadDraft}
          onBackup={handleBackup}
          onImport={() => importInputRef.current?.click()}
          onRestoreBackup={handleRestoreBackup}
          onRestoreVersion={handleRestoreVersion}
          onExitManager={() => {
            setManagerOpen(false);
            setManagerMode(false);
          }}
        />
      )}

      <input ref={importInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={handleImportFile} />
      <input ref={attachmentInputRef} className="visually-hidden" type="file" accept="image/*,.pdf,.png,.jpg,.jpeg" onChange={handleAttachmentFile} />

      {editingItem && (
        <ItemEditorDialog
          key={`${editingItem.dayId}-${editingItem.item?.id ?? "new"}`}
          day={visibleTrip.days.find((day) => day.id === editingItem.dayId) ?? visibleTrip.days[0]!}
          item={editingItem.item}
          onClose={() => setEditingItem(null)}
          onSave={(item) => saveItem(editingItem.dayId, item)}
        />
      )}

      {addingRestaurant && (
        <AddRestaurantDialog
          restaurant={addingRestaurant}
          days={visibleTrip.days}
          defaultDay={selectedDay}
          onClose={() => setAddingRestaurant(null)}
          onSave={addRestaurantToSchedule}
        />
      )}

      {editingRestaurant !== undefined && (
        <RestaurantEditorDialog
          restaurant={editingRestaurant ?? undefined}
          onClose={() => setEditingRestaurant(undefined)}
          onSave={saveRestaurant}
        />
      )}

      {editingInfo && (
        <TripInfoEditorDialog info={visibleTrip.info} onClose={() => setEditingInfo(false)} onSave={saveTripInfo} />
      )}

      {editingTask !== undefined && (
        <TaskEditorDialog task={editingTask ?? undefined} onClose={() => setEditingTask(undefined)} onSave={saveTask} />
      )}

      {editingExpense !== undefined && (
        <ExpenseEditorDialog expense={editingExpense ?? undefined} onClose={() => setEditingExpense(undefined)} onSave={saveExpense} />
      )}

      {pendingAttachment && (
        <AttachmentEditorDialog file={pendingAttachment} onClose={() => setPendingAttachment(null)} onSave={saveAttachment} />
      )}

      {viewingTrafficDay && <TrafficDialog day={viewingTrafficDay} onClose={() => setViewingTrafficDay(null)} />}

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="loading-orb"><Plane size={26} /></div><p>正在載入最新行程…</p></div>;
}

function AppHeader({
  trip,
  managerMode,
  managerDirty,
  theme,
  fontScale,
  onToggleTheme,
  onFontScaleChange,
  onOpenManager
}: {
  trip: TripDocument;
  managerMode: boolean;
  managerDirty: boolean;
  theme: Theme;
  fontScale: FontScale;
  onToggleTheme: () => void;
  onFontScaleChange: (scale: FontScale) => void;
  onOpenManager: () => void;
}) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark"><Plane size={21} strokeWidth={2.3} /></div>
        <div>
          <div className="brand-overline">家庭旅行</div>
          <div className="brand-title">{trip.title}</div>
        </div>
      </div>
      <div className="header-actions">
        <div className="font-size-control" role="group" aria-label="整體字體大小">
          <button className={fontScale === "small" ? "is-active" : ""} aria-label="縮小整體字體" aria-pressed={fontScale === "small"} onClick={() => onFontScaleChange("small")}>A−</button>
          <button className={fontScale === "standard" ? "is-active" : ""} aria-label="還原標準字體" aria-pressed={fontScale === "standard"} onClick={() => onFontScaleChange("standard")}>A</button>
          <button className={fontScale === "large" ? "is-active" : ""} aria-label="放大整體字體" aria-pressed={fontScale === "large"} onClick={() => onFontScaleChange("large")}>A+</button>
        </div>
        <button className="icon-button" aria-label={theme === "light" ? "切換深色模式" : "切換淺色模式"} onClick={onToggleTheme}>
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className={`manager-button ${managerMode ? "is-active" : ""}`} onClick={onOpenManager}>
          <Settings size={17} />
          <span>管理</span>
          {managerMode && managerDirty && <span className="unsaved-dot" />}
        </button>
      </div>
    </header>
  );
}

function TodayPage({
  trip,
  tasks,
  now,
  managerMode,
  onToggleTask,
  onGoToTrip,
  onGoToSchedule
}: {
  trip: TripDocument;
  tasks: TripTask[];
  now: Date;
  managerMode: boolean;
  onToggleTask: (taskId: string) => void;
  onGoToTrip: () => void;
  onGoToSchedule: (dayNumber: number) => void;
}) {
  const reference = resolveReferenceDay(trip.days, now);
  const progress = getDayProgress(reference.day, now);
  const nextItem = progress.next;
  const currentItem = progress.current;
  const nextDate = nextItem ? getItemDate(reference.day, nextItem) : undefined;
  const isBeforeTrip = reference.relation === "before";
  const statusText = isBeforeTrip
    ? "旅程尚未開始"
    : progress.status === "complete"
      ? "今日行程完成"
      : progress.status === "active"
        ? "正在進行"
        : "準備下一站";

  return (
    <div className="page-stack today-page">
      <section className="today-hero">
        <div className="hero-topline">
          <span className="eyebrow">{trip.title}</span>
          <span className="hero-date">{formatDate(trip.startDate)}–{formatDate(trip.endDate)}</span>
        </div>
        <div className="hero-mainline">
          <div>
            <div className="hero-day">Day {reference.day.dayNumber}</div>
            <h1>{reference.day.title}</h1>
          </div>
          <button className="hero-arrow" aria-label="查看今天行程" onClick={() => onGoToSchedule(reference.day.dayNumber)}><ChevronRight size={22} /></button>
        </div>
        <div className="hero-footline">
          <span className={`status-pill ${isBeforeTrip ? "soft" : ""}`}><span className="status-dot" />{statusText}</span>
          {isBeforeTrip && <span className="hero-countdown">距離出發 {formatDistanceUntil(getItemDate(reference.day, reference.day.items[0] ?? { startTime: "00:00" }), now)}</span>}
          {managerMode && <span className="manager-view-note">目前查看草稿</span>}
        </div>
      </section>

      {isBeforeTrip && <PreTripPreparationCard tasks={tasks} managerMode={managerMode} onToggleTask={onToggleTask} onGoToTrip={onGoToTrip} />}

      <section className="live-grid">
        <div className="live-card current-card">
          <div className="card-label"><Sparkles size={15} /> 目前行程</div>
          {currentItem ? (
            <>
              <div className="live-time">{formatTimeRange(currentItem)}</div>
              <h2>{currentItem.title}</h2>
              <p>{currentItem.notes ?? currentItem.category ?? "正在進行中"}</p>
            </>
          ) : progress.status === "complete" ? (
            <>
              <div className="completion-icon"><CircleCheck size={26} /></div>
              <h2>今日行程完成</h2>
              <p>可以慢慢休息，明天再出發。</p>
            </>
          ) : (
            <>
              <div className="live-time">{reference.day.items[0]?.startTime ?? "—"}</div>
              <h2>今天第一站</h2>
              <p>{reference.day.items[0]?.title ?? "尚未安排行程"}</p>
            </>
          )}
        </div>

        <div className="live-card next-card">
          <div className="card-label"><ChevronRight size={15} /> {isBeforeTrip ? "旅程第一站" : "下一個行程"}</div>
          {nextItem ? (
            <>
              <div className="next-heading"><div className="live-time">{nextItem.startTime}</div>{nextDate && <span>{formatDistanceUntil(nextDate, now)}</span>}</div>
              <h2>{nextItem.title}</h2>
              <div className="next-details">
                {nextItem.address && <p><MapPin size={15} />{nextItem.address}</p>}
                {nextItem.businessHours && <p><Clock3 size={15} />{nextItem.businessHours}</p>}
                {nextItem.transportMode && <TransportChip mode={nextItem.transportMode} />}
              </div>
              {(nextItem.address || nextItem.phone) && <div className="next-actions"><AddressActions address={nextItem.address} phone={nextItem.phone} />{nextItem.address && <AmapButton title={nextItem.title} address={nextItem.address} />}</div>}
            </>
          ) : (
            <div className="empty-message">今天沒有更多排程。</div>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">THE DAY</span><h2>今天時間軸</h2></div><button className="text-button" onClick={() => onGoToSchedule(reference.day.dayNumber)}>查看完整行程 <ChevronRight size={16} /></button></div>
        <div className="mini-timeline">
          {reference.day.items.slice(0, 5).map((item, index) => (
            <div className={`mini-timeline-row ${item.completed ? "is-complete" : ""}`} key={item.id}>
              <div className="mini-time">{item.startTime}</div>
              <div className="mini-line"><span className="timeline-dot" />{index < Math.min(reference.day.items.length - 1, 4) && <span className="timeline-connector" />}</div>
              <div className="mini-content"><strong>{item.title}</strong><span>{item.category ?? "行程"}</span></div>
              {item.completed && <Check size={16} className="mini-check" />}
            </div>
          ))}
        </div>
      </section>

      <TransitCard segments={reference.day.transitSegments} compact />
    </div>
  );
}

function PreTripPreparationCard({
  tasks,
  managerMode,
  onToggleTask,
  onGoToTrip
}: {
  tasks: TripTask[];
  managerMode: boolean;
  onToggleTask: (taskId: string) => void;
  onGoToTrip: () => void;
}) {
  const completed = tasks.filter((task) => task.completed).length;
  const nextTask = tasks.find((task) => !task.completed);
  return (
    <section className="pretrip-card">
      <div className="pretrip-header"><div className="pretrip-title"><div className="info-card-icon task-icon"><ClipboardCheck size={21} /></div><div><span className="eyebrow">BEFORE YOU GO</span><h2>行前準備</h2><p>{completed} / {tasks.length} 項完成</p></div></div><button className="text-button" onClick={onGoToTrip}>{managerMode ? <Pencil size={15} /> : null}{managerMode ? "編輯清單" : "查看清單"} <ChevronRight size={16} /></button></div>
      {nextTask ? (
        <div className="pretrip-next"><button className="task-check" aria-label={managerMode ? `標記完成：${nextTask.title}` : nextTask.title} disabled={!managerMode} onClick={() => managerMode && onToggleTask(nextTask.id)} /><div><span>下一項準備</span><strong>{nextTask.title}</strong></div>{managerMode && <span className="pretrip-hint">點擊圓圈完成</span>}</div>
      ) : (
        <div className="pretrip-complete"><CircleCheck size={20} /><strong>行前準備已全部完成</strong><span>可以安心等待出發。</span></div>
      )}
    </section>
  );
}

function SchedulePage({
  trip,
  selectedDay,
  managerMode,
  onSelectDay,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleComplete,
  onReorder,
  onViewTraffic
}: {
  trip: TripDocument;
  selectedDay: TripDay;
  managerMode: boolean;
  onSelectDay: (day: number) => void;
  onAdd: () => void;
  onEdit: (dayId: string, item: ItineraryItem) => void;
  onDelete: (dayId: string, itemId: string) => void;
  onDuplicate: (dayId: string, item: ItineraryItem) => void;
  onToggleComplete: (dayId: string, itemId: string) => void;
  onReorder: (dayId: string, sourceId: string, targetId: string) => void;
  onViewTraffic: () => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  return (
    <div className="page-stack schedule-page">
      <PageIntro eyebrow="ITINERARY" title="五日行程" description="按天查看時間軸，下一步與交通方式一眼就懂。" />
      <div className="day-tabs" role="tablist" aria-label="選擇行程日">
        {trip.days.map((day) => (
          <button key={day.id} className={day.dayNumber === selectedDay.dayNumber ? "is-selected" : ""} onClick={() => onSelectDay(day.dayNumber)} role="tab" aria-selected={day.dayNumber === selectedDay.dayNumber} aria-label={`Day ${day.dayNumber} ${formatMonthDay(day.date)} ${formatWeekday(day.date)}`}>
            <span>Day {day.dayNumber}</span><small><span>{formatMonthDay(day.date)}</span><span className="day-tab-weekday">{formatWeekday(day.date)}</span></small>
          </button>
        ))}
      </div>

      <section className="day-overview-card">
        <div><span className="eyebrow">{formatDate(selectedDay.date)}</span><h1>Day {selectedDay.dayNumber}</h1><h2>{selectedDay.title}</h2><p>{selectedDay.overview}</p></div>
        {managerMode && <button className="primary-button compact-button" onClick={onAdd}><Plus size={17} /> 新增行程</button>}
      </section>

      <TransitCard segments={selectedDay.transitSegments} />

      <section className="timeline-section">
        <div className="timeline-header"><div><span className="eyebrow">SCHEDULE</span><h2>時間軸</h2></div>{managerMode && <span className="drag-hint"><GripVertical size={15} /> 可拖曳排序</span>}</div>
        <div className="timeline-list">
          {selectedDay.items.map((item) => (
            <ItineraryCard
              key={item.id}
              item={item}
              managerMode={managerMode}
              isDragging={draggedId === item.id}
              onDragStart={() => setDraggedId(item.id)}
              onDragEnd={() => setDraggedId(null)}
              onDrop={() => {
                if (draggedId) onReorder(selectedDay.id, draggedId, item.id);
                setDraggedId(null);
              }}
              onEdit={() => onEdit(selectedDay.id, item)}
              onDelete={() => onDelete(selectedDay.id, item.id)}
              onDuplicate={() => onDuplicate(selectedDay.id, item)}
              onToggleComplete={() => onToggleComplete(selectedDay.id, item.id)}
              onViewTraffic={onViewTraffic}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ItineraryCard({
  item,
  managerMode,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleComplete,
  onViewTraffic
}: {
  item: ItineraryItem;
  managerMode: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleComplete: () => void;
  onViewTraffic: () => void;
}) {
  return (
    <article
      className={`itinerary-row ${isDragging ? "is-dragging" : ""} ${item.completed ? "is-complete" : ""}`}
      draggable={managerMode}
      onDragStart={(event) => {
        if (!managerMode) return;
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => managerMode && event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div className="timeline-time-column"><span className="timeline-time">{formatTimeRange(item)}</span><span className="timeline-node" /></div>
      <div className="itinerary-card">
        <div className="itinerary-card-topline">
          <div className="item-tags"><span className="category-tag">{item.category ?? "行程"}</span>{item.flexible && <span className="flexible-tag">留白</span>}{item.transportMode && <TransportChip mode={item.transportMode} />}</div>
          {managerMode && <div className="item-admin-actions"><button className="small-icon-button drag-button" aria-label="拖曳排序"><GripVertical size={17} /></button><button className="small-icon-button" aria-label="編輯行程" onClick={onEdit}><Pencil size={15} /></button><button className="small-icon-button danger" aria-label="刪除行程" onClick={onDelete}><Trash2 size={15} /></button></div>}
        </div>
        <h3>{item.title}</h3>
        <div className="item-detail-grid">
          {item.address && <div className="detail-line"><MapPin size={16} /><span>{item.address}</span></div>}
          {item.businessHours && <div className="detail-line"><Clock3 size={16} /><span>{item.businessHours}</span></div>}
          {item.duration && <div className="detail-line"><Sparkles size={16} /><span>停留 {item.duration}</span></div>}
          {item.transportNote && <div className="detail-line"><Navigation size={16} /><span>{item.transportNote}</span></div>}
        </div>
        {item.notes && <p className="item-notes">{item.notes}</p>}
        <div className="item-actions">
          {item.address && <AmapButton title={item.title} address={item.address} />}
          <AddressActions address={item.address} phone={item.phone} />
          <button className="text-action" onClick={onViewTraffic}><Route size={15} />查看交通</button>
          {managerMode && <><button className={`text-action ${item.completed ? "is-completed" : ""}`} onClick={onToggleComplete}>{item.completed ? <Check size={15} /> : <CircleCheck size={15} />}{item.completed ? "已完成" : "標記完成"}</button><button className="text-action" onClick={onDuplicate}><Copy size={15} />複製</button></>}
        </div>
      </div>
    </article>
  );
}

function TransitCard({ segments, compact = false }: { segments: TransitSegment[]; compact?: boolean }) {
  const [expanded, setExpanded] = useState(!compact);
  return (
    <section className={`transit-card ${compact ? "is-compact" : ""}`}>
      <button className={`transit-heading transit-toggle ${expanded ? "is-expanded" : ""}`} aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
        <span><span className="eyebrow">GETTING AROUND</span><strong>交通卡</strong></span>
        <span className="transit-toggle-action"><span>{expanded ? "收合" : `展開 ${segments.length} 段`}</span><ChevronDown size={19} /></span>
      </button>
      {expanded && <div className="transit-list">
          {segments.map((segment) => (
            <div className="transit-segment" key={segment.id}>
              <div className={`transport-symbol mode-${segment.mode}`}>{TRANSPORT_EMOJI[segment.mode]}</div>
              <div className="transit-route"><strong>{segment.from}</strong><ChevronRight size={15} /><strong>{segment.to}</strong><span>{segment.detail ?? TRANSPORT_LABELS[segment.mode]}{segment.duration ? ` · ${segment.duration}` : ""}</span></div>
              <span className="transport-label">{TRANSPORT_LABELS[segment.mode]}</span>
            </div>
          ))}
        </div>}
      {!expanded && <p className="transit-collapsed-summary">{segments.length ? `共 ${segments.length} 段交通，點擊查看完整路線` : "尚未安排交通"}</p>}
    </section>
  );
}

function EatPage({
  trip,
  managerMode,
  onAddRestaurant,
  onEditRestaurant,
  onDeleteRestaurant,
  onAddToSchedule,
  onRemoveFromSchedule
}: {
  trip: TripDocument;
  managerMode: boolean;
  onAddRestaurant: () => void;
  onEditRestaurant: (restaurant: Restaurant) => void;
  onDeleteRestaurant: (restaurantId: string) => void;
  onAddToSchedule: (restaurant: Restaurant) => void;
  onRemoveFromSchedule: (restaurant: Restaurant, dayId: string, itemId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = trip.restaurants.filter((restaurant) => `${restaurant.name} ${restaurant.category} ${restaurant.area ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="page-stack eat-page">
      <PageIntro eyebrow="WANT TO EAT" title="想吃" description="先收進口袋名單，需要時再放進正式行程。" action={managerMode ? <button className="primary-button compact-button" onClick={onAddRestaurant}><Plus size={17} /> 新增餐廳</button> : undefined} />
      <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋餐廳、分類或區域" aria-label="搜尋餐廳" /></div>
      <div className="restaurant-grid">
        {filtered.map((restaurant) => {
          const assignment = findRestaurantAssignment(trip, restaurant.id);
          return <RestaurantCard key={restaurant.id} restaurant={restaurant} assignment={assignment} managerMode={managerMode} onEdit={() => onEditRestaurant(restaurant)} onDelete={() => onDeleteRestaurant(restaurant.id)} onAddToSchedule={() => onAddToSchedule(restaurant)} onRemoveFromSchedule={() => assignment && onRemoveFromSchedule(restaurant, assignment.day.id, assignment.item.id)} />;
        })}
      </div>
      {filtered.length === 0 && <EmptyState icon={<Utensils size={25} />} title="找不到這間餐廳" description="可以換個關鍵字，或在管理模式新增一筆。" />}
    </div>
  );
}

function RestaurantCard({
  restaurant,
  assignment,
  managerMode,
  onEdit,
  onDelete,
  onAddToSchedule,
  onRemoveFromSchedule
}: {
  restaurant: Restaurant;
  assignment?: { day: TripDay; item: ItineraryItem };
  managerMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddToSchedule: () => void;
  onRemoveFromSchedule: () => void;
}) {
  return (
    <article className="restaurant-card">
      <div className="restaurant-card-topline"><span className="category-tag">{restaurant.category}</span>{assignment && <span className="scheduled-tag"><Check size={13} /> Day {assignment.day.dayNumber} · {formatMonthDay(assignment.day.date)} · {assignment.item.startTime}</span>}{managerMode && <div className="item-admin-actions"><button className="small-icon-button" aria-label="編輯餐廳" onClick={onEdit}><Pencil size={15} /></button><button className="small-icon-button danger" aria-label="刪除餐廳" onClick={onDelete}><Trash2 size={15} /></button></div>}</div>
      <h2>{restaurant.name}</h2>
      <div className="restaurant-details"><div className="detail-line"><MapPin size={16} /><span>{restaurant.address ?? "地址待補資料"}</span></div><div className="detail-line"><Clock3 size={16} /><span>{restaurant.businessHours ?? "營業時間待補資料"}</span></div><div className="detail-line"><Map size={16} /><span>{restaurant.area ?? "所在區域待補資料"}</span></div></div>
      {restaurant.notes && <p className="item-notes">{restaurant.notes}</p>}
      <div className="restaurant-actions"><AmapButton title={restaurant.name} address={restaurant.address} /><AddressActions address={restaurant.address} phone={restaurant.phone} /><button className="text-action" onClick={() => openMeituan(restaurant.name)}><Search size={15} />美團搜尋</button>{!assignment && <button className="text-action strong-action" onClick={onAddToSchedule}><Plus size={15} />加入行程</button>}{assignment && managerMode && <button className="text-action strong-action" onClick={onRemoveFromSchedule}><RotateCcw size={15} />移回備選</button>}</div>
      <button className="copy-search-link" onClick={async () => { const copied = await copyText(restaurant.name); if (copied) window.alert(`已複製「${restaurant.name}」，可貼到美團搜尋。`); }}><Clipboard size={14} />無法開啟美團？一鍵複製名稱</button>
    </article>
  );
}

function TripInfoPage({
  trip,
  managerMode,
  onEdit,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  travelTools,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onExportExpenses,
  onAddAttachment,
  onDownloadAttachment,
  onDeleteAttachment
}: {
  trip: TripDocument;
  managerMode: boolean;
  onEdit: () => void;
  onAddTask: () => void;
  onEditTask: (task: TripTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  travelTools: TravelToolsData | null;
  onAddExpense: () => void;
  onEditExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
  onExportExpenses: () => void;
  onAddAttachment: () => void;
  onDownloadAttachment: (attachment: AttachmentMeta) => void;
  onDeleteAttachment: (attachment: AttachmentMeta) => void;
}) {
  const { hotel, flights, members } = trip.info;
  return (
    <div className="page-stack trip-page">
      <PageIntro eyebrow="TRIP INFO" title="旅程" description="重要資料集中在這裡，出發前與路上都能快速查看。" action={managerMode ? <button className="secondary-button compact-button" onClick={onEdit}><Pencil size={16} /> 編輯資料</button> : undefined} />
      <section className="info-card hotel-card"><div className="info-card-icon"><Hotel size={22} /></div><div className="info-card-content"><span className="eyebrow">HOTEL</span><h2>{hotel.name}</h2><p>{hotel.address}</p>{hotel.phone && <p className="contact-line"><span>電話</span><a href={`tel:${hotel.phone}`}>{hotel.phone}</a></p>}<div className="hotel-actions"><AmapButton title={hotel.name} address={hotel.address} /><AddressActions address={hotel.address} phone={hotel.phone} /></div></div></section>
      <section className="info-card"><div className="info-card-icon flight-icon"><Plane size={22} /></div><div className="info-card-content"><span className="eyebrow">FLIGHTS</span><h2>航班</h2><div className="flight-list">{flights.map((flight) => <div className="flight-row" key={flight.id}><span className="flight-label">{flight.label}</span><div><strong>{flight.flightNumber ?? "航班待補"}</strong><span>{formatDate(flight.date)} · {flight.time}</span><span>{flight.route}</span></div></div>)}</div></div></section>
      <section className="quick-links-card"><div className="section-heading"><div><span className="eyebrow">QUICK NAVIGATION</span><h2>快速導航</h2></div><Navigation size={19} /></div><div className="quick-link-list"><AmapButton title={hotel.name} address={hotel.address} label="飯店高德導航" full /><AmapButton title={trip.info.airport} address={trip.info.airport} label="浦東機場導航" full /><AmapButton title={trip.info.maglevStation} label="龍陽路磁浮站導航" full /></div></section>
      {members.length > 0 && <section className="info-card members-card"><div className="info-card-icon"><Users size={22} /></div><div className="info-card-content"><span className="eyebrow">TRAVEL PARTY</span><h2>成員</h2><div className="member-list">{members.map((member) => <span key={member}>{member}</span>)}</div></div></section>}
      <TaskChecklist tasks={trip.tasks} managerMode={managerMode} onAdd={onAddTask} onEdit={onEditTask} onDelete={onDeleteTask} onToggle={onToggleTask} />
      {managerMode && travelTools && <PrivateTravelTools tools={travelTools} onAddExpense={onAddExpense} onEditExpense={onEditExpense} onDeleteExpense={onDeleteExpense} onExportExpenses={onExportExpenses} onAddAttachment={onAddAttachment} onDownloadAttachment={onDownloadAttachment} onDeleteAttachment={onDeleteAttachment} />}
    </div>
  );
}

const TASK_CATEGORIES: TripTaskCategory[] = ["證件", "網路", "行李", "行程", "返程", "其他"];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ["餐飲", "交通", "住宿", "門票", "購物", "其他"];
const ATTACHMENT_CATEGORIES: AttachmentCategory[] = ["機票／登機證", "訂位資訊", "付款 QR Code", "其他"];

function TaskChecklist({
  tasks,
  managerMode,
  onAdd,
  onEdit,
  onDelete,
  onToggle
}: {
  tasks: TripTask[];
  managerMode: boolean;
  onAdd: () => void;
  onEdit: (task: TripTask) => void;
  onDelete: (taskId: string) => void;
  onToggle: (taskId: string) => void;
}) {
  const completed = tasks.filter((task) => task.completed).length;
  return (
    <section className="tool-card task-card">
      <div className="tool-card-header">
        <div className="tool-card-title"><div className="info-card-icon task-icon"><ClipboardCheck size={21} /></div><div><span className="eyebrow">BEFORE YOU GO</span><h2>家庭任務清單</h2><p>{completed} / {tasks.length} 項已完成</p></div></div>
        {managerMode && <button className="secondary-button compact-button" onClick={onAdd}><Plus size={16} /> 新增任務</button>}
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <div className={`task-row ${task.completed ? "is-complete" : ""}`} key={task.id}>
            <button className="task-check" aria-label={task.completed ? `取消完成：${task.title}` : `標記完成：${task.title}`} aria-pressed={task.completed} onClick={() => managerMode && onToggle(task.id)} disabled={!managerMode}>{task.completed && <Check size={16} />}</button>
            <div className="task-copy"><strong>{task.title}</strong><span>{task.category}{task.assignee ? ` · ${task.assignee}` : ""}{task.notes ? ` · ${task.notes}` : ""}</span></div>
            {managerMode && <div className="item-admin-actions"><button className="small-icon-button" aria-label="編輯任務" onClick={() => onEdit(task)}><Pencil size={14} /></button><button className="small-icon-button danger" aria-label="刪除任務" onClick={() => onDelete(task.id)}><Trash2 size={14} /></button></div>}
          </div>
        ))}
        {tasks.length === 0 && <p className="tool-empty">尚未建立任務。</p>}
      </div>
      <p className="tool-note">任務會跟著行程版本發布；家人可以查看管理者發布的最新狀態。</p>
    </section>
  );
}

function PrivateTravelTools({
  tools,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onExportExpenses,
  onAddAttachment,
  onDownloadAttachment,
  onDeleteAttachment
}: {
  tools: TravelToolsData;
  onAddExpense: () => void;
  onEditExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
  onExportExpenses: () => void;
  onAddAttachment: () => void;
  onDownloadAttachment: (attachment: AttachmentMeta) => void;
  onDeleteAttachment: (attachment: AttachmentMeta) => void;
}) {
  const summary = summarizeExpenses(tools.expenses);
  return (
    <section className="private-tools-section">
      <div className="section-heading"><div><span className="eyebrow">LOCAL ONLY</span><h2>旅行工具</h2><p className="section-description">費用與票券只保存在這台管理裝置，不會寫入公開行程。</p></div><WalletCards size={21} /></div>
      <div className="private-tools-grid">
        <section className="tool-card private-tool-card">
          <div className="tool-card-header"><div className="tool-card-title"><div className="info-card-icon expense-icon"><WalletCards size={20} /></div><div><span className="eyebrow">EXPENSES</span><h3>費用記帳</h3><p>人民幣總支出</p></div></div><div className="tool-header-actions"><button className="small-icon-button" aria-label="匯出旅費" onClick={onExportExpenses}><FileJson size={16} /></button><button className="secondary-button compact-button" onClick={onAddExpense}><Plus size={16} /> 新增</button></div></div>
          <div className="expense-total"><strong>¥ {summary.total.toFixed(2)}</strong><span>{tools.expenses.length} 筆記錄</span></div>
          {Object.keys(summary.byPayer).length > 0 && <div className="expense-breakdown">{Object.entries(summary.byPayer).map(([payer, amount]) => <span key={payer}>{payer} ¥{amount.toFixed(2)}</span>)}</div>}
          <div className="expense-list">
            {[...tools.expenses].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`)).map((expense) => (
              <div className="expense-row" key={expense.id}><div className="expense-copy"><strong>{expense.title}</strong><span>{expense.date} · {expense.category} · {expense.payer}</span>{expense.note && <small>{expense.note}</small>}</div><strong className="expense-amount">¥{expense.amountCny.toFixed(2)}</strong><div className="item-admin-actions"><button className="small-icon-button" aria-label="編輯旅費" onClick={() => onEditExpense(expense)}><Pencil size={13} /></button><button className="small-icon-button danger" aria-label="刪除旅費" onClick={() => onDeleteExpense(expense.id)}><Trash2 size={13} /></button></div></div>
            ))}
            {tools.expenses.length === 0 && <p className="tool-empty">還沒有旅費記錄，出發後可在這裡快速登記。</p>}
          </div>
        </section>

        <section className="tool-card private-tool-card">
          <div className="tool-card-header"><div className="tool-card-title"><div className="info-card-icon attachment-icon"><Paperclip size={20} /></div><div><span className="eyebrow">TICKETS & FILES</span><h3>票券與截圖</h3><p>本機保存，不公開上傳</p></div></div><button className="secondary-button compact-button" onClick={onAddAttachment}><Upload size={16} /> 新增附件</button></div>
          <div className="attachment-list">
            {tools.attachments.map((attachment) => <div className="attachment-row" key={attachment.id}><div className="attachment-icon-box">{attachment.mimeType.startsWith("image/") ? <FileText size={18} /> : <FileJson size={18} />}</div><div className="attachment-copy"><strong title={attachment.name}>{attachment.name}</strong><span>{attachment.category} · {formatFileSize(attachment.size)}</span>{attachment.note && <small>{attachment.note}</small>}</div><div className="item-admin-actions"><button className="small-icon-button" aria-label={`下載 ${attachment.name}`} onClick={() => onDownloadAttachment(attachment)}><Download size={14} /></button><button className="small-icon-button danger" aria-label={`刪除 ${attachment.name}`} onClick={() => onDeleteAttachment(attachment)}><Trash2 size={14} /></button></div></div>)}
            {tools.attachments.length === 0 && <p className="tool-empty">可加入機票、訂位截圖或付款 QR Code。</p>}
          </div>
          <p className="tool-note">附件放在瀏覽器的 IndexedDB；清除網站資料或換裝置前，請先下載保留。</p>
        </section>
      </div>
    </section>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: JSX.Element }) {
  return <div className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function BottomNavigation({ activePage, onNavigate }: { activePage: Page; onNavigate: (page: Page) => void }) {
  return <nav className="bottom-nav" aria-label="主要導覽">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={activePage === id ? "is-active" : ""} onClick={() => onNavigate(id)} aria-current={activePage === id ? "page" : undefined}><Icon size={20} strokeWidth={activePage === id ? 2.4 : 1.9} /><span>{label}</span></button>)}</nav>;
}

function AmapButton({ title, address, label = "高德導航", full = false }: { title: string; address?: string; label?: string; full?: boolean }) {
  return <button className={`amap-button ${full ? "is-full" : ""}`} onClick={() => openAmap(title, address)}><Navigation size={15} />{label}<ExternalLink size={13} /></button>;
}

function AddressActions({ address, phone }: { address?: string; phone?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    const success = await copyText(address);
    if (!success) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  if (!address && !phone) return null;
  return (
    <div className="address-actions">
      {address && <button className="text-action" onClick={handleCopy}><Clipboard size={15} />{copied ? "已複製地址" : "複製地址"}</button>}
      {phone && <a className="text-action phone-action" href={`tel:${phone.replace(/[^+\d]/g, "")}`}><PhoneCall size={15} />打電話</a>}
    </div>
  );
}

function TransportChip({ mode }: { mode: TransportMode }) {
  return <span className={`transport-chip mode-${mode}`}><span>{TRANSPORT_EMOJI[mode]}</span>{TRANSPORT_LABELS[mode]}</span>;
}

function EmptyState({ icon, title, description }: { icon: JSX.Element; title: string; description: string }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{description}</p></div>;
}

function ManagerDrawer({
  trip,
  published,
  isDirty,
  lastRemoteSyncAt,
  lastBackupAt,
  onClose,
  onPublish,
  onDownloadDraft,
  onBackup,
  onImport,
  onRestoreBackup,
  onRestoreVersion,
  onExitManager
}: {
  trip: TripDocument;
  published: TripDocument;
  isDirty: boolean;
  lastRemoteSyncAt?: string;
  lastBackupAt?: string;
  onClose: () => void;
  onPublish: (note: string) => void;
  onDownloadDraft: () => void;
  onBackup: () => void;
  onImport: () => void;
  onRestoreBackup: () => void;
  onRestoreVersion: (version: TripVersion) => void;
  onExitManager: () => void;
}) {
  const [note, setNote] = useState("管理者發布最新版");
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="manager-drawer" role="dialog" aria-modal="true" aria-label="管理工具"><div className="drawer-header"><div><span className="eyebrow">LOCAL ADMIN</span><h2>管理工具</h2></div><button className="icon-button" onClick={onClose} aria-label="關閉管理工具"><X size={20} /></button></div><div className="drawer-scroll"><section className={`publish-status ${isDirty ? "is-dirty" : ""}`}><div className="publish-status-icon">{isDirty ? <CloudUpload size={21} /> : <CircleCheck size={21} />}</div><div><strong>{isDirty ? "尚未發布" : "已是最新發布版本"}</strong><span>{isDirty ? "家人仍只會看到已發布版本" : `目前 ${published.versions[published.versions.length - 1]?.label ?? "V1.0"}`}</span></div></section><div className="publish-form"><label htmlFor="version-note">發布備註</label><input id="version-note" value={note} onChange={(event) => setNote(event.target.value)} /><button className="primary-button full-button" disabled={!isDirty} onClick={() => onPublish(note)}><CloudUpload size={17} />發布最新版並下載 trip.json</button><p className="helper-text">下載後請將檔案覆蓋 GitHub 專案的 <code>public/trip.json</code>，再提交部署；前端不保存 Token。</p></div><div className="drawer-actions"><button className="secondary-button" onClick={onDownloadDraft}><Download size={16} />下載草稿</button><button className="secondary-button" onClick={onBackup}><Download size={16} />下載備份</button><button className="secondary-button" onClick={onImport}><Upload size={16} />匯入 JSON</button><button className="secondary-button" onClick={onRestoreBackup}><RotateCcw size={16} />還原備份</button></div>{lastBackupAt && <p className="last-action"><Save size={14} />上次備份：{formatDateTime(lastBackupAt)}</p>}<section className="version-section"><div className="section-heading"><div><span className="eyebrow">HISTORY</span><h3>版本紀錄</h3></div><History size={18} /></div><div className="version-list">{[...trip.versions].reverse().map((version) => <div className="version-row" key={version.id}><div><strong>{version.label}</strong><span>{formatDateTime(version.createdAt)}</span><small>{version.note}</small></div><button className="text-action" onClick={() => onRestoreVersion(version)}><RotateCcw size={14} />還原草稿</button></div>)}</div></section><section className="sync-note"><Info size={16} /><p>目前是單一管理者＋家人唯讀模式。草稿只在這台裝置保存；發布檔案要更新 GitHub Pages，家人才會在其他手機看到最新版。</p>{lastRemoteSyncAt && <small>最近載入發布版本：{formatDateTime(lastRemoteSyncAt)}</small>}</section></div><div className="drawer-footer"><button className="quiet-button" onClick={onExitManager}><LockKeyholeIcon />退出管理模式</button></div></aside></div>;
}

function LockKeyholeIcon() {
  return <span className="lock-glyph">⌁</span>;
}

function ItemEditorDialog({ day, item, onClose, onSave }: { day: TripDay; item?: ItineraryItem; onClose: () => void; onSave: (item: ItineraryItem) => void }) {
  const [form, setForm] = useState<ItineraryItem>(() => ({ id: item?.id ?? makeId("item"), startTime: item?.startTime ?? "09:00", endTime: item?.endTime, title: item?.title ?? "", address: item?.address, phone: item?.phone, businessHours: item?.businessHours, duration: item?.duration, transportMode: item?.transportMode, transportNote: item?.transportNote, notes: item?.notes, category: item?.category ?? "行程", flexible: item?.flexible ?? false, completed: item?.completed ?? false, sourceRestaurantId: item?.sourceRestaurantId }));
  const setField = <K extends keyof ItineraryItem>(field: K, value: ItineraryItem[K]) => setForm((current) => ({ ...current, [field]: value }));
  return <Modal title={item ? "編輯行程" : "新增行程"} onClose={onClose}><form className="form-stack" onSubmit={(event: FormEvent) => { event.preventDefault(); if (!form.title.trim()) return; onSave({ ...form, title: form.title.trim(), address: form.address?.trim() || undefined, phone: form.phone?.trim() || undefined, notes: form.notes?.trim() || undefined }); }}><div className="form-grid two-columns"><label>開始時間<input type="time" value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} required /></label><label>結束時間<input type="time" value={form.endTime ?? ""} onChange={(event) => setField("endTime", event.target.value || undefined)} /></label></div><label>地點名稱<input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="例如：外灘夜景" required /></label><div className="form-grid two-columns"><label>分類<input value={form.category ?? ""} onChange={(event) => setField("category", event.target.value)} placeholder="景點／餐廳／交通" /></label><label>建議停留時間<input value={form.duration ?? ""} onChange={(event) => setField("duration", event.target.value || undefined)} placeholder="約 60 分鐘" /></label></div><label>地址<input value={form.address ?? ""} onChange={(event) => setField("address", event.target.value || undefined)} placeholder="有地址就能使用高德導航" /></label><label>電話<input value={form.phone ?? ""} onChange={(event) => setField("phone", event.target.value || undefined)} placeholder="有電話就能一鍵撥號" /></label><label>營業時間<input value={form.businessHours ?? ""} onChange={(event) => setField("businessHours", event.target.value || undefined)} placeholder="例如：24 小時營業" /></label><label>交通方式<select value={form.transportMode ?? ""} onChange={(event) => setField("transportMode", (event.target.value || undefined) as TransportMode | undefined)}><option value="">不指定</option>{Object.entries(TRANSPORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>交通補充<input value={form.transportNote ?? ""} onChange={(event) => setField("transportNote", event.target.value || undefined)} placeholder="例如：地鐵 2 號線" /></label><label>備註<textarea value={form.notes ?? ""} onChange={(event) => setField("notes", event.target.value || undefined)} rows={3} placeholder="給家人的提醒、訂位或外送備註" /></label><label className="check-row"><input type="checkbox" checked={form.flexible ?? false} onChange={(event) => setField("flexible", event.target.checked)} />標記為彈性／留白行程</label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button"><Save size={16} />儲存到草稿</button></div></form><p className="modal-context">目前編輯：Day {day.dayNumber} · {formatDate(day.date)}</p></Modal>;
}

function AddRestaurantDialog({ restaurant, days, defaultDay, onClose, onSave }: { restaurant: Restaurant; days: TripDay[]; defaultDay: number; onClose: () => void; onSave: (restaurant: Restaurant, dayId: string, startTime: string, notes: string) => void }) {
  const [dayId, setDayId] = useState(days.find((day) => day.dayNumber === defaultDay)?.id ?? days[0]?.id ?? "");
  const [startTime, setStartTime] = useState("12:00");
  const [notes, setNotes] = useState(restaurant.notes ?? "");
  return <Modal title={`加入行程 · ${restaurant.name}`} onClose={onClose}><form className="form-stack" onSubmit={(event: FormEvent) => { event.preventDefault(); onSave(restaurant, dayId, startTime, notes); }}><label>安排在哪一天<select value={dayId} onChange={(event) => setDayId(event.target.value)}>{days.map((day) => <option key={day.id} value={day.id}>Day {day.dayNumber} · {formatDate(day.date)}</option>)}</select></label><label>時間<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></label><div className="confirm-place"><MapPin size={17} /><div><strong>{restaurant.name}</strong><span>{restaurant.address ?? "地址待補資料"}</span></div></div><label>備註<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="例如：先在美團確認分店" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button"><Plus size={16} />加入草稿</button></div></form></Modal>;
}

function RestaurantEditorDialog({ restaurant, onClose, onSave }: { restaurant?: Restaurant; onClose: () => void; onSave: (restaurant: Restaurant) => void }) {
  const [form, setForm] = useState<Restaurant>(() => ({ id: restaurant?.id ?? makeId("restaurant"), name: restaurant?.name ?? "", category: restaurant?.category ?? "餐廳", address: restaurant?.address, phone: restaurant?.phone, businessHours: restaurant?.businessHours, area: restaurant?.area, notes: restaurant?.notes }));
  const setField = <K extends keyof Restaurant>(field: K, value: Restaurant[K]) => setForm((current) => ({ ...current, [field]: value }));
  return <Modal title={restaurant ? "編輯備選餐廳" : "新增備選餐廳"} onClose={onClose}><form className="form-stack" onSubmit={(event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return; onSave({ ...form, name: form.name.trim(), address: form.address?.trim() || undefined, phone: form.phone?.trim() || undefined, businessHours: form.businessHours?.trim() || undefined, area: form.area?.trim() || undefined, notes: form.notes?.trim() || undefined }); }}><label>餐廳名稱<input value={form.name} onChange={(event) => setField("name", event.target.value)} required /></label><div className="form-grid two-columns"><label>分類<input value={form.category} onChange={(event) => setField("category", event.target.value)} /></label><label>所在區域<input value={form.area ?? ""} onChange={(event) => setField("area", event.target.value || undefined)} /></label></div><label>地址<input value={form.address ?? ""} onChange={(event) => setField("address", event.target.value || undefined)} /></label><label>電話<input value={form.phone ?? ""} onChange={(event) => setField("phone", event.target.value || undefined)} placeholder="有電話就能一鍵撥號" /></label><label>營業時間<input value={form.businessHours ?? ""} onChange={(event) => setField("businessHours", event.target.value || undefined)} /></label><label>備註<textarea value={form.notes ?? ""} onChange={(event) => setField("notes", event.target.value || undefined)} rows={3} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button"><Save size={16} />儲存到草稿</button></div></form></Modal>;
}

function TripInfoEditorDialog({ info, onClose, onSave }: { info: TripInfo; onClose: () => void; onSave: (info: TripInfo) => void }) {
  const [form, setForm] = useState<TripInfo>(() => clone(info));
  return <Modal title="編輯旅程資料" onClose={onClose}><form className="form-stack" onSubmit={(event: FormEvent) => { event.preventDefault(); onSave(form); }}><div className="form-section-label">飯店</div><label>名稱<input value={form.hotel.name} onChange={(event) => setForm((current) => ({ ...current, hotel: { ...current.hotel, name: event.target.value } }))} /></label><label>地址<input value={form.hotel.address} onChange={(event) => setForm((current) => ({ ...current, hotel: { ...current.hotel, address: event.target.value } }))} /></label><label>電話<input value={form.hotel.phone ?? ""} placeholder="例如 +86-21-63522888" onChange={(event) => setForm((current) => ({ ...current, hotel: { ...current.hotel, phone: event.target.value || undefined } }))} /></label><div className="form-section-label">航班</div>{form.flights.map((flight, index) => <div className="flight-edit-row" key={flight.id}><strong>{flight.label}</strong><input aria-label={`${flight.label}航班號`} value={flight.flightNumber ?? ""} placeholder="航班號" onChange={(event) => setForm((current) => ({ ...current, flights: current.flights.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, flightNumber: event.target.value || undefined } : candidate) }))} /><input aria-label={`${flight.label}時間`} value={flight.time} placeholder="時間" onChange={(event) => setForm((current) => ({ ...current, flights: current.flights.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, time: event.target.value } : candidate) }))} /><input aria-label={`${flight.label}路線`} value={flight.route} placeholder="路線" onChange={(event) => setForm((current) => ({ ...current, flights: current.flights.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, route: event.target.value } : candidate) }))} /></div>)}<label>成員（每行一位）<textarea rows={4} value={form.members.join("\n")} onChange={(event) => setForm((current) => ({ ...current, members: event.target.value.split("\n").map((member) => member.trim()).filter(Boolean) }))} /></label><label>機場<input value={form.airport} onChange={(event) => setForm((current) => ({ ...current, airport: event.target.value }))} /></label><label>磁浮站<input value={form.maglevStation} onChange={(event) => setForm((current) => ({ ...current, maglevStation: event.target.value }))} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button"><Save size={16} />儲存到草稿</button></div></form></Modal>;
}

function TaskEditorDialog({ task, onClose, onSave }: { task?: TripTask; onClose: () => void; onSave: (task: TripTask) => void }) {
  const [form, setForm] = useState<TripTask>(() => ({
    id: task?.id ?? makeId("task"),
    title: task?.title ?? "",
    category: task?.category ?? "其他",
    completed: task?.completed ?? false,
    assignee: task?.assignee,
    notes: task?.notes
  }));
  const setField = <K extends keyof TripTask>(field: K, value: TripTask[K]) => setForm((current) => ({ ...current, [field]: value }));
  return <Modal title={task ? "編輯家庭任務" : "新增家庭任務"} onClose={onClose}><form className="form-stack" onSubmit={(event: FormEvent) => { event.preventDefault(); if (!form.title.trim()) return; onSave({ ...form, title: form.title.trim(), assignee: form.assignee?.trim() || undefined, notes: form.notes?.trim() || undefined }); }}><label>任務內容<input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="例如：確認護照與台胞證" required /></label><div className="form-grid two-columns"><label>分類<select value={form.category} onChange={(event) => setField("category", event.target.value as TripTaskCategory)}>{TASK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>負責人<input value={form.assignee ?? ""} onChange={(event) => setField("assignee", event.target.value || undefined)} placeholder="可不填" /></label></div><label>備註<textarea value={form.notes ?? ""} onChange={(event) => setField("notes", event.target.value || undefined)} rows={3} placeholder="例如：放在隨身行李" /></label><label className="check-row"><input type="checkbox" checked={form.completed} onChange={(event) => setField("completed", event.target.checked)} />標記為已完成</label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button"><Save size={16} />儲存到草稿</button></div></form></Modal>;
}

function ExpenseEditorDialog({ expense, onClose, onSave }: { expense?: ExpenseRecord; onClose: () => void; onSave: (expense: ExpenseRecord) => void }) {
  const [form, setForm] = useState<ExpenseRecord>(() => ({
    id: expense?.id ?? makeId("expense"),
    date: expense?.date ?? getDateKey(new Date()),
    title: expense?.title ?? "",
    amountCny: expense?.amountCny ?? 0,
    payer: expense?.payer ?? "我",
    category: expense?.category ?? "其他",
    note: expense?.note,
    createdAt: expense?.createdAt ?? new Date().toISOString()
  }));
  const setField = <K extends keyof ExpenseRecord>(field: K, value: ExpenseRecord[K]) => setForm((current) => ({ ...current, [field]: value }));
  return <Modal title={expense ? "編輯旅費" : "新增旅費"} onClose={onClose}><form className="form-stack" onSubmit={(event: FormEvent) => { event.preventDefault(); if (!form.title.trim() || form.amountCny <= 0 || !form.payer.trim()) return; onSave({ ...form, title: form.title.trim(), payer: form.payer.trim(), note: form.note?.trim() || undefined, amountCny: Number(form.amountCny.toFixed(2)) }); }}><div className="form-grid two-columns"><label>日期<input type="date" value={form.date} onChange={(event) => setField("date", event.target.value)} required /></label><label>金額（人民幣）<input type="number" min="0.01" step="0.01" value={form.amountCny || ""} onChange={(event) => setField("amountCny", Number(event.target.value))} placeholder="例如 128.50" required /></label></div><label>項目<input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="例如：Day 2 午餐" required /></label><div className="form-grid two-columns"><label>付款人<input value={form.payer} onChange={(event) => setField("payer", event.target.value)} placeholder="例如：我" required /></label><label>分類<select value={form.category} onChange={(event) => setField("category", event.target.value as ExpenseCategory)}>{EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div><label>備註<textarea value={form.note ?? ""} onChange={(event) => setField("note", event.target.value || undefined)} rows={3} placeholder="例如：含服務費、已用美團優惠" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button"><Save size={16} />儲存到本機</button></div></form></Modal>;
}

function AttachmentEditorDialog({ file, onClose, onSave }: { file: File; onClose: () => void; onSave: (category: AttachmentCategory, note: string) => void }) {
  const [category, setCategory] = useState<AttachmentCategory>(file.type === "application/pdf" ? "機票／登機證" : "其他");
  const [note, setNote] = useState("");
  return <Modal title="保存票券／截圖" onClose={onClose}><form className="form-stack" onSubmit={(event: FormEvent) => { event.preventDefault(); onSave(category, note); }}><div className="attachment-preview"><FileText size={22} /><div><strong>{file.name}</strong><span>{file.type || "檔案"} · {formatFileSize(file.size)}</span></div></div><label>附件分類<select value={category} onChange={(event) => setCategory(event.target.value as AttachmentCategory)}>{ATTACHMENT_CATEGORIES.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}</select></label><label>備註<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="例如：BR721 回程登機證" /></label><p className="helper-text">這個檔案只會存在目前裝置，不會放進 public/trip.json 或 GitHub。</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button"><Paperclip size={16} />保存到本機</button></div></form></Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="關閉"><X size={19} /></button></div>{children}</section></div>;
}

function TrafficDialog({ day, onClose }: { day: TripDay; onClose: () => void }) {
  return <Modal title={`Day ${day.dayNumber} · 交通明細`} onClose={onClose}><div className="traffic-dialog-content"><p className="modal-context">{day.title}</p><TransitCard segments={day.transitSegments} /></div></Modal>;
}

function findRestaurantAssignment(trip: TripDocument, restaurantId: string): { day: TripDay; item: ItineraryItem } | undefined {
  for (const day of trip.days) {
    const item = day.items.find((candidate) => candidate.sourceRestaurantId === restaurantId);
    if (item) return { day, item };
  }
  return undefined;
}

function Toast({ message, tone }: ToastState) {
  return <div className={`toast toast-${tone}`} role="status">{tone === "success" ? <CircleCheck size={17} /> : tone === "error" ? <CircleAlert size={17} /> : <Info size={17} />}<span>{message}</span></div>;
}

export default App;
