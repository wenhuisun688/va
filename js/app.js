// ===== 应用主控制器 (纯 class 驱动导航) =====

let mapEngine = null;
let currentPage = "menu";
let isTransitioning = false;
const TRANSITION_MS = 280;

async function initApp() {
  await loadPointsData();
  
  startAutoSave();
  renderMenu();
  renderMapTabs();
  mapEngine = new MapEngine();
  initEditor();

  if (MAPS.length > 0) {
    mapEngine.loadMap(MAPS[0].id);
  }

  // 保存按钮：先存到文件，再下载到本地
  var saveBtn = document.getElementById("btn-save-points");
  if (saveBtn) {
    saveBtn.addEventListener("click", function() {
      savePointsToFile().then(function() {
        exportPointsData();
        saveBtn.classList.add("saved");
        saveBtn.querySelector("span").textContent = "已保存";
        setTimeout(function() {
          saveBtn.classList.remove("saved");
          saveBtn.querySelector("span").textContent = "保存";
        }, 2000);
      }).catch(function() {
        exportPointsData();
      });
    });
  }

  document.getElementById("btn-back-menu").addEventListener("click", () => {
    navigateTo("menu");
  });
}

// ===== 页面导航 =====
function navigateTo(page, data) {
  if (isTransitioning) return;
  isTransitioning = true;

  const menu = document.getElementById("page-menu");
  const mapPage = document.getElementById("page-map");

  if (page === "menu") {
    closeDetailPopup();
    menu.classList.remove("menu-hidden");
    setTimeout(() => {
      mapPage.classList.remove("map-active");
      mapPage.classList.add("map-exiting");
    }, 50);
    currentPage = "menu";
    setTimeout(() => {
      mapPage.classList.add("no-transition");
      mapPage.classList.remove("map-exiting");
      void mapPage.offsetWidth;
      mapPage.classList.remove("no-transition");
      isTransitioning = false;
    }, TRANSITION_MS + 50);

  } else {
    mapPage.classList.remove("map-exiting");
    mapPage.classList.add("map-active");
    setTimeout(() => {
      menu.classList.add("menu-hidden");
    }, 50);
    currentPage = "map";
    if (data) mapEngine.loadMap(data);
    setTimeout(() => {
      isTransitioning = false;
    }, TRANSITION_MS + 50);
  }
}

// ===== 地图Tab栏 =====
function renderMapTabs() {
  const bar = document.getElementById("map-tab-bar");
  bar.innerHTML = "";

  MAPS.forEach(map => {
    const tab = document.createElement("button");
    tab.className = "map-tab";
    tab.dataset.mapId = map.id;
    tab.textContent = map.name;

    tab.addEventListener("click", () => {
      if (mapEngine) {
        mapEngine.loadMap(map.id);
      }
    });

    bar.appendChild(tab);
  });
}

// ===== 启动 =====
document.addEventListener("DOMContentLoaded", initApp);
