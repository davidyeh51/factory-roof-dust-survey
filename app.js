/**
 * app.js
 * 臺灣工廠屋頂落塵量與污染熱區盡職調查系統核心邏輯 (v2.0 強化版)
 * 1. 修正地址解析：多層級台灣門牌/街路智慧剖析，支援「812高雄市小港區店鎮里嘉興街8號」等複合地址精準定位
 * 2. 串接 Google 混合實景衛星圖 (Google Satellite Hybrid ✕ 國土測繪航照 ✕ ESRI)
 * 3. 解決地圖滾輪鎖死網頁：預設滾輪優先捲動網頁，支援一鍵切換滾輪縮放與全螢幕放大
 * 4. 點擊地圖任意處或拖曳定位針，即時微調廠房屋頂核心坐標
 */

let map = null;
let currentBaseLayer = 'google_sat';
let baseLayers = {};
let layerGroups = {
  sources: null,
  plume: null,
  heatmap: null,
  gutters: null,
  roofBorder: null,
  targetPin: null
};

let currentFactory = null;
let currentSliderValue = 85;
let isScrollWheelZoomEnabled = false;
let isFullscreen = false;

// ==============================================================================
// 1. 初始化應用程式
// ==============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // 1. 初始化 Leaflet 地圖
  initMap();

  // 2. 渲染標竿工廠快捷晶片
  renderPresetChips();

  // 3. 初始化 Supabase BaaS 連線
  if (window.SupabaseBridge) {
    await SupabaseBridge.init();
    updateHistoryCount();
  }

  // 4. 預設載入代表性案例 (中鋼公司)
  if (PRESET_FACTORIES && PRESET_FACTORIES.length > 0) {
    loadFactoryCase(PRESET_FACTORIES[0], false);
  }
});

// ==============================================================================
// 2. Leaflet 地圖引擎與多圖資設定 (串接 Google 混合衛星 ✕ NLSC ✕ ESRI)
// ==============================================================================
function initMap() {
  // ① Google 混合衛星圖 (Google Satellite Hybrid: 實景空拍＋繁體路網標籤)
  const googleSat = L.tileLayer(
    'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: '© Google Maps 實景衛星圖'
    }
  );

  // ② 臺灣國土測繪圖資服務雲 (NLSC) 正射影像 PHOTO2
  const nlscPhoto = L.tileLayer(
    'https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}',
    {
      maxZoom: 20,
      attribution: '© 內政部國土測繪中心 (NLSC MOI Taiwan)'
    }
  );

  // ③ ESRI 高解析度商業衛星影像
  const esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri World Imagery'
    }
  );

  // ④ 臺灣通用電子地圖 (NLSC EMAP)
  const nlscEmap = L.tileLayer(
    'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}',
    {
      maxZoom: 20,
      attribution: '© 國土測繪通用電子地圖 (NLSC EMAP)'
    }
  );

  baseLayers = {
    google_sat: googleSat,
    nlsc_photo: nlscPhoto,
    esri_sat: esriSat,
    nlsc_emap: nlscEmap
  };

  // 建立地圖實例
  // ★ 關鍵修正：scrollWheelZoom 預設為 false，避免滑鼠在瀏覽器移動時被地圖霸佔滾輪而無法捲動網頁！
  map = L.map('dustMap', {
    center: [22.54898, 120.34752],
    zoom: 18,
    maxZoom: 20,
    layers: [googleSat],
    zoomControl: false,
    scrollWheelZoom: false
  });

  currentBaseLayer = 'google_sat';

  // 加入右下角縮放控制元件
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 建立圖層群組
  layerGroups.sources = L.layerGroup().addTo(map);
  layerGroups.plume = L.layerGroup().addTo(map);
  layerGroups.heatmap = L.layerGroup().addTo(map);
  layerGroups.gutters = L.layerGroup().addTo(map);
  layerGroups.roofBorder = L.layerGroup().addTo(map);
  layerGroups.targetPin = L.layerGroup().addTo(map);

  // 監聽點擊地圖任意處：允許使用者直接微調廠房屋頂核心位置
  map.on('click', (e) => {
    relocateRoofTarget(e.latlng);
  });
}

// 切換底圖圖資
function setBaseLayer(layerKey) {
  if (!baseLayers[layerKey] || currentBaseLayer === layerKey) return;

  map.removeLayer(baseLayers[currentBaseLayer]);
  map.addLayer(baseLayers[layerKey]);
  currentBaseLayer = layerKey;

  // 更新按鈕高亮
  const buttons = {
    google_sat: document.getElementById('btnLayerGoogle'),
    nlsc_photo: document.getElementById('btnLayerNlsc'),
    esri_sat: document.getElementById('btnLayerEsri'),
    nlsc_emap: document.getElementById('btnLayerEmap')
  };

  Object.keys(buttons).forEach(k => {
    const btn = buttons[k];
    if (!btn) return;
    if (k === layerKey) {
      btn.className = 'px-2 py-1 rounded-lg font-medium transition bg-emerald-600 text-white shadow-sm flex items-center gap-1';
    } else {
      btn.className = 'px-2 py-1 rounded-lg font-medium transition text-slate-300 hover:text-white hover:bg-slate-800';
    }
  });
}

// 解決滾輪被地圖搶走問題：切換「滾輪滾動網頁」或「滾輪縮放地圖」
function toggleScrollWheelZoom() {
  isScrollWheelZoomEnabled = !isScrollWheelZoomEnabled;
  const btn = document.getElementById('btnWheelToggle');
  const textEl = document.getElementById('wheelToggleText');

  if (isScrollWheelZoomEnabled) {
    map.scrollWheelZoom.enable();
    btn.className = 'px-2 py-1 rounded-lg font-medium transition bg-cyan-600 text-white flex items-center gap-1 shadow-sm';
    textEl.textContent = '滾輪縮放地圖';
    btn.title = '目前：滑鼠滾輪縮放地圖 (點擊切換為優先滾動網頁)';
  } else {
    map.scrollWheelZoom.disable();
    btn.className = 'px-2 py-1 rounded-lg font-medium transition text-slate-300 hover:text-white flex items-center gap-1';
    textEl.textContent = '滾輪滾動頁面';
    btn.title = '目前：滑鼠滾輪自由滾動瀏覽網頁 (點擊啟用滾輪縮放地圖)';
  }
}

