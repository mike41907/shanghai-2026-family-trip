# 上海 2026 · 家庭旅行 PWA

這是一套可重複使用的家庭旅行行程管理 App，不是單純的 PDF 轉網頁。第一個旅程已匯入「2026 上海五天四夜家庭旅行」資料，支援 iPhone、Android、iPad 與桌面瀏覽器。

## 已完成的功能

- 今天首頁：Day、目前行程、下一站、倒數、地址、營業時間與高德導航；首頁另有上海地鐵圖快速入口。
- 緊急協助：首頁提供上海 110 警方、120 急救、119 消防快速撥號；可在本機設定主要聯絡人，產生預填簡訊、系統分享或複製求助內容。
- 上海天氣：首頁顯示目前天氣、溫度、體感、降雨機率與風速；旅程日期進入可預報範圍後優先顯示當日預報。
- Day 1–Day 5 橫向切換與垂直時間軸。
- 交通卡：步行、地鐵、滴滴、磁浮、飛機等交通段落。
- 上海地鐵圖：首頁可一鍵開啟全螢幕檢視，旅程頁內建 2024 官方路線圖，可放大、縮小、滑動與離線查看；手機會優先嘗試橫向顯示，另保留上海市交通委員會官方更新頁與本次磁浮、2 號線、17 號線的轉乘重點。
- 想吃：備選餐廳、分類／區域／營業時間、加入 Day 與時間、美團搜尋與店名複製。
- 旅程：飯店、航班、成員、飯店／機場／磁浮站快速導航。
- 家庭任務清單：護照、台胞證、網卡、充電器、藥品、退房等，可由管理者編輯、勾選並隨發布版本同步給家人。
- 費用記帳：管理模式首頁會顯示明顯的旅費卡；可記錄機票、住宿、餐飲、交通等人民幣支出、行程日、付款人、付款方式與備註，支援快速新增、分類篩選、付款人／分類統計、旅費 JSON／CSV 匯出與 JSON 匯入；可用瀏覽器內 OCR 辨識支付寶、微信支付、美團外送截圖，再人工確認後入帳。
- 票券與截圖附件：機票、訂位與付款 QR Code 以 IndexedDB 保存在管理者裝置，不會寫入 `public/trip.json` 或上傳 GitHub。
- 管理模式：新增、編輯、刪除、複製、時間調整、拖曳排序、標記完成、編輯交通與備註。
- 草稿與發布分離：家人永遠只讀 `public/trip.json` 的發布版本。
- 版本歷史：每次發布建立 V1.0、V1.1…，可將任一版本還原到草稿。
- JSON：下載草稿、完整備份、匯入 JSON、還原本機最近備份。
- PWA：manifest、Service Worker、最近發布資料離線快取、深色／淺色模式、手機主畫面模式。

旅行工具中的費用與附件是管理者本機資料；清除網站資料或更換裝置前，請先匯出旅費並下載重要附件。旅費不會公開到家人的 `trip.json`，以免把家庭支出曝光；若未來需要家人共同查看，再將費用資料接到具權限控管的後端。任務清單則屬於正式行程資料，發布後家人可以唯讀查看。

