# 上海 2026 · 家庭旅行 PWA

這是一套可重複使用的家庭旅行行程管理 App，不是單純的 PDF 轉網頁。第一個旅程已匯入「2026 上海五天四夜家庭旅行」資料，支援 iPhone、Android、iPad 與桌面瀏覽器。

## 已完成的功能

- 今天首頁：Day、目前行程、下一站、倒數、地址、營業時間與高德導航。
- Day 1–Day 5 橫向切換與垂直時間軸。
- 交通卡：步行、地鐵、滴滴、磁浮、飛機等交通段落。
- 想吃：備選餐廳、分類／區域／營業時間、加入 Day 與時間、美團搜尋與店名複製。
- 旅程：飯店、航班、成員、飯店／機場／磁浮站快速導航。
- 管理模式：新增、編輯、刪除、複製、時間調整、拖曳排序、標記完成、編輯交通與備註。
- 草稿與發布分離：家人永遠只讀 `public/trip.json` 的發布版本。
- 版本歷史：每次發布建立 V1.0、V1.1…，可將任一版本還原到草稿。
- JSON：下載草稿、完整備份、匯入 JSON、還原本機最近備份。
- PWA：manifest、Service Worker、最近發布資料離線快取、深色／淺色模式、手機主畫面模式。

## 本機開發

```bash
npm install
npm run export:trip
npm run dev
```

正式建置與預覽：

```bash
npm run build
npm run preview
```

`npm run export:trip` 會將 `src/data/initialTrip.ts` 的初始資料輸出為 `public/trip.json`。日常使用者發布後下載的 `trip.json` 已可直接覆蓋這個檔案。

## GitHub Pages 部署

1. 將專案推到 GitHub repository 的 `main` 分支。
2. 在 repository 的 Settings → Pages → Source 選擇 **GitHub Actions**。
3. `.github/workflows/deploy.yml` 會執行 `npm install`、產生 `public/trip.json`、`npm run build`，再部署 `dist`。
4. `vite.config.ts` 會從 `GITHUB_REPOSITORY` 自動設定 repository base path，例如 `/my-repo/`；本機開發仍使用 `/`。

若要手動指定 base path：

```bash
VITE_BASE_PATH=/my-repo/ npm run build
```

不要把 GitHub Token、密碼或 API Key 寫進前端。這個第一版採安全的靜態發布流程：管理者在管理工具按「發布最新版並下載 trip.json」，將下載檔覆蓋 repository 的 `public/trip.json` 後提交 GitHub；GitHub Actions 完成部署後，家人的裝置重新載入即可取得新版本。

## 管理者與家人模式

一般開啟時是家人唯讀畫面，不會顯示新增、編輯、刪除、拖曳或發布按鈕。管理者在右上角按「管理」後，編輯內容只會存到這台裝置的 `localStorage` 草稿；管理者關閉管理模式時，畫面仍回到最後已發布版本。

這是第一階段的單一管理者模式，沒有登入系統。管理按鈕是裝置上的 UI gate，不是伺服器身分驗證；若需要真正的跨裝置管理權限，下一階段可把 `LocalTripRepository` 替換成 `SupabaseTripRepository`，並加入身份驗證與 Row Level Security。

## 資料架構

主要資料型別在 `src/types.ts`，儲存邊界在 `src/lib/repository.ts`：

- `TripRepository`：應用程式只依賴這個介面。
- `LocalTripRepository`：目前使用 `localStorage` 儲存發布快照、草稿與最近備份。
- `public/trip.json`：GitHub Pages 對外公開的發布版本。
- `TripVersion.snapshot`：版本歷史的完整行程快照，不會把尚未發布的草稿曝光給家人。

高德導航會在行動裝置先嘗試 `amapuri://` scheme，沒有 App 或桌面環境則開啟 `https://uri.amap.com/`；美團同樣先嘗試 deep link，並在卡片提供一鍵複製餐廳名稱的 fallback。沒有串接任何付費 API、雲端 API、遙測或 Token。

## 驗證清單

```bash
npm run check
npm run export:trip
npm run build
```

瀏覽器手動驗證：

1. 以手機寬度檢查今天、五日行程、想吃、旅程與底部導航。
2. 以桌面寬度檢查兩欄卡片與管理抽屜。
3. 開啟管理模式，編輯一個行程、拖曳排序、標記完成、加入備選餐廳。
4. 確認草稿修改不會出現在唯讀發布畫面。
5. 發布並下載 `trip.json`，匯出備份，再匯入／還原備份。
6. 在 DevTools Application 檢查 manifest、Service Worker 與離線載入。
7. 在手機測試高德 App；沒有高德 App 時確認網頁 fallback。

## 原始資料來源

初始行程整合了需求中的完整五日安排，以及提供的 `shanghai-2026-pwa-prototype.zip` 中可辨識的地址與營業時間。未有可靠門牌或營業時間的餐廳，會明確顯示「待補資料」，可在管理模式補齊後再發布。