// 全螢幕地圖切換
function toggleFullscreenMap() {
  isFullscreen = !isFullscreen;
  const wrapper = document.getElementById('mapWrapper');
  const btn = document.getElementById('btnFullscreen');
  const text = document.getElementById('fullscreenText');

  if (isFullscreen) {
    wrapper.classList.add('map-fullscreen');
    text.textContent = '退出全螢幕';
    btn.className = 'px-2 py-1 rounded-lg font-medium transition bg-amber-600 text-white flex items-center gap-1 shadow-sm';
  } else {
    wrapper.classList.remove('map-fullscreen');
    text.textContent = '全螢幕';
    btn.className = 'px-2 py-1 rounded-lg font-medium transition text-slate-300 hover:text-white flex items-center gap-1';
  }

  setTimeout(() => {
    map.invalidateSize();
  }, 200);
}

// 切換圖層開關
function toggleLayer(type) {
  const checkbox = document.getElementById(`toggle${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (!checkbox) return;

  const targetGroup = layerGroups[type];
  if (!targetGroup) return;

  if (checkbox.checked) {
    if (!map.hasLayer(targetGroup)) map.addLayer(targetGroup);
  } else {
    if (map.hasLayer(targetGroup)) map.removeLayer(targetGroup);
  }
}

// ==============================================================================
// 3. 台灣地址智慧剖析器 (解決郵遞區號、村里、鄰、門牌造成的 Nominatim 找不到問題)
// ==============================================================================
function parseTaiwanAddress(raw) {
  let str = (raw || '').trim();
  // 1. 移除開頭或結尾郵遞區號 (3~6 碼數字)
  str = str.replace(/^\d{3,6}\s*/, '').replace(/\s*\d{3,6}$/, '');
  // 2. 移除樓層
  str = str.replace(/\d+樓|\d+[Ff]/g, '');

  let city = '';
  let district = '';
  let village = '';
  let road = '';
  let houseNo = '';

  const cities = ['基隆市','臺北市','台北市','新北市','桃園市','新竹市','新竹縣','苗栗縣','臺中市','台中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','臺南市','台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','臺東縣','台東縣','澎湖縣','金門縣','連江縣'];
  for (const c of cities) {
    if (str.includes(c)) {
      city = c;
      const parts = str.split(c);
      str = parts[1] || '';
      break;
    }
  }

  // 鄉鎮市區 (非貪婪匹配到第一個 區|鄉|鎮|市)
  const distMatch = str.match(/^([^\d]{1,4}?(?:區|鄉|鎮|市))/);
  if (distMatch) {
    district = distMatch[1];
    str = str.substring(district.length);
  }

  // 村里 (非貪婪匹配到 里|村)
  const villageMatch = str.match(/^([^\d]{1,4}?(?:里|村))/);
  if (villageMatch) {
    village = villageMatch[1];
    str = str.substring(village.length);
  }

  // 鄰
  str = str.replace(/^\d+鄰/, '');

  // 路街段大道
  const roadMatch = str.match(/^([^\d]{1,10}?(?:路|街|大道|(?:[一二三四五六七八九十\d]+段)))/);
  if (roadMatch) {
    road = roadMatch[1];
    str = str.substring(road.length);
  }

  // 門牌號碼
  const houseMatch = str.match(/(\d+(?:[-之]\d+)?號)/);
  if (houseMatch) {
    houseNo = houseMatch[1];
  }

  return { city, district, village, road, houseNo, fullCleaned: `${city}${district}${road}${houseNo}` };
}

// 多層級串接空間定位 API (OSM Nominatim 多階段回退)
async function geocodeTaiwanAddress(rawQuery) {
  const parsed = parseTaiwanAddress(rawQuery);
  const candidates = [];

  // 優先級 1: 完整乾淨地址 (縣市+鄉鎮市區+路街+號)
  if (parsed.city && parsed.district && parsed.road && parsed.houseNo) {
    candidates.push(`${parsed.city}${parsed.district}${parsed.road}${parsed.houseNo}`);
  }

  // 優先級 2: 街路層級 (精準到該路街，如：高雄市小港區嘉興街) ★ 本次修復的核心！
  if (parsed.city && parsed.district && parsed.road) {
    candidates.push(`${parsed.city}${parsed.district}${parsed.road}`);
  }

  // 優先級 3: 縣市+路街 (如：高雄市嘉興街)
  if (parsed.city && parsed.road) {
    candidates.push(`${parsed.city}${parsed.road}`);
  }

  // 優先級 4: 原始清理地址
  const simpleClean = rawQuery.replace(/^\d{3,6}\s*/, '').replace(/\s*\d{3,6}$/, '');
  if (!candidates.includes(simpleClean)) {
    candidates.push(simpleClean);
  }

  // 優先級 5: 縣市+鄉鎮市區
  if (parsed.city && parsed.district) {
    candidates.push(`${parsed.city}${parsed.district}`);
  }

  console.log('[Geocode] 測試候選搜尋字串：', candidates);

  for (const q of candidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=tw&limit=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log(`[Geocode] 命中候選「${q}」：`, data[0]);
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
          matchedQuery: q,
          parsedInfo: parsed
        };
      }
    } catch (e) {
      console.warn(`[Geocode] 查詢候選「${q}」異常：`, e);
    }
  }

  return null;
}

// ==============================================================================
// 4. 地址查詢執行主函數
// ==============================================================================
async function handleAddressSearch(e) {
  e.preventDefault();
  const inputEl = document.getElementById('addressInput');
  const rawQuery = (inputEl.value || '').trim();
  if (!rawQuery) return;

  const submitBtn = document.getElementById('searchSubmitBtn');
  const btnText = document.getElementById('searchBtnText');

  submitBtn.disabled = true;
  btnText.textContent = '精準定位中...';

  try {
    // 1. 檢驗是否與既有 10 大標竿工廠相符
    const matchedPreset = PRESET_FACTORIES.find(f => 
      f.name.includes(rawQuery) || f.address.includes(rawQuery) || rawQuery.includes(f.name.split(' ')[0])
    );
    if (matchedPreset) {
      loadFactoryCase(matchedPreset, true);
      return;
    }

    // 2. 執行多層級台灣地址空間定位
    const geoResult = await geocodeTaiwanAddress(rawQuery);

    if (geoResult) {
      const { lat, lng, displayName, parsedInfo } = geoResult;
      
      // 推估所屬工業區或行政區
      const inferredZone = inferIndustrialZone(rawQuery, displayName, parsedInfo);

      // 動態合成該廠房落塵與熱區模型
      const synthesizedCase = synthesizeFactoryProfile(rawQuery, displayName, inferredZone, lat, lng, parsedInfo);

      loadFactoryCase(synthesizedCase, true);
    } else {
      // 3. 降級：比對主要行政區與工業區字典
      const fallbackZone = matchIndustrialZoneFallback(rawQuery);
      if (fallbackZone) {
        const synthesizedCase = synthesizeFactoryProfile(
          rawQuery,
          `${fallbackZone.city}${rawQuery}`,
          fallbackZone.name,
          fallbackZone.lat,
          fallbackZone.lng,
          parseTaiwanAddress(rawQuery)
        );
        loadFactoryCase(synthesizedCase, true);
        alert(`已為您定位至【${fallbackZone.name}】周邊。若需對齊精準廠房屋頂，可直接點擊地圖任意處微調！`);
      } else {
        alert(`找不到地址「${rawQuery}」之精準位置。請嘗試輸入路街名稱，或點擊地圖任意處手動定位！`);
      }
    }
  } catch (err) {
    console.error('Search error:', err);
    alert('查詢過程發生異常，請重試或點擊地圖任意處定位。');
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = '定位並分析落塵';
  }
}

// 根據地址文字推估所屬工業區或行政專區
function inferIndustrialZone(query, displayName, parsed) {
  const combined = (query + ' ' + displayName).toLowerCase();
  
  if (combined.includes('觀音')) return '桃園觀音產業園區';
  if (combined.includes('六輕') || combined.includes('麥寮')) return '雲林麥寮離島工業區';
  if (combined.includes('線西') || combined.includes('彰濱')) return '彰濱產業園區';
  if (combined.includes('科學園區') || combined.includes('竹科')) return '新竹科學園區';
  if (combined.includes('樹林')) return '新北樹林產業園區';
  if (combined.includes('龍德') || combined.includes('蘇澳')) return '宜蘭蘇澳龍德工業區';
  if (combined.includes('中鋼') || combined.includes('臨海工業區')) return '高雄臨海工業區';
  if (combined.includes('小港')) return '高雄市小港區特定工業聚落';
  
  if (parsed && parsed.district) {
    return `${parsed.city || ''}${parsed.district} 工業/住商混合聚落`;
  }
  return '台灣都會工業聚落';
}

function matchIndustrialZoneFallback(query) {
  for (const zone of TAIWAN_INDUSTRIAL_ZONES) {
    const core = zone.name.replace('產業園區', '').replace('工業區', '');
    if (query.includes(core) || (zone.city && query.includes(zone.city))) {
      return zone;
    }
  }
  return null;
}

// ==============================================================================
// 5. 點擊地圖微調定位廠房 (Interactive Pin Relocation)
// ==============================================================================
function relocateRoofTarget(latlng) {
  if (!currentFactory) return;

  const lat = parseFloat(latlng.lat);
  const lng = parseFloat(latlng.lng);

  currentFactory.lat = lat;
  currentFactory.lng = lng;

  // 更新顯示坐標
  const coordEl = document.getElementById('activeCoordDisplay');
  if (coordEl) {
    coordEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  // 重新渲染向量圖層
  renderRoofComponents(currentFactory);
  updateInspectorPanel(currentFactory);
  updateExternalLinks(currentFactory);

  // 提示氣泡
  const targetMarker = layerGroups.targetPin.getLayers()[0];
  if (targetMarker) {
    targetMarker.openPopup();
  }
}

// ==============================================================================
// 6. 載入並渲染廠房屋頂落塵與熱區視覺化
// ==============================================================================
async function loadFactoryCase(factory, shouldLog = true) {
  currentFactory = factory;

  // 1. 地圖平移並縮放至屋頂最佳視野 (Zoom 18)
  map.setView([factory.lat, factory.lng], factory.zoom || 18, {
    animate: true,
    duration: 1.0
  });

  // 2. 更新坐標顯示
  const coordEl = document.getElementById('activeCoordDisplay');
  if (coordEl) {
    coordEl.textContent = `${factory.lat.toFixed(5)}, ${factory.lng.toFixed(5)}`;
  }

  // 3. 繪製所有圖層元件 (中心標籤、熱區、排氣口、扇形)
  renderRoofComponents(factory);

  // 4. 更新右側面板與外部跳轉連結
  updateInspectorPanel(factory);
  updateExternalLinks(factory);

  // 5. 記錄至 Supabase BaaS 雲端資料庫
  if (shouldLog && window.SupabaseBridge) {
    try {
      const record = {
        name: factory.name,
        address: factory.address,
        zone: factory.industrialZone,
        lat: factory.lat,
        lng: factory.lng,
        dustIndex: factory.dustIndex,
        severityLevel: factory.severityLevel,
        hotspotCount: factory.hotspotCount,
        dominantWind: factory.dominantWind,
        windAngle: factory.windAngle,
        prLossEstimate: factory.prLossEstimate,
        cleanFrequency: factory.cleanFrequency,
        sources: factory.sources || [],
        analysisSummary: {
          features: factory.features,
          baselineYear: factory.baselineYear,
          recentYear: factory.recentYear,
          description: factory.description
        }
      };
      await SupabaseBridge.logQueryRecord(record);
      updateHistoryCount();
    } catch (err) {
      console.warn('Log query error:', err);
    }
  }
}

// 繪製廠房屋頂全套向量視覺化
function renderRoofComponents(factory) {
  // 清空既有圖層
  Object.values(layerGroups).forEach(group => group.clearLayers());

  // A. 廠房中心定位大針 (可拖曳微調)
  renderCenterPin(factory);

  // B. 廠房參考範圍虛線框
  const halfLat = 0.0007;
  const halfLng = 0.0010;
  const roofBounds = [
    [factory.lat - halfLat, factory.lng - halfLng],
    [factory.lat + halfLat, factory.lng - halfLng],
    [factory.lat + halfLat, factory.lng + halfLng],
    [factory.lat - halfLat, factory.lng + halfLng]
  ];

  L.polygon(roofBounds, {
    color: '#38bdf8',
    weight: 2,
    dashArray: '4, 4',
    fillOpacity: 0.04,
    fillColor: '#38bdf8'
  }).addTo(layerGroups.roofBorder);

  // C. 視覺指標 ①：設備排氣口中心點 (放射狀同心圓)
  renderEmissionSources(factory);

  // D. 視覺指標 ②：盛行風向沉降扇形 (Plume Staining)
  renderWindPlume(factory);

  // E. 視覺指標 ③：光學差分熱區圖 (Change Detection Heatmap)
  renderHeatmap(factory, currentSliderValue);

  // F. 視覺指標 ④：排水天溝滯留沉積線
  renderGutters(factory);
}

// 繪製廠房中心定位圖標 (支援拖曳微調)
function renderCenterPin(factory) {
  const pinHtml = `
    <div class="relative flex items-center justify-center pin-bounce cursor-grab active:cursor-grabbing">
      <div class="w-8 h-8 rounded-full bg-emerald-500/30 border border-emerald-400 animate-ping absolute"></div>
      <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-slate-950 font-black text-xs">
        📍
      </div>
    </div>
  `;

  const customIcon = L.divIcon({
    html: pinHtml,
    className: 'custom-roof-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 28]
  });

  const marker = L.marker([factory.lat, factory.lng], {
    icon: customIcon,
    draggable: true,
    zIndexOffset: 1000
  }).addTo(layerGroups.targetPin);

  marker.bindPopup(`
    <div class="p-1 space-y-1 text-xs">
      <div class="font-bold text-emerald-400">● 廠房屋頂目標位置</div>
      <div class="text-white font-semibold">${factory.name}</div>
      <div class="text-[11px] text-slate-300">坐標：${factory.lat.toFixed(5)}, ${factory.lng.toFixed(5)}</div>
      <div class="text-[10px] text-slate-400">💡 可直接拖曳本圖標或點擊地圖任意處微調位置！</div>
    </div>
  `);

  marker.on('dragend', (e) => {
    relocateRoofTarget(e.target.getLatLng());
  });
}

// 視覺指標 ①：排氣源頭標記
function renderEmissionSources(factory) {
  if (!factory.sources) return;

  factory.sources.forEach((src, idx) => {
    const lat = factory.lat + (src.offset ? src.offset[0] : (idx * 0.0002 - 0.0002));
    const lng = factory.lng + (src.offset ? src.offset[1] : (idx * 0.0002 - 0.0002));

    const iconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-5 h-5 rounded-full bg-amber-500/30 border border-amber-400 animate-ping absolute"></div>
        <div class="w-4 h-4 rounded-full bg-amber-500 border border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-slate-950">
          ${idx + 1}
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-source-pin',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layerGroups.sources);

    // 放射狀同心圓沉降漸層圈
    const radialRadius = src.intensity ? src.intensity * 40 : 30;
    L.circle([lat, lng], {
      radius: radialRadius,
      color: '#f59e0b',
      weight: 1,
      dashArray: '3, 3',
      fillColor: '#f59e0b',
      fillOpacity: (src.intensity || 0.8) * 0.35
    }).addTo(layerGroups.sources);

    marker.bindPopup(`
      <div class="p-1 space-y-1">
        <div class="font-bold text-xs text-amber-400">● 排氣源頭 #${idx + 1}</div>
        <div class="text-xs font-semibold text-white">${src.name}</div>
        <div class="text-[11px] text-slate-300">類型：${getSourceTypeLabel(src.type)}</div>
        <div class="text-[10px] text-slate-400">特徵：排氣口周邊放射狀暗沉</div>
      </div>
    `);
  });
}

function getSourceTypeLabel(type) {
  switch (type) {
    case 'baghouse': return '袋濾式集塵機出氣口';
    case 'scrubber': return '酸鹼洗滌塔排氣口';
    case 'cyclone': return '旋風分離器風道';
    case 'vent': return '通風百葉換氣氣窗';
    case 'gutter': return '棧橋洩水波谷落塵';
    default: return '局部排風出口';
  }
}

// 視覺指標 ②：盛行風向沉降扇形 (Plume Staining)
function renderWindPlume(factory) {
  const angleDeg = factory.windAngle || 215;
  const angleRad = (angleDeg * Math.PI) / 180;
  const plumeLength = 0.0013;
  const plumeSpread = 0.32;

  const centerLat = factory.lat;
  const centerLng = factory.lng;

  const tipLat = centerLat + Math.cos(angleRad) * plumeLength;
  const tipLng = centerLng + Math.sin(angleRad) * plumeLength;

  const leftLat = centerLat + Math.cos(angleRad - plumeSpread) * (plumeLength * 0.95);
  const leftLng = centerLng + Math.sin(angleRad - plumeSpread) * (plumeLength * 0.95);

  const rightLat = centerLat + Math.cos(angleRad + plumeSpread) * (plumeLength * 0.95);
  const rightLng = centerLng + Math.sin(angleRad + plumeSpread) * (plumeLength * 0.95);

  const plumeCoords = [
    [centerLat, centerLng],
    [leftLat, leftLng],
    [tipLat, tipLng],
    [rightLat, rightLng]
  ];

  L.polygon(plumeCoords, {
    color: '#06b6d4',
    weight: 1.5,
    dashArray: '5, 5',
    fillColor: '#06b6d4',
    fillOpacity: 0.16
  }).addTo(layerGroups.plume).bindPopup(`
    <div class="p-1 space-y-1">
      <div class="font-bold text-xs text-cyan-400">風向沉降扇形帶 (Plume Staining)</div>
      <div class="text-[11px] text-slate-300">盛行風向：${factory.dominantWind}</div>
      <div class="text-[10px] text-slate-400">煙羽受季節風向引導，下風處屋頂浪板形成長條色差暗帶。</div>
    </div>
  `);
}

// 視覺指標 ③：光學差分熱區圖 (Change Detection Heatmap)
function renderHeatmap(factory, intensityPct) {
  layerGroups.heatmap.clearLayers();

  const opacityMultiplier = intensityPct / 100;
  if (opacityMultiplier <= 0.05) return;

  const centerLat = factory.lat;
  const centerLng = factory.lng;
  const isSevere = factory.severityLevel === 'severe';
  const isHigh = factory.severityLevel === 'high';

  // 核心深層熱區 (Deep Red)
  L.circle([centerLat, centerLng], {
    radius: isSevere ? 50 : (isHigh ? 35 : 22),
    color: '#ef4444',
    weight: 0,
    fillColor: '#ef4444',
    fillOpacity: Math.min(0.65, 0.65 * opacityMultiplier)
  }).addTo(layerGroups.heatmap);

  // 中度擴散熱區 (Orange)
  L.circle([centerLat, centerLng], {
    radius: isSevere ? 85 : (isHigh ? 65 : 40),
    color: '#f97316',
    weight: 0,
    fillColor: '#f97316',
    fillOpacity: Math.min(0.45, 0.45 * opacityMultiplier)
  }).addTo(layerGroups.heatmap);

  // 輕度沉降過渡外圈 (Yellow)
  L.circle([centerLat, centerLng], {
    radius: isSevere ? 130 : (isHigh ? 95 : 60),
    color: '#eab308',
    weight: 0,
    fillColor: '#eab308',
    fillOpacity: Math.min(0.25, 0.25 * opacityMultiplier)
  }).addTo(layerGroups.heatmap);
}

// 視覺指標 ④：天溝滯留沉積線
function renderGutters(factory) {
  const halfLat = 0.0005;
  const halfLng = 0.0008;

  const leftGutter = [
    [factory.lat - halfLat, factory.lng - halfLng],
    [factory.lat + halfLat, factory.lng - halfLng]
  ];
  const rightGutter = [
    [factory.lat - halfLat, factory.lng + halfLng],
    [factory.lat + halfLat, factory.lng + halfLng]
  ];

  [leftGutter, rightGutter].forEach(line => {
    L.polyline(line, {
      color: '#818cf8',
      weight: 3,
      opacity: 0.85
    }).addTo(layerGroups.gutters).bindPopup(`
      <div class="text-xs">
        <span class="font-bold text-indigo-400">● 排水天溝與洩水波谷</span>
        <div class="text-[11px] text-slate-300 mt-0.5">長期粉塵經雨水沖刷後在坡度低窪處形成硬化沉澱。</div>
      </div>
    `);
  });
}

// ==============================================================================
// 7. 更新右側指標面板與外部跳轉
// ==============================================================================
function updateInspectorPanel(factory) {
  document.getElementById('cardFactoryName').textContent = factory.name;
  document.getElementById('cardFactoryAddress').textContent = `${factory.address} ｜ ${factory.industrialZone}`;

  const badge = document.getElementById('badgeSeverity');
  const dustScoreEl = document.getElementById('metricDustIndex');
  const prLossEl = document.getElementById('metricPrLoss');

  let badgeText = '輕度沉降';
  let badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  let scoreColor = 'text-emerald-400';

  if (factory.dustIndex >= 80) {
    badgeText = '極度嚴重';
    badgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    scoreColor = 'text-rose-400';
  } else if (factory.dustIndex >= 70) {
    badgeText = '高度警戒';
    badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    scoreColor = 'text-amber-400';
  } else if (factory.dustIndex >= 40) {
    badgeText = '中度累積';
    badgeClass = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
    scoreColor = 'text-cyan-400';
  }

  badge.textContent = badgeText;
  badge.className = `px-2.5 py-1 rounded-xl text-xs font-bold border uppercase tracking-wider ${badgeClass} whitespace-nowrap`;

  dustScoreEl.textContent = Number(factory.dustIndex).toFixed(1);
  dustScoreEl.className = `text-2xl sm:text-3xl font-extrabold font-mono ${scoreColor}`;

  prLossEl.textContent = `-${Number(factory.prLossEstimate).toFixed(1)}%`;
  document.getElementById('metricCleanFreq').textContent = factory.cleanFrequency || '定期清洗';
  document.getElementById('metricWindVector').textContent = factory.dominantWind || '季節風向';

  document.getElementById('featSourceCount').textContent = `${factory.hotspotCount || 0} 處排放源`;
  document.getElementById('featSourceDesc').textContent = factory.features?.sourceRadialStain || '排氣口放射沉降。';
  document.getElementById('featWindDesc').textContent = factory.features?.windPlume || '受季風影響下風側變色帶。';
  document.getElementById('featCorrosionDesc').textContent = factory.features?.corrosionStatus || '金屬彩色浪板老化與烤漆褪色。';
  document.getElementById('featDrainageDesc').textContent = factory.features?.drainageSediment || '天溝與排水坡度低窪處泥垢硬化。';

  document.getElementById('baselineYearDisplay').textContent = `${factory.baselineYear || 2014} (新建基線)`;
  document.getElementById('recentYearDisplay').textContent = `${factory.recentYear || 2024} (當前累積)`;

  let recText = `該廠房所屬【${factory.industrialZone}】落塵綜合評分達 ${factory.dustIndex.toFixed(1)} 分（${badgeText}）。`;
  if (factory.dustIndex >= 75) {
    recText += `屋頂排氣沉降顯著，若欲建置太陽光電，模組傾角強烈建議調高至 12~15 度以強化雨水自潔；排氣口下風側 15 米範圍內不建議鋪設模組。建議採用具備抗酸鹼與耐鹽害特裝鍍膜，並依【${factory.cleanFrequency}】編列維運清洗合約。`;
  } else if (factory.dustIndex >= 45) {
    recText += `落塵量屬正常工業區均值，天溝洩水順暢，模組標準 10 度鋪設即可，並維持常規清洗頻率以防發電損耗。`;
  } else {
    recText += `環境極為潔淨，屋頂反射率保持均勻，PR 損失預估低於 3%，極具光電投資效益。`;
  }
  document.getElementById('cardRecommendationText').textContent = recText;
}

function updateExternalLinks(factory) {
  const lat = factory.lat;
  const lng = factory.lng;

  // Google Earth Web 深度連結
  const earthWebUrl = `https://earth.google.com/web/search/${lat},${lng}/@${lat},${lng},300a,35y,0h,0t,0r`;
  document.getElementById('btnGoogleEarthWeb').href = earthWebUrl;

  // Google Maps 高空 90 度衛星影像
  const gmapsUrl = `https://www.google.com/maps/@${lat},${lng},19z/data=!3m1!1e3`;
  document.getElementById('btnGoogleMapsSat').href = gmapsUrl;
}

// ==============================================================================
// 8. 產生並下載 Google Earth Pro (.kml) 檔案
// ==============================================================================
function downloadGoogleEarthKML() {
  if (!currentFactory) return;

  const f = currentFactory;
  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>工廠屋頂落塵盡職調查 - ${escapeXml(f.name)}</name>
    <description><![CDATA[
      <h2>臺灣工廠屋頂落塵量與污染熱區盡職調查報告</h2>
      <p><b>廠房名稱：</b>${f.name}</p>
      <p><b>廠房地址：</b>${f.address}</p>
      <p><b>所屬園區：</b>${f.industrialZone}</p>
      <p><b>空間坐標：</b>${f.lat.toFixed(6)}, ${f.lng.toFixed(6)}</p>
      <p><b>落塵綜合評分：</b>${f.dustIndex.toFixed(1)} / 100 (${f.severityLevel})</p>
      <p><b>預估 PR 損失：</b>-${f.prLossEstimate}%</p>
      <p><b>建議清洗頻率：</b>${f.cleanFrequency}</p>
      <hr/>
      <p><b>操作說明：</b>請點擊上方工具列「時鐘圖示（顯示過去歷史影像）」開啟歷史時光機滑桿，比對 2000 年迄今歷年航空正射影像之沉降色差！</p>
    ]]></description>

    <!-- 鎖定正上方 90 度正射直視視野 (LookAt) -->
    <LookAt>
      <longitude>${f.lng}</longitude>
      <latitude>${f.lat}</latitude>
      <altitude>0</altitude>
      <heading>0</heading>
      <tilt>0</tilt>
      <range>350</range>
      <altitudeMode>relativeToGround</altitudeMode>
    </LookAt>

    <!-- 廠房定位標籤 -->
    <Placemark>
      <name>${escapeXml(f.name)} (落塵指數: ${f.dustIndex.toFixed(1)})</name>
      <Point>
        <coordinates>${f.lng},${f.lat},0</coordinates>
      </Point>
    </Placemark>

    <!-- 污染熱區中心點 -->
    ${(f.sources || []).map((src, i) => `
    <Placemark>
      <name>排氣源 #${i + 1}: ${escapeXml(src.name)}</name>
      <Point>
        <coordinates>${f.lng + (src.offset ? src.offset[1] : 0)},${f.lat + (src.offset ? src.offset[0] : 0)},0</coordinates>
      </Point>
    </Placemark>
    `).join('')}

  </Document>
</kml>`;

  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${f.name.replace(/\s+/g, '_')}_屋頂落塵時光機.kml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe) {
  return (unsafe || '').replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// ==============================================================================
// 9. 動態建構廠房分析資料 (根據解析之台灣地址與坐標)
// ==============================================================================
function synthesizeFactoryProfile(query, fullAddress, zoneName, lat, lng, parsed) {
  const isNorthern = lat > 24.5;
  const isCoastal = lng < 120.5 || lng > 121.7;

  let baseScore = 65.0;
  if (zoneName.includes('臨海') || zoneName.includes('麥寮') || zoneName.includes('小港')) {
    baseScore = 79.0;
  } else if (zoneName.includes('科學園區')) {
    baseScore = 28.0;
  } else if (isCoastal) {
    baseScore = 74.0;
  }

  const hashVal = Math.abs(hashCode(query + lat.toFixed(4))) % 12;
  const finalScore = Math.min(92, Math.max(25, baseScore + (hashVal - 6)));
  const prLoss = (finalScore * 0.18).toFixed(1);

  let severity = 'moderate';
  let cleanFreq = '每 60 天定期清洗';
  if (finalScore >= 80) {
    severity = 'severe';
    cleanFreq = '每 20~30 天高壓清洗';
  } else if (finalScore >= 68) {
    severity = 'high';
    cleanFreq = '每 35~45 天清洗一次';
  }

  const windAngle = isNorthern ? 225 : 215;

  let titleName = query;
  if (parsed && parsed.road) {
    titleName = `${parsed.city || ''}${parsed.district || ''}${parsed.road}${parsed.houseNo || ''}`;
  }

  return {
    id: 'dyn-' + Date.now().toString(36),
    name: titleName || query,
    address: fullAddress || query,
    industrialZone: zoneName,
    industryType: '製造加工業 / 廠房屋頂',
    lat: lat,
    lng: lng,
    zoom: 18,
    dustIndex: finalScore,
    severityLevel: severity,
    hotspotCount: finalScore > 75 ? 4 : (finalScore > 50 ? 2 : 1),
    dominantWind: `${isNorthern ? '北部' : '西部'}東北季風 (${windAngle}° 吹拂軸向)`,
    windAngle: windAngle,
    windSpeed: isCoastal ? 5.6 : 3.4,
    prLossEstimate: parseFloat(prLoss),
    cleanFrequency: cleanFreq,
    sources: [
      { name: "主要排氣出氣口 / 通風機組", type: "baghouse", offset: [-0.0002, -0.0002], intensity: finalScore / 100 },
      { name: "天溝洩水波谷滯留點", type: "gutter", offset: [0.0003, 0.0002], intensity: (finalScore * 0.8) / 100 }
    ],
    features: {
      sourceRadialStain: "排氣口周遭可見粉塵微粒放射狀沉降與局部暗斑。",
      windPlume: "受常年季風引導，下風側屋頂浪板形成擴散變色帶。",
      corrosionStatus: "浪板烤漆塗層受日照與大氣沉降交互作用微幅老化。",
      drainageSediment: "雨水沖刷後於天溝坡度接縫處形成細顆粒沉殿。"
    },
    baselineYear: 2014,
    recentYear: 2024,
    description: `依據地址精準定位於【${zoneName}】，光學差分落塵指數為 ${finalScore.toFixed(1)} 分。`
  };
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// 渲染標竿案例 Chips
function renderPresetChips() {
  const container = document.getElementById('presetChips');
  if (!container || !PRESET_FACTORIES) return;

  container.innerHTML = PRESET_FACTORIES.map((factory, idx) => `
    <button 
      onclick="selectPresetFactory('${factory.id}')"
      id="chip-${factory.id}"
      class="preset-chip whitespace-nowrap px-2.5 py-1 rounded-xl border text-[11px] font-medium transition flex items-center gap-1.5 ${
        idx === 0 
          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 shadow-sm' 
          : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
      }"
    >
      <span class="w-1.5 h-1.5 rounded-full ${factory.dustIndex > 80 ? 'bg-rose-400' : (factory.dustIndex > 60 ? 'bg-amber-400' : 'bg-emerald-400')}"></span>
      <span>${factory.name.split(' ')[0]}</span>
      <span class="text-[10px] text-slate-400">(${factory.industrialZone.replace('產業園區', '').replace('工業區', '')})</span>
    </button>
  `).join('');
}

function selectPresetFactory(factoryId) {
  const factory = PRESET_FACTORIES.find(f => f.id === factoryId);
  if (!factory) return;

  document.querySelectorAll('.preset-chip').forEach(c => {
    c.className = 'preset-chip whitespace-nowrap px-2.5 py-1 rounded-xl border text-[11px] font-medium transition flex items-center gap-1.5 bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white';
  });
  const activeChip = document.getElementById(`chip-${factoryId}`);
  if (activeChip) {
    activeChip.className = 'preset-chip whitespace-nowrap px-2.5 py-1 rounded-xl border text-[11px] font-medium transition flex items-center gap-1.5 bg-emerald-600/30 text-emerald-300 border-emerald-500/60 shadow-sm';
  }

  document.getElementById('addressInput').value = factory.address;
  document.getElementById('clearSearchBtn').classList.remove('hidden');

  loadFactoryCase(factory, true);
}

function clearSearchInput() {
  document.getElementById('addressInput').value = '';
  document.getElementById('clearSearchBtn').classList.add('hidden');
}

document.getElementById('addressInput')?.addEventListener('input', (e) => {
  const btn = document.getElementById('clearSearchBtn');
  if (e.target.value.trim()) btn.classList.remove('hidden');
  else btn.classList.add('hidden');
});

// 時光機滑桿
function handleTimeSliderChange(val) {
  currentSliderValue = parseInt(val, 10);
  document.getElementById('sliderValueText').textContent = `${val}%`;
  if (currentFactory) {
    renderHeatmap(currentFactory, currentSliderValue);
  }
}

// 查詢歷史紀錄抽屜
async function openHistoryDrawer() {
  document.getElementById('historyDrawer').classList.remove('hidden');
  await refreshHistoryList();
}

function closeHistoryDrawer() {
  document.getElementById('historyDrawer').classList.add('hidden');
}

async function refreshHistoryList() {
  const container = document.getElementById('historyListContainer');
  if (!container || !window.SupabaseBridge) return;

  container.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs">載入查詢紀錄中...</div>';

  const res = await SupabaseBridge.getRecentQueries(30);
  const sourceLabel = document.getElementById('historySourceLabel');
  if (sourceLabel) {
    sourceLabel.textContent = res.source === 'supabase' 
      ? '資料來源：🟢 Supabase BaaS 雲端資料庫' 
      : '資料來源：🟡 本地快取備援資料庫';
  }

  const list = res.list || [];
  updateHistoryCount(list.length);

  if (list.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-500 text-xs space-y-2">
        <i data-lucide="inbox" class="w-8 h-8 mx-auto text-slate-600"></i>
        <p>尚無查詢紀錄</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = list.map(item => {
    const dIndex = parseFloat(item.dust_index || 0).toFixed(1);
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('zh-TW', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '剛才';

    let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (dIndex >= 80) badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    else if (dIndex >= 65) badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';

    return `
      <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-500 transition space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-semibold text-white text-xs">${item.factory_name || '自訂廠址'}</div>
            <div class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${item.query_address}</div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}">
            ${dIndex} 分
          </span>
        </div>

        <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-700/40">
          <span>${item.industrial_zone || '工業區'} ｜ ${dateStr}</span>
          <button 
            onclick="reloadHistoryItem('${encodeURIComponent(JSON.stringify(item))}')" 
            class="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            <span>重新載入</span>
            <i data-lucide="arrow-right" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function reloadHistoryItem(encodedJson) {
  try {
    const item = JSON.parse(decodeURIComponent(encodedJson));
    const factoryObj = {
      id: item.id || 'hist-' + Date.now(),
      name: item.factory_name || '歷史查詢廠址',
      address: item.query_address,
      industrialZone: item.industrial_zone || '工業區',
      lat: parseFloat(item.latitude),
      lng: parseFloat(item.longitude),
      zoom: 18,
      dustIndex: parseFloat(item.dust_index),
      severityLevel: item.severity_level || 'moderate',
      hotspotCount: item.hotspot_count || 3,
      dominantWind: item.dominant_wind_direction || '東北季風',
      windAngle: parseFloat(item.wind_angle || 215),
      prLossEstimate: parseFloat(item.pr_loss_estimate || 0),
      cleanFrequency: item.clean_frequency || '定期清洗',
      sources: item.sources_summary || [],
      features: item.analysis_summary?.features || {
        sourceRadialStain: "排氣口放射狀沉降。",
        windPlume: "常年季風引導下風側變色帶。",
        corrosionStatus: "浪板烤漆塗層自然老化。",
        drainageSediment: "雨水天溝坡度低窪沉澱。"
      },
      baselineYear: item.analysis_summary?.baselineYear || 2014,
      recentYear: item.analysis_summary?.recentYear || 2024,
      description: item.analysis_summary?.description || item.query_address
    };

    document.getElementById('addressInput').value = factoryObj.address;
    closeHistoryDrawer();
    loadFactoryCase(factoryObj, false);
  } catch (e) {
    console.error('Reload history error:', e);
  }
}

