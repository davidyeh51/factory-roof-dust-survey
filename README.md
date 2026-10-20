# 臺灣工廠屋頂落塵量與污染熱區盡職調查系統
### Industrial Factory Roof Dust & Pollution Hotspot AI Audit Platform

> **依地址即時定位全台廠房 ✕ 國土測繪正射航照圖 ✕ Google Earth 時光機差分比對 ✕ 光學落塵熱區量化 ✕ Supabase BaaS 雲端留存**

---

## 🌐 線上展示與系統入口 (Live Demo)

- **線上展示平台 (GitHub Pages)**：[https://davidyeh51.github.io/factory-roof-dust-survey/](https://davidyeh51.github.io/factory-roof-dust-survey/)
- **GitHub 開源儲存庫**：[https://github.com/davidyeh51/factory-roof-dust-survey](https://github.com/davidyeh51/factory-roof-dust-survey)
- **Supabase 資料庫腳本**：[`supabase/schema.sql`](https://github.com/davidyeh51/factory-roof-dust-survey/blob/main/supabase/schema.sql)

---

## 📖 系統設計與操作準則

本系統嚴格遵循《**工業區落塵量開放資料查詢指南**》之判讀原理與技術規範，結合多源開放圖資與光學演算法，實現對全台灣工業區廠房屋頂落塵與逸散熱區之高精度盡調排查：

```
┌────────────────────────────────────────────────────────┐
│ 1. 前端查詢與多源航照影像 (GitHub Pages)               │
│    • 全台地址空間定位 (OSM Nominatim ✕ 工業區坐標庫)    │
│    • 內政部國土測繪圖資服務雲正射航照 (NLSC PHOTO2)      │
│    • 商業衛星高解析正射影像 (ESRI World Imagery)        │
│    • Google Earth Pro 桌面時光機 (.kml 90° 直視 LookAt) │
└───────────────────────────┬────────────────────────────┘
                            │
               光學差分運算 ✕ 視覺特徵檢核
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. 四大視覺特徵指標 ✕ 污染熱區引擎                     │
│    • ① 設備源頭中心點：袋濾機、洗滌塔放射狀沉降圈       │
│    • ② 盛行風向沉降扇形：東北/西南季風煙羽長條色差帶    │
│    • ③ 酸鹼腐蝕變色：金屬彩色浪板鍍鋅烤漆紅褐斑蝕       │
│    • ④ 排水天溝滯留：洩水波谷與天溝硬化泥垢沉澱       │
│    • ⑤ 判讀盲點排除：過濾金屬反光閃爍與雨後青苔生物膜   │
└───────────────────────────┬────────────────────────────┘
                            │
             非同步即時留存 (Anon Public Key)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Supabase BaaS 雲端資料庫 (PostgreSQL 15+)           │
│    • 資料表：roof_dust_queries (每次查詢軌跡自動記錄)    │
│    • 安全架構：RLS (Row Level Security) 行級安全策略   │
│    • 查詢歷程回溯抽屜 ✕ 本地 LocalStorage 雙重離線備援 │
└────────────────────────────────────────────────────────┘
```

---

## ⚡ 核心功能特色

### 1. 依地址即時定位全台工廠
- 支援任意台灣地址查詢（例如：`桃園市觀音區工業四路22號`、`高雄市小港區中鋼路1號`、`新北市樹林區俊英街`...）。
- 內建 10 大代表性標竿案例快選（鋼鐵廠、煉油廠、六輕石化、水泥廠、燃煤電廠、特用化學、半導體晶圓潔淨對照組）。

### 2. 歷史時光機比對 (Before & After Slider)
- 設定「新建/重塗乾淨基準年（Baseline）」與「當前沉降年（Recent）」之光學差分比對。
- 互動式動態差分滑桿，直觀檢視粉塵暗斑之擴散與累積速率。

### 3. 一鍵生成 Google Earth Pro 桌面時光機 (.KML)
- 符合指南第一節操作規範，一鍵生成並下載標準 `.kml` 檔案。
- 自動帶入精準經緯度與 `<LookAt>` 參數（`<tilt>0</tilt>` 垂直正射 90 度視角、`<range>350</range>` 最佳廠房解析距）。
- 雙擊即可在 Google Earth Pro 桌面端直接喚醒歷年農航所高解析航照時鐘滑桿！

### 4. 專業顧問級盡職調查報告匯出
- 自動計算「落塵綜合評分（0~100）」、「光電發電年化損失率（PR Loss %）」、「建議清洗頻率」。
- 格式化輸出「工廠屋頂落塵量與污染熱區盡職調查報告書」，支援瀏覽器直接預覽與 A4 列印/另存 PDF。

### 5. 遵照 `github-supabase-web` 規範之資料庫整合
- 每次使用者點擊查詢，系統即時非同步寫入 Supabase `roof_dust_queries` 表。
- 採用匿名 Client anon key，杜絕私鑰外洩。
- 具備連線狀態燈號（🟢 雲端同步 / 🟡 本地離線備援），未配置 Key 亦保證 100% 穩定可用。

---

## 🛠️ Supabase 資料庫快速建立 (一鍵 SQL)

在 Supabase 控制台的 **SQL Editor** 貼上並執行本專案之 [`supabase/schema.sql`](supabase/schema.sql)：

```sql
-- 1. 建立工廠屋頂落塵查詢軌跡紀錄表
CREATE TABLE IF NOT EXISTS public.roof_dust_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_address TEXT NOT NULL,
    factory_name TEXT,
    industrial_zone TEXT,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    dust_index NUMERIC(5, 2) NOT NULL,
    severity_level TEXT NOT NULL DEFAULT 'moderate',
    hotspot_count INT DEFAULT 0,
    dominant_wind_direction TEXT,
    wind_angle NUMERIC(5, 1),
    pr_loss_estimate NUMERIC(5, 2) DEFAULT 0,
    clean_frequency TEXT,
    sources_summary JSONB DEFAULT '[]'::jsonb,
    analysis_summary JSONB DEFAULT '{}'::jsonb,
    session_id TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 啟用 Row Level Security (RLS)
ALTER TABLE public.roof_dust_queries ENABLE ROW LEVEL SECURITY;

-- 3. 允許匿名前端客戶端新增每次查詢
CREATE POLICY "Allow public anon insert into roof_dust_queries"
    ON public.roof_dust_queries FOR INSERT WITH CHECK (true);

-- 4. 允許公開讀取歷史查詢
CREATE POLICY "Allow public read for roof_dust_queries"
    ON public.roof_dust_queries FOR SELECT USING (true);
```

---

## 📄 版權與免責聲明

- 本專案地圖圖資由 **內政部國土測繪中心 (NLSC MOI Taiwan)**、**Esri**、**OpenStreetMap** 提供。
- 系統產生之落塵熱區與 PR 損失評估為輔助決策參考模型，現場實施光電建置或清洗合約前，應由專業工程人員赴現場進行取樣檢測。
