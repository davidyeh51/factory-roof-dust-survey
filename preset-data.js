/**
 * preset-data.js
 * 台灣代表性工業區與高落塵/低落塵工廠標竿資料庫
 * 涵蓋：鋼鐵、石化、水泥、發電、化纖、半導體高科技廠與沿海工業區
 */

const PRESET_FACTORIES = [
  {
    id: "f-01",
    name: "中鋼公司 高雄小港總廠",
    address: "高雄市小港區中鋼路1號",
    industrialZone: "高雄臨海工業區",
    industryType: "一貫作業煉鋼業",
    lat: 22.54898,
    lng: 120.34752,
    zoom: 18,
    dustIndex: 88.5,
    severityLevel: "severe",
    hotspotCount: 6,
    dominantWind: "東北季風 (225° 吹拂軸向)",
    windAngle: 225,
    windSpeed: 4.8,
    prLossEstimate: 16.8,
    cleanFrequency: "每 20~30 天密集清洗 (建議配備高壓自動沖洗)",
    sources: [
      { name: "1號燒結機袋濾式集塵出口", type: "baghouse", offset: [-0.0004, -0.0003], intensity: 0.95 },
      { name: "煉焦爐頂廢氣集氣罩", type: "scrubber", offset: [0.0003, -0.0005], intensity: 0.88 },
      { name: "高爐出鐵場局部排氣風管", type: "cyclone", offset: [-0.0002, 0.0004], intensity: 0.92 },
      { name: "礦砂轉運棧橋天溝落塵點", type: "gutter", offset: [0.0005, 0.0002], intensity: 0.82 }
    ],
    features: {
      sourceRadialStain: "袋濾排氣口呈顯著黑色氧化鐵煙塵放射狀沉降",
      windPlume: "冬季受東北風導向，西南側彩鋼屋頂形成長條黑化扇形帶",
      corrosionStatus: "浪板鍍鋅烤漆受酸性二氧化硫侵蝕，呈現局部紅褐斑蝕",
      drainageSediment: "天溝與落水管坡度處積聚深層硬化鐵粉泥垢"
    },
    baselineYear: 2012,
    recentYear: 2024,
    description: "高雄小港臨海工業區核心重工業源頭，屋頂表面呈現強烈鐵礦砂及高爐飛灰沉降，光電模組耐酸與防塵係數要求極高。"
  },
  {
    id: "f-02",
    name: "台灣中油 大林煉油廠",
    address: "高雄市小港區中林路1號",
    industrialZone: "高雄臨海工業區",
    industryType: "石油煉製與石化基本原料業",
    lat: 22.52981,
    lng: 120.35412,
    zoom: 18,
    dustIndex: 82.0,
    severityLevel: "severe",
    hotspotCount: 5,
    dominantWind: "東北季風 (220° 吹拂軸向)",
    windAngle: 220,
    windSpeed: 4.2,
    prLossEstimate: 14.5,
    cleanFrequency: "每 30 天清洗一次 (注意硫化物防護)",
    sources: [
      { name: "重油催化裂解 (FCC) 排氣塔", type: "scrubber", offset: [-0.0003, -0.0002], intensity: 0.91 },
      { name: "硫磺回收處理單元排風口", type: "scrubber", offset: [0.0004, 0.0002], intensity: 0.85 },
      { name: "加熱爐低氮燃燒器對流段", type: "vent", offset: [-0.0001, 0.0003], intensity: 0.79 }
    ],
    features: {
      sourceRadialStain: "催化裂解排氣口周邊呈顯著微細觸媒催化粉塵沉降",
      windPlume: "常年煙羽沉降延伸至西南側槽區與倉庫屋面",
      corrosionStatus: "硫氧化物氣體凝結導致彩色浪板加速褪色與粉化",
      drainageSediment: "波谷積存含油微粒與酸性凝結水殘留物"
    },
    baselineYear: 2014,
    recentYear: 2024,
    description: "大型石化廠區，複合含硫廢氣與顆粒沉降，具備高腐蝕性與中高遮蔽度特徵。"
  },
  {
    id: "f-03",
    name: "台塑麥寮六輕 塑化合成廠",
    address: "雲林縣麥寮鄉工業路1號",
    industrialZone: "雲林麥寮離島工業區",
    industryType: "大型綜合石化園區",
    lat: 23.79155,
    lng: 120.18789,
    zoom: 17,
    dustIndex: 85.0,
    severityLevel: "severe",
    hotspotCount: 7,
    dominantWind: "強烈東北季風 (215° 吹拂軸向)",
    windAngle: 215,
    windSpeed: 6.5,
    prLossEstimate: 15.2,
    cleanFrequency: "每 25~30 天清洗一次 (需抗海鹽霧與粉塵結垢)",
    sources: [
      { name: "煤炭封閉式倉儲微細溢散源", type: "vent", offset: [-0.0005, -0.0004], intensity: 0.89 },
      { name: "汽電共生廠煙氣排放塔", type: "scrubber", offset: [0.0004, -0.0003], intensity: 0.93 },
      { name: "烯烴分離單元冷卻塔水霧飛散", type: "vent", offset: [0.0002, 0.0005], intensity: 0.78 }
    ],
    features: {
      sourceRadialStain: "強風條件下排氣源呈長條拖尾而非對稱同心圓",
      windPlume: "冬季東北季風高達 6~8 級，下風處屋頂大面積沉降",
      corrosionStatus: "海風高鹽霧度與化學酸霧雙重加速金屬浪板鏽蝕劣化",
      drainageSediment: "天溝受鹽分結晶與煤灰複合硬化堵塞"
    },
    baselineYear: 2011,
    recentYear: 2024,
    description: "台灣最大填海造陸石化重鎮，臨海強風環境加劇落塵擴散，光電支架與模組表面受落塵與鹽害雙重影響。"
  },
  {
    id: "f-04",
    name: "亞洲水泥 花蓮製造廠",
    address: "花蓮縣新城鄉新豐1號",
    industrialZone: "花蓮新城水泥特定專區",
    industryType: "水泥熟料與研磨加工業",
    lat: 24.13524,
    lng: 121.63721,
    zoom: 18,
    dustIndex: 91.0,
    severityLevel: "severe",
    hotspotCount: 5,
    dominantWind: "沿海縱谷東北風 (210° 吹拂軸向)",
    windAngle: 210,
    windSpeed: 3.8,
    prLossEstimate: 18.5,
    cleanFrequency: "每 15~20 天極密集清洗 (石灰粉塵吸濕硬化風險極高)",
    sources: [
      { name: "水泥旋窯生料磨袋濾集塵器出風口", type: "baghouse", offset: [-0.0002, -0.0003], intensity: 0.98 },
      { name: "熟料冷卻機 (Clinker Cooler) 排風塔", type: "cyclone", offset: [0.0003, -0.0001], intensity: 0.94 },
      { name: "石灰石卸料坑百葉換氣口", type: "vent", offset: [-0.0004, 0.0002], intensity: 0.86 }
    ],
    features: {
      sourceRadialStain: "排氣口四周呈現極顯著之灰白色、高反射率石灰粉塵沉降圈",
      windPlume: "白色粉塵帶往西南側擴散，覆蓋大面積彩色烤漆屋瓦",
      corrosionStatus: "鹼性石灰遇雨水化合生成碳酸鈣硬殼，造成光學穿透急遽衰減",
      drainageSediment: "排水天溝硬結白色水泥泥漿結塊，排水斷面嚴重縮減"
    },
    baselineYear: 2013,
    recentYear: 2024,
    description: "典型水泥粉塵高污染熱區。白色粉塵具備遇水固化結晶特性，對太陽能玻璃表面具有強烈附著性，若不清洗將永久損傷 PR。"
  },
  {
    id: "f-05",
    name: "台電 台中發電廠 (中火)",
    address: "台中市龍井區三港路300號",
    industrialZone: "台中港關連工業區周邊",
    industryType: "燃煤火力發電廠",
    lat: 24.21285,
    lng: 120.48512,
    zoom: 17,
    dustIndex: 79.5,
    severityLevel: "high",
    hotspotCount: 4,
    dominantWind: "台灣海峽東北季風 (225° 吹拂軸向)",
    windAngle: 225,
    windSpeed: 5.5,
    prLossEstimate: 13.6,
    cleanFrequency: "每 35~45 天清洗一次",
    sources: [
      { name: "生煤圓形堆置室轉運接頭", type: "vent", offset: [-0.0003, -0.0004], intensity: 0.86 },
      { name: "脫硝 (SCR) 與靜電集塵 (ESP) 聯通風道", type: "cyclone", offset: [0.0003, -0.0002], intensity: 0.82 }
    ],
    features: {
      sourceRadialStain: "煤粉飛灰呈現細顆粒黑色碳粒沉降",
      windPlume: "冬季沿台中港區向西南方彰化伸港方向延伸擴散",
      corrosionStatus: "大型屋頂表面因煙氣酸性微粒出現氧化剝落",
      drainageSediment: "雨水沖刷後於低窪屋簷累積黑色細泥"
    },
    baselineYear: 2012,
    recentYear: 2024,
    description: "中部大型發電設施周邊，受季風影響顯著，秋冬季粉塵累積斜率顯著大於春夏季。"
  },
  {
    id: "f-06",
    name: "長春人造樹脂 觀音工廠",
    address: "桃園市觀音區工業四路22號",
    industrialZone: "桃園觀音產業園區",
    industryType: "特用化學品與合成樹脂業",
    lat: 25.05691,
    lng: 121.11978,
    zoom: 18,
    dustIndex: 74.0,
    severityLevel: "high",
    hotspotCount: 4,
    dominantWind: "北部東北季風 (230° 吹拂軸向)",
    windAngle: 230,
    windSpeed: 4.1,
    prLossEstimate: 11.2,
    cleanFrequency: "每 40~50 天清洗一次",
    sources: [
      { name: "酚醛樹脂反應槽尾氣洗滌塔", type: "scrubber", offset: [-0.0002, -0.0001], intensity: 0.88 },
      { name: "乾燥包裝室旋風分離器排風", type: "cyclone", offset: [0.0002, -0.0003], intensity: 0.79 },
      { name: "鍋爐煙囪排氣管口", type: "vent", offset: [0.0001, 0.0003], intensity: 0.75 }
    ],
    features: {
      sourceRadialStain: "洗滌塔頂部有有機溶劑與微細樹脂粉沉積深褐色斑",
      windPlume: "西南向屋頂局部變色帶，與周邊無排氣棟對比鮮明",
      corrosionStatus: "化學酸氣導致金屬自攻螺絲與接縫處生鏽",
      drainageSediment: "天溝局部滯留微量凝膠化有機殘留泥垢"
    },
    baselineYear: 2015,
    recentYear: 2024,
    description: "桃園觀音工業區典型特用化學廠，排氣口具備局部高強度有機粉塵附著，需定期針對排氣口下風處強化巡檢。"
  },
  {
    id: "f-07",
    name: "台灣水泥 蘇澳廠",
    address: "宜蘭縣蘇澳鎮自強路1號",
    industrialZone: "宜蘭蘇澳龍德工業區",
    industryType: "水泥熟料及製品業",
    lat: 24.60742,
    lng: 121.84891,
    zoom: 18,
    dustIndex: 86.5,
    severityLevel: "severe",
    hotspotCount: 5,
    dominantWind: "蘭陽平原東北季風 (215° 吹拂軸向)",
    windAngle: 215,
    windSpeed: 3.5,
    prLossEstimate: 17.0,
    cleanFrequency: "每 20 天定期高壓清洗",
    sources: [
      { name: "水泥粉磨機組集塵放出口", type: "baghouse", offset: [-0.0002, -0.0002], intensity: 0.94 },
      { name: "礦石輸送帶落料轉運站", type: "cyclone", offset: [0.0003, 0.0002], intensity: 0.87 }
    ],
    features: {
      sourceRadialStain: "集塵出風口周邊圓形白灰濃密覆蓋",
      windPlume: "東北季風攜帶微細灰塵向廠區西南側浪板大量沉積",
      corrosionStatus: "高濕度多雨環境使石灰粉加速水化附著，形成堅硬結垢",
      drainageSediment: "屋簷排水溝因沉積物硬化堵塞，常有漫流溢水現象"
    },
    baselineYear: 2014,
    recentYear: 2024,
    description: "宜蘭多雨氣候與水泥粉塵交互作用，導致落塵極易硬化於屋面與太陽能板，需提高沖洗頻率並加強排水天溝清疏。"
  },
  {
    id: "f-08",
    name: "南亞塑膠 樹林工廠",
    address: "新北市樹林區俊英街160號",
    industrialZone: "新北樹林產業園區",
    industryType: "塑膠薄膜與合成皮製造業",
    lat: 25.00945,
    lng: 121.43210,
    zoom: 18,
    dustIndex: 62.0,
    severityLevel: "moderate",
    hotspotCount: 3,
    dominantWind: "大台北盆地東南/東北季風",
    windAngle: 210,
    windSpeed: 2.8,
    prLossEstimate: 8.5,
    cleanFrequency: "每 60 天清洗一次",
    sources: [
      { name: "壓延機熱氣排風百葉扇", type: "vent", offset: [-0.0002, -0.0001], intensity: 0.72 },
      { name: "塑化粒供料乾燥機出氣管", type: "cyclone", offset: [0.0002, 0.0002], intensity: 0.68 }
    ],
    features: {
      sourceRadialStain: "排氣口周圍有輕微增塑劑油氣冷凝暗色光澤斑",
      windPlume: "擴散距離較短，主要侷限於排氣棟周邊 15 米範圍",
      corrosionStatus: "烤漆浪板狀態尚可，僅局部老舊接縫褪色",
      drainageSediment: "天溝有一般泥沙落葉與少量有機浮油"
    },
    baselineYear: 2016,
    recentYear: 2024,
    description: "新北都會型工業區，落塵程度屬中度，主要為局部熱氣與油性微粒，一般水洗維護即可維持效能。"
  },
  {
    id: "f-09",
    name: "台積電 晶圓十二廠 (竹科總部)",
    address: "新竹科學園區新竹市力行六路8號",
    industrialZone: "新竹科學園區",
    industryType: "半導體積體電路製造業",
    lat: 24.77258,
    lng: 121.01422,
    zoom: 18,
    dustIndex: 22.0,
    severityLevel: "low",
    hotspotCount: 1,
    dominantWind: "新竹九降風/東北季風 (225°)",
    windAngle: 225,
    windSpeed: 4.5,
    prLossEstimate: 2.8,
    cleanFrequency: "每 90~120 天例行維護 (落塵極低基準組)",
    sources: [
      { name: "高效VOC沸石轉輪洗滌煙囪", type: "scrubber", offset: [0.0001, 0.0001], intensity: 0.25 }
    ],
    features: {
      sourceRadialStain: "無明顯肉眼可見之放射狀污染暗斑",
      windPlume: "屋面保持高度均勻反射率，無異常色差長條帶",
      corrosionStatus: "高品質潔淨塗裝，無異常酸蝕老化",
      drainageSediment: "天溝排水暢通，沉降物極少"
    },
    baselineYear: 2018,
    recentYear: 2024,
    description: "高科技園區標竿對照組。廢氣經多道半導體級洗滌處理，屋頂維護潔淨度極高，可作為「清潔基準 Baseline」之對比範例。"
  },
  {
    id: "f-10",
    name: "彰濱工業區 線西複合加工廠",
    address: "彰化縣線西鄉線工路3號",
    industrialZone: "彰濱產業園區 (線西區)",
    industryType: "金屬製品與沿海機械加工業",
    lat: 24.12640,
    lng: 120.42850,
    zoom: 17,
    dustIndex: 78.0,
    severityLevel: "high",
    hotspotCount: 4,
    dominantWind: "沿海強烈東北季風 (220° 吹拂軸向)",
    windAngle: 220,
    windSpeed: 6.2,
    prLossEstimate: 12.8,
    cleanFrequency: "每 30~45 天清洗一次 (沿海飛沙與鹽分)",
    sources: [
      { name: "噴砂除鏽袋濾集塵室出口", type: "baghouse", offset: [-0.0003, -0.0002], intensity: 0.86 },
      { name: "熱浸鍍鋅酸洗洗滌塔", type: "scrubber", offset: [0.0002, -0.0003], intensity: 0.81 }
    ],
    features: {
      sourceRadialStain: "噴砂排風口周邊有顯著金屬微粒沉降暗區",
      windPlume: "沿海飛沙與金屬粉塵沿風向沉積於南側屋頂波谷",
      corrosionStatus: "強海風環境下鍍鋅波浪浪板加速銹蝕泛黃",
      drainageSediment: "屋簷天溝嚴重沉積風飛沙與研磨粉塵"
    },
    baselineYear: 2015,
    recentYear: 2024,
    description: "彰濱沿海開闊工業區，秋冬季節風飛沙嚴重，金屬粉塵與海鹽複合沉降，排水波谷與浪板接合處極易堆積。"
  }
];

