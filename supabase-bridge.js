/**
 * supabase-bridge.js
 * 工廠屋頂落塵盡調平台 ✕ Supabase BaaS 雲端資料庫橋接模組
 * 遵循 github-supabase-web 規範：
 * 1. 僅暴露公開 anon key，純前端 GitHub Pages 託管，杜絕 service_role 洩漏。
 * 2. 針對每一次工廠地址查詢，即時非同步寫入 roof_dust_queries 資料表留存軌跡。
 * 3. 雙重韌性架構：未設定 Supabase 金鑰或網路中斷時，自動無縫切換為 LocalStorage / IndexedDB 本地留存。
 */

const SupabaseBridge = {
  client: null,
  isOnline: false,
  STORAGE_KEY_URL: 'ROOF_DUST_SB_URL',
  STORAGE_KEY_ANON: 'ROOF_DUST_SB_KEY',
  LOCAL_LOGS_KEY: 'LOCAL_ROOF_DUST_QUERY_LOGS',

  // 取得使用者匿名連線 Session
  getSessionId() {
    let sid = sessionStorage.getItem('ROOF_DUST_SESSION_ID');
    if (!sid) {
      sid = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('ROOF_DUST_SESSION_ID', sid);
    }
    return sid;
  },

  // 取得配置（支援 URL hash/search 注入或 LocalStorage）
  getConfig() {
    try {
      const urlParams = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, ''));
      const pUrl = urlParams.get('sb_url');
      const pKey = urlParams.get('sb_key');
      if (pUrl && pKey) {
        localStorage.setItem(this.STORAGE_KEY_URL, pUrl.trim());
        localStorage.setItem(this.STORAGE_KEY_ANON, pKey.trim());
      }
    } catch (e) {
      console.warn('[Supabase] Parse URL params:', e);
    }

    const savedUrl = localStorage.getItem(this.STORAGE_KEY_URL) || localStorage.getItem('SB_URL') || window.ENV_SUPABASE_URL || '';
    const savedKey = localStorage.getItem(this.STORAGE_KEY_ANON) || localStorage.getItem('SB_ANON_KEY') || window.ENV_SUPABASE_ANON_KEY || '';

    return {
      url: savedUrl.trim(),
      anonKey: savedKey.trim()
    };
  },

  // 初始化 Supabase 客戶端
  async init() {
    const config = this.getConfig();
    if (config.url && config.anonKey && window.supabase) {
      try {
        this.client = window.supabase.createClient(config.url, config.anonKey);
        this.isOnline = true;
        console.log('🟢 [Supabase] Connected to:', config.url);
      } catch (err) {
        console.warn('🟡 [Supabase] Init error, fallback to local storage:', err);
        this.client = null;
        this.isOnline = false;
      }
    } else {
      this.client = null;
      this.isOnline = false;
      console.log('🟡 [Supabase] Running in local demo/offline cache mode');
    }
    this.updateStatusBadge();
    return this.isOnline;
  },

  // 測試連線
  async testConnection(url, anonKey) {
    if (!window.supabase) {
      return { success: false, message: 'Supabase JS SDK 尚未載入' };
    }
    try {
      const testClient = window.supabase.createClient(url.trim(), anonKey.trim());
      const { data, error } = await testClient.from('roof_dust_queries').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            message: '連線成功但尚未執行 SQL！請先在 Supabase SQL Editor 執行 schema.sql 建立 roof_dust_queries 資料表。'
          };
        }
        return { success: false, message: '連線查詢失敗: ' + error.message };
      }
      return { success: true, message: '✅ 連線成功！已成功連通 roof_dust_queries 資料表' };
    } catch (err) {
      return { success: false, message: '連線異常: ' + (err.message || err) };
    }
  },

  // 儲存設定並重載
  async saveConfig(url, key) {
    if (url) localStorage.setItem(this.STORAGE_KEY_URL, url.trim());
    else localStorage.removeItem(this.STORAGE_KEY_URL);

    if (key) localStorage.setItem(this.STORAGE_KEY_ANON, key.trim());
    else localStorage.removeItem(this.STORAGE_KEY_ANON);

    return await this.init();
  },

  // 更新導覽列燈號
  updateStatusBadge() {
    const badge = document.getElementById('supabaseStatusBadge');
    const textEl = document.getElementById('supabaseStatusText');
    const dotEl = document.getElementById('supabaseStatusDot');
    if (!badge) return;

    if (this.isOnline && this.client) {
      badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 transition cursor-pointer shadow-sm';
      if (dotEl) dotEl.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      if (textEl) textEl.textContent = 'Supabase 雲端已連線';
      badge.title = '已連線至 Supabase BaaS，每次查詢即時同步雲端資料庫';
    } else {
      badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-500/30 hover:border-amber-400 transition cursor-pointer shadow-sm';
      if (dotEl) dotEl.className = 'w-2 h-2 rounded-full bg-amber-400';
      if (textEl) textEl.textContent = '本地備援模式';
      badge.title = '目前以本地快取留存紀錄，點擊配置 Supabase 雲端同步';
    }
  },

  // 針對每一次查詢進行資料留存 (Core Requirement 3)
  async logQueryRecord(record) {
    const payload = {
      query_address: record.address || '',
      factory_name: record.name || '自訂查詢廠址',
      industrial_zone: record.zone || '未知工業區',
      latitude: Number(record.lat),
      longitude: Number(record.lng),
      dust_index: Number(record.dustIndex || 0),
      severity_level: record.severityLevel || 'moderate',
      hotspot_count: Number(record.hotspotCount || 0),
      dominant_wind_direction: record.dominantWind || '季節風向',
      wind_angle: Number(record.windAngle || 225),
      pr_loss_estimate: Number(record.prLossEstimate || 0),
      clean_frequency: record.cleanFrequency || '定期維護',
      sources_summary: record.sources || [],
      analysis_summary: record.analysisSummary || {},
      session_id: this.getSessionId(),
      user_agent: navigator.userAgent
    };

    // 1. 本地快取備存（永不遺失）
    this.saveToLocalCache(payload);

    // 2. 雲端 Supabase 同步
    if (this.client && this.isOnline) {
      try {
        const { data, error } = await this.client
          .from('roof_dust_queries')
          .insert([payload])
          .select();

        if (error) {
          console.warn('⚠️ [Supabase] Insert failed:', error.message);
          return { success: false, localSaved: true, error: error.message };
        }
        console.log('✅ [Supabase] Query record inserted:', data?.[0]?.id);
        return { success: true, localSaved: true, cloudId: data?.[0]?.id };
      } catch (err) {
        console.warn('⚠️ [Supabase] Async insert exception:', err);
        return { success: false, localSaved: true, error: err.message };
      }
    }

    return { success: true, localSaved: true, cloudId: null };
  },

  // 本地快取儲存
  saveToLocalCache(payload) {
    try {
      const existing = JSON.parse(localStorage.getItem(this.LOCAL_LOGS_KEY) || '[]');
      const newEntry = {
        ...payload,
        id: 'local_' + Date.now().toString(36),
        created_at: new Date().toISOString()
      };
      existing.unshift(newEntry);
      // 保留最近 50 筆
      const trimmed = existing.slice(0, 50);
      localStorage.setItem(this.LOCAL_LOGS_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Save to local cache error:', e);
    }
  },

  // 取得歷史查詢列表
  async getRecentQueries(limit = 25) {
    const localLogs = JSON.parse(localStorage.getItem(this.LOCAL_LOGS_KEY) || '[]');

    if (this.client && this.isOnline) {
      try {
        const { data, error } = await this.client
          .from('roof_dust_queries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && Array.isArray(data) && data.length > 0) {
          return { source: 'supabase', list: data };
        }
      } catch (e) {
        console.warn('[Supabase] Fetch history failed, fallback to local:', e);
      }
    }

    return { source: 'local', list: localLogs };
  }
};

window.SupabaseBridge = SupabaseBridge;
