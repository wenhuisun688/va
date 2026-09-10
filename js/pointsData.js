// ===== 数据加载模块 =====
// 数据来源优先级：user-data/points.json（文件）> localStorage > 默认数据
// 你的点位数据保存在 user-data/points.json

const DATA_FILE = 'user-data/points.json';
const DATA_API = '/api/load-data';
const LOCAL_KEY = 'valorant-points-data';

// 全局变量（保持向后兼容）
let MAPS = [];
let SIDE_LABELS = {};
let POINTS_DATA = {};

let _dataLoaded = false;
let _dirty = false;
let _loadPromise = null;

async function loadPointsData() {
  if (_loadPromise) return _loadPromise;
  
  _loadPromise = new Promise(async (resolve) => {
    let raw = null;
    
    // 1. 优先从 API 加载（带备份恢复机制）
    try {
      const resp = await fetch(DATA_API + '?t=' + Date.now());
      if (resp.ok) {
        raw = await resp.json();
        console.log('从 API 加载点位数据（支持备份恢复）');
        localStorage.setItem(LOCAL_KEY, JSON.stringify(raw));
      }
    } catch(e) {
      console.warn('无法从 API 加载，尝试直接读取文件');
    }
    
    // 1b. API 加载失败，直接从文件加载
    if (!raw) {
      try {
        const resp = await fetch(DATA_FILE + '?t=' + Date.now());
        if (resp.ok) {
          raw = await resp.json();
          console.log('从文件直接加载点位数据');
          localStorage.setItem(LOCAL_KEY, JSON.stringify(raw));
        }
      } catch(e) {
        console.warn('无法加载数据文件，尝试 localStorage');
      }
    }
    
    // 2. 文件加载失败，从 localStorage 读取
    if (!raw) {
      try {
        const ls = localStorage.getItem(LOCAL_KEY);
        if (ls) {
          raw = JSON.parse(ls);
          console.log('从 localStorage 加载点位数据');
        try { fetch('/api/save-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw) }); } catch(e) {};
        }
      } catch(e) {}
    }
    
    // 3. 都没有，用空数据兜底
    if (!raw) raw = { maps: [], sideLabels: {}, points: {} };
    
    // 写入全局变量
    MAPS = raw.maps || [];
    SIDE_LABELS = raw.sideLabels || {};
    POINTS_DATA = raw.points || {};
    if (!SIDE_LABELS.attack) SIDE_LABELS.attack = '进攻方';
    if (!SIDE_LABELS.defense) SIDE_LABELS.defense = '防守方';
    
    _dataLoaded = true;
    resolve();
  });
  
  return _loadPromise;
}

// 保存到文件（自动写回 user-data/points.json）+ 同步到 localStorage
async function savePointsToFile() {
  try {
    const data = {
      maps: MAPS,
      sideLabels: SIDE_LABELS,
      points: POINTS_DATA
    };
    // 先同步到 localStorage
    savePointsToLocal();
    // 再保存到文件
    const resp = await fetch("/api/save-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await resp.json();
    if (result.ok) console.log("✓ 点位数据已保存到 user-data/points.json");
  } catch(e) {
    console.warn("无法保存到文件，仅保存到 localStorage");
  }
}

function savePointsToLocal() {
  _dirty = true;
  var d = { maps: MAPS, sideLabels: SIDE_LABELS, points: POINTS_DATA };
  localStorage.setItem(LOCAL_KEY, JSON.stringify(d));
}

// 导出数据文件（下载 JSON）
function exportPointsData() {
  const data = {
    maps: MAPS,
    sideLabels: SIDE_LABELS,
    points: POINTS_DATA
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'points-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getPoints(mapId) {
  return POINTS_DATA[mapId] || [];
}

function findPoint(mapId, pointId) {
  const pts = getPoints(mapId);
  return pts.find(p => p.id === pointId) || null;
}

function startAutoSave() {
  setInterval(function() {
    if (_dirty) {
      savePointsToFile();
      _dirty = false;
    }
  }, 15000);
  window.addEventListener("beforeunload", function() {
    if (_dirty) {
      var d = { maps: MAPS, sideLabels: SIDE_LABELS, points: POINTS_DATA };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(d));
    }
  });
}