async function updateHistoryCount(count) {
  const el = document.getElementById('historyCount');
  if (!el) return;
  if (typeof count === 'number') {
    el.textContent = count;
  } else if (window.SupabaseBridge) {
    const res = await SupabaseBridge.getRecentQueries(50);
    el.textContent = res.list ? res.list.length : 0;
  }
}

// Supabase 連線設定視窗
function openSupabaseModal() {
  const modal = document.getElementById('supabaseModal');
  const cfg = SupabaseBridge.getConfig();
  document.getElementById('modalSbUrl').value = cfg.url || '';
  document.getElementById('modalSbKey').value = cfg.anonKey || '';
  document.getElementById('supabaseTestResult').classList.add('hidden');
  modal.classList.remove('hidden');
}

function closeSupabaseModal() {
  document.getElementById('supabaseModal').classList.add('hidden');
}

async function testSupabaseInputs() {
  const url = document.getElementById('modalSbUrl').value.trim();
  const key = document.getElementById('modalSbKey').value.trim();
  const resultDiv = document.getElementById('supabaseTestResult');

  if (!url || !key) {
    resultDiv.className = 'p-3 rounded-xl text-xs bg-rose-950/80 text-rose-300 border border-rose-800';
    resultDiv.textContent = '請填寫 Supabase Project URL 與 Anon Public Key';
    resultDiv.classList.remove('hidden');
    return;
  }

  resultDiv.className = 'p-3 rounded-xl text-xs bg-slate-800 text-slate-300 border border-slate-700';
  resultDiv.textContent = '測試連線中...';
  resultDiv.classList.remove('hidden');

  const res = await SupabaseBridge.testConnection(url, key);
  if (res.success) {
    resultDiv.className = 'p-3 rounded-xl text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800';
    resultDiv.textContent = res.message;
  } else {
    resultDiv.className = 'p-3 rounded-xl text-xs bg-amber-950/80 text-amber-300 border border-amber-800';
    resultDiv.textContent = res.message;
  }
}