// 台灣主要工業區與科學園區中心坐標字典（備用坐標快查庫）
const TAIWAN_INDUSTRIAL_ZONES = [
  { name: "高雄臨海工業區", city: "高雄市", lat: 22.545, lng: 120.350, zoom: 16 },
  { name: "桃園觀音產業園區", city: "桃園市", lat: 25.055, lng: 121.120, zoom: 16 },
  { name: "雲林麥寮離島工業區", city: "雲林縣", lat: 23.790, lng: 120.190, zoom: 15 },
  { name: "花蓮新城水泥專區", city: "花蓮縣", lat: 24.135, lng: 121.635, zoom: 16 },
  { name: "台中港關連工業區", city: "台中市", lat: 24.230, lng: 120.510, zoom: 16 },
  { name: "宜蘭蘇澳龍德工業區", city: "宜蘭縣", lat: 24.610, lng: 121.845, zoom: 16 },
  { name: "新竹科學園區", city: "新竹市", lat: 24.775, lng: 121.015, zoom: 16 },
  { name: "彰濱產業園區 (線西/鹿港)", city: "彰化縣", lat: 24.125, lng: 120.430, zoom: 15 },
  { name: "新北樹林產業園區", city: "新北市", lat: 25.010, lng: 121.430, zoom: 16 },
  { name: "台南南部科學園區", city: "台南市", lat: 23.115, lng: 120.275, zoom: 16 },
  { name: "高雄林園石化工業區", city: "高雄市", lat: 22.495, lng: 120.395, zoom: 16 },
  { name: "屏東科技產業園區", city: "屏東縣", lat: 22.655, lng: 120.465, zoom: 16 }
];