緊急協助中的個人聯絡人只保存在目前裝置的 `localStorage`，不會進入 `public/trip.json` 或 GitHub。電話按鈕會呼叫手機的 `tel:`，簡訊按鈕只會開啟手機訊息 App，仍需人工確認收件人並按下送出；上海緊急號碼依[上海市政府緊急服務說明](https://english.shanghai.gov.cn/en-EmergencyNumbers/20241210/cbc5280b9f96440a93234bfc5e0c1023.html)設定。

付款截圖 OCR 是可選的本機功能：第一次使用會下載 Tesseract.js 的 OCR 核心與簡體中文／英文模型，之後在瀏覽器內辨識；辨識結果只會先填入記帳表單，必須由管理者確認後才寫入 `localStorage`。OCR 不保證完全正確，金額、日期與店家仍應以原始截圖核對。若需要保存原始截圖，請另外使用「票券與截圖」附件功能；附件仍只留在目前裝置。

首頁天氣使用 Open-Meteo 的公開 forecast endpoint，不需要 API Key；目前資料會保存在管理者裝置的 `localStorage`，網路中斷時顯示最近一次成功載入的資料，無法取得時可直接按「重新取得」。旅程日期超出預報範圍時，介面會明確標示尚未有該日期預報，不會把目前天氣誤稱為旅程預報。

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

一般開啟時是家人唯讀畫面，不會顯示新增、編輯、刪除、拖曳或發布按鈕。管理者在右上角按「管理」後，首頁會顯示旅費記帳卡，畫面底部也會固定顯示「記帳」快捷按鈕；可直接新增機票／住宿／餐飲／交通，或選擇拍照辨識。編輯內容只會存到這台裝置的 `localStorage`；管理者關閉管理模式時，畫面仍回到最後已發布版本。

這是第一階段的單一管理者模式，沒有登入系統。管理按鈕是裝置上的 UI gate，不是伺服器身分驗證；若需要真正的跨裝置管理權限，下一階段可把 `LocalTripRepository` 替換成 `SupabaseTripRepository`，並加入身份驗證與 Row Level Security。

## 資料架構

主要資料型別在 `src/types.ts`，儲存邊界在 `src/lib/repository.ts`：

- `TripRepository`：應用程式只依賴這個介面。
- `LocalTripRepository`：目前使用 `localStorage` 儲存發布快照、草稿與最近備份。
- `public/trip.json`：GitHub Pages 對外公開的發布版本。
- `TripVersion.snapshot`：版本歷史的完整行程快照，不會把尚未發布的草稿曝光給家人。

高德導航使用官方 `https://uri.amap.com/search` URI；行動裝置會帶入原生 App 呼叫參數，無法開啟時回到網頁搜尋，避免舊版私有 scheme 觸發不支援功能提示。美團同樣先嘗試 deep link，並在卡片提供一鍵複製餐廳名稱的 fallback。沒有串接任何付費 API、雲端 API、遙測或 Token。

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
6. 在旅程頁測試家庭任務新增、勾選、發布與家人唯讀畫面。
7. 在管理模式從首頁旅費卡新增機票／住宿／餐飲／交通，確認行程日、付款方式、分類篩選、付款人／分類統計、JSON／CSV 匯出與 JSON 匯入。
8. 以清晰的支付寶、微信支付或美團外送截圖測試「辨識截圖」，確認 OCR 結果可人工修改、取消不會入帳、確認後才增加記錄。
9. 上傳圖片或 PDF 票券，重新整理後下載附件，確認附件未出現在 `public/trip.json`。
10. 在線上或本機有網路時確認上海天氣卡片；關閉網路後重新整理，確認仍可顯示最近一次資料。
11. 在 DevTools Application 檢查 manifest、Service Worker、IndexedDB 與離線載入。
12. 在手機測試高德 App；沒有高德 App 時確認網頁 fallback。
13. 在手機測試首頁緊急協助：確認 110／120／119 撥號連結、聯絡人本機保存、簡訊內容可編輯、複製與系統分享 fallback。
14. 在手機測試首頁地鐵圖入口：確認全螢幕檢視、橫向提示、放大／縮小／重設、滑動與關閉。

## 原始資料來源

初始行程整合了需求中的完整五日安排，以及提供的 `shanghai-2026-pwa-prototype.zip` 中可辨識的地址與營業時間。未有可靠門牌或營業時間的餐廳，會明確顯示「待補資料」，可在管理模式補齊後再發布。

內建地鐵圖為上海申通地鐵集團 2024 官方路線圖，透過[上海市政府公開發布頁](https://english.shanghai.gov.cn/en-Latest-WhatsNew/20240924/b625d488216241f78f743cd87a40df0c.html)取得；App 內標示圖資版本與來源，官方更新頁仍保留在地鐵圖卡片中。