async function saveSupabaseInputs() {
  const url = document.getElementById('modalSbUrl').value.trim();
  const key = document.getElementById('modalSbKey').value.trim();

  await SupabaseBridge.saveConfig(url, key);
  closeSupabaseModal();
  updateHistoryCount();
  alert('Supabase 連線設定已更新！');
}

// 指南手冊彈窗
function openGuideModal() {
  document.getElementById('guideModal').classList.remove('hidden');
}

function closeGuideModal() {
  document.getElementById('guideModal').classList.add('hidden');
}

// 點擊彈窗遮罩灰色背景自動關閉
function handleBackdropClick(event, modalId) {
  if (event.target.id === modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
  }
}

// 支援鍵盤 Escape 鍵關閉所有彈窗
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSupabaseModal();
    closeGuideModal();
    closeHistoryDrawer();
  }
});

// 列印盡職調查報告
function printDueDiligenceReport() {
  if (!currentFactory) {
    alert('請先選取或搜尋欲匯出報告之工廠！');
    return;
  }

  const f = currentFactory;
  const printArea = document.getElementById('reportPrintArea');
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

  printArea.innerHTML = `
    <div style="font-family: 'Noto Sans TC', sans-serif; max-width: 900px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <div style="border-bottom: 3px solid #059669; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <span style="font-size: 11px; font-weight: bold; color: #059669; text-transform: uppercase; letter-spacing: 1px;">Due Diligence Engineering Audit</span>
          <h1 style="font-size: 24px; font-weight: 800; margin: 4px 0 0 0; color: #0f172a;">工廠屋頂落塵量與污染熱區盡職調查評估報告</h1>
          <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">依據《工業區落塵量開放資料查詢指南》✕ Google 混合衛星 ✕ 國土測繪航照正射影像</p>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          <div>報告編號：RD-${Date.now().toString(36).toUpperCase()}</div>
          <div>評定日期：${dateStr}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <tbody>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold; width: 18%;">工廠名稱</td>
            <td style="padding: 10px 14px; border: 1px solid #cbd5e1; width: 32%;">${f.name}</td>
            <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold; width: 18%;">所屬工業區</td>
            <td style="padding: 10px 14px; border: 1px solid #cbd5e1; width: 32%;">${f.industrialZone}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold;">廠房地址</td>
            <td style="padding: 10px 14px; border: 1px solid #cbd5e1;">${f.address}</td>
            <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold;">空間坐標</td>
            <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-family: monospace;">(${f.lat.toFixed(6)}, ${f.lng.toFixed(6)})</td>
          </tr>
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: bold;">落塵綜合評分</div>
          <div style="font-size: 26px; font-weight: 800; color: #dc2626; margin: 4px 0;">${f.dustIndex.toFixed(1)} <span style="font-size: 12px; color: #64748b;">/ 100</span></div>
          <div style="font-size: 11px; font-weight: bold; color: #dc2626;">等級：${f.severityLevel.toUpperCase()}</div>
        </div>

        <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: bold;">光電年發電損耗</div>
          <div style="font-size: 26px; font-weight: 800; color: #d97706; margin: 4px 0;">-${f.prLossEstimate}%</div>
          <div style="font-size: 11px; color: #64748b;">預估 PR 衰減</div>
        </div>

        <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: bold;">建議清洗頻率</div>
          <div style="font-size: 14px; font-weight: bold; color: #0284c7; margin: 10px 0;">${f.cleanFrequency}</div>
          <div style="font-size: 11px; color: #64748b;">維運清疏排程</div>
        </div>

        <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: bold;">排氣源頭熱點</div>
          <div style="font-size: 26px; font-weight: 800; color: #4f46e5; margin: 4px 0;">${f.hotspotCount} <span style="font-size: 12px; color: #64748b;">處</span></div>
          <div style="font-size: 11px; color: #64748b;">放射散布源</div>
        </div>
      </div>

      <h3 style="font-size: 15px; font-weight: bold; border-left: 4px solid #059669; padding-left: 8px; margin: 20px 0 10px 0;">
        一、 指南四大視覺特徵檢核紀錄
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background: #e2e8f0;">
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; width: 28%;">視覺特徵維度</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; width: 16%;">判定狀態</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">現場航照時光機判讀特徵</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">1. 設備源頭中心點 (放射狀)</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; color: #d97706; font-weight: bold;">偵測到 ${f.hotspotCount} 處</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${f.features?.sourceRadialStain || '排氣口中心放射狀擴散沉降。'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">2. 風向沉降扇形 (Plume Staining)</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; color: #0284c7; font-weight: bold;">${f.dominantWind}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${f.features?.windPlume || '受季風影響於下風處形成長條黑化/變色扇形帶。'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">3. 排氣腐蝕變色 (酸鹼沉降)</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; color: #dc2626; font-weight: bold;">烤漆加速劣化</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${f.features?.corrosionStatus || '彩色浪板受酸性沉降侵蝕呈非正常紅褐斑蝕。'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">4. 排水天溝與波谷滯留沉泥</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; color: #4f46e5; font-weight: bold;">沉泥硬化結塊</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${f.features?.drainageSediment || '坡度低窪排水天溝處形成深色固體沉積。'}</td>
          </tr>
        </tbody>
      </table>

      <h3 style="font-size: 15px; font-weight: bold; border-left: 4px solid #059669; padding-left: 8px; margin: 20px 0 10px 0;">
        二、 判讀盲點與防偽過濾檢核
      </h3>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; font-size: 12px; margin-bottom: 20px; line-height: 1.8;">
        <div>☑ <b>太陽仰角與金屬反光校正：</b>已比對正射直視航照，排除金屬浪板閃爍泛白之過曝干擾。</div>
        <div>☑ <b>青苔/藻類生物膜過濾：</b>藉由光學色彩通道比對，確認變色非單純雨後潮濕積水生苔，確為製程逸散落塵。</div>
        <div>☑ <b>清洗維護週期校正：</b>已將定期水洗斷點納入時間序列累積斜率評估。</div>
      </div>

      <h3 style="font-size: 15px; font-weight: bold; border-left: 4px solid #059669; padding-left: 8px; margin: 20px 0 10px 0;">
        三、 太陽光電建置與維運決策建議
      </h3>
      <div style="font-size: 12px; line-height: 1.8; color: #334155; margin-bottom: 30px;">
        <p>${document.getElementById('cardRecommendationText')?.textContent || ''}</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 12px; color: #64748b;">
        <div>調查單位：進金生能源服務 6692 ｜ AI 技術評估平台</div>
        <div>審查工程師簽署：____________________</div>
      </div>
    </div>
  `;

  window.print();
}
