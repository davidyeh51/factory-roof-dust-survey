-- ==============================================================================
-- 工廠屋頂落塵量與污染熱區查詢分析系統 (Factory Roof Dust & Pollution Hotspot Survey)
-- 依據 github-supabase-web 規範設計：純前端 GitHub Pages 託管、公開 Anon Key、嚴格啟用 RLS 行級安全
-- ==============================================================================

-- 1. 建立工廠屋頂落塵查詢軌跡紀錄表 (roof_dust_queries)
CREATE TABLE IF NOT EXISTS public.roof_dust_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_address TEXT NOT NULL,
    factory_name TEXT,
    industrial_zone TEXT,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    dust_index NUMERIC(5, 2) NOT NULL,              -- 0.00 ~ 100.00 落塵綜合評分
    severity_level TEXT NOT NULL DEFAULT 'moderate',-- low (輕度), moderate (中度), high (高度), severe (嚴重)
    hotspot_count INT DEFAULT 0,                    -- 偵測到的排氣源頭熱點數量
    dominant_wind_direction TEXT,                   -- 盛行風向 (如：東北風 225° 吹拂軸向)
    wind_angle NUMERIC(5, 1),                       -- 風向夾角角度 (0 ~ 360)
    pr_loss_estimate NUMERIC(5, 2) DEFAULT 0,       -- 光電面板預估年化發電損耗 (%)
    clean_frequency TEXT,                           -- 建議清洗週期 (如：每月一次、每季一次)
    sources_summary JSONB DEFAULT '[]'::jsonb,      -- 偵測排氣口明細 (袋濾式集塵機、洗滌塔、百葉等)
    analysis_summary JSONB DEFAULT '{}'::jsonb,     -- 綜合評估結構化診斷報告
    session_id TEXT,                                -- 前端匿名造訪會話識別碼
    user_agent TEXT,                                -- 客戶端瀏覽器環境
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 建立索引以優化歷史查詢與熱點排行
CREATE INDEX IF NOT EXISTS idx_roof_dust_queries_created_at ON public.roof_dust_queries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roof_dust_queries_dust_index ON public.roof_dust_queries (dust_index DESC);
CREATE INDEX IF NOT EXISTS idx_roof_dust_queries_zone ON public.roof_dust_queries (industrial_zone);
CREATE INDEX IF NOT EXISTS idx_roof_dust_queries_address ON public.roof_dust_queries USING gin (to_tsvector('simple', query_address));

-- ==============================================================================
-- 🛡️ 啟用 Row Level Security (RLS) 行級安全控管（防護核心）
-- ==============================================================================

ALTER TABLE public.roof_dust_queries ENABLE ROW LEVEL SECURITY;

-- 允許前端純客戶端（匿名 anon public key）即時新增每次的地址查詢記錄
CREATE POLICY "Allow public anon insert into roof_dust_queries"
    ON public.roof_dust_queries
    FOR INSERT
    WITH CHECK (true);

-- 允許任何人讀取查詢記錄（公開看板與歷史查詢追蹤）
CREATE POLICY "Allow public read for roof_dust_queries"
    ON public.roof_dust_queries
    FOR SELECT
    USING (true);

-- 禁止匿名直接更新或刪除既有查詢紀錄（保障資料完整性）
CREATE POLICY "Disallow anon update for roof_dust_queries"
    ON public.roof_dust_queries
    FOR UPDATE
    USING (false);

CREATE POLICY "Disallow anon delete for roof_dust_queries"
    ON public.roof_dust_queries
    FOR DELETE
    USING (false);

-- ==============================================================================
-- 📊 統計檢視表與 RPC 輔助查詢函數
-- ==============================================================================

-- 工業區污染熱度排行統計檢視表
CREATE OR REPLACE VIEW public.roof_dust_zone_rankings AS
SELECT 
    COALESCE(industrial_zone, '未分類工業區') AS zone_name,
    COUNT(*) AS total_inspections,
    ROUND(AVG(dust_index), 1) AS avg_dust_index,
    MAX(dust_index) AS max_dust_index,
    COUNT(CASE WHEN severity_level IN ('high', 'severe') THEN 1 END) AS high_pollution_count,
    ROUND(AVG(pr_loss_estimate), 2) AS avg_pr_loss_pct,
    MAX(created_at) AS last_inspected_at
FROM public.roof_dust_queries
GROUP BY COALESCE(industrial_zone, '未分類工業區')
ORDER BY avg_dust_index DESC;

-- 快速取得最近查詢歷史之 RPC 函數
CREATE OR REPLACE FUNCTION public.get_recent_dust_queries(limit_count INT DEFAULT 20)
RETURNS TABLE (
    id UUID,
    query_address TEXT,
    factory_name TEXT,
    industrial_zone TEXT,
    dust_index NUMERIC,
    severity_level TEXT,
    hotspot_count INT,
    pr_loss_estimate NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        q.id,
        q.query_address,
        q.factory_name,
        q.industrial_zone,
        q.dust_index,
        q.severity_level,
        q.hotspot_count,
        q.pr_loss_estimate,
        q.created_at
    FROM public.roof_dust_queries q
    ORDER BY q.created_at DESC
    LIMIT limit_count;
$$;
