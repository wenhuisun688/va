// ===== 点位标注工具 =====

let editorActive = false;
let editorSelectedMapId = null;
let editorClickPos = null;
function initEditor() {
  const nav = document.querySelector(".map-nav");
  const spacer = nav.querySelector(".map-nav-spacer");

  const btn = document.createElement("button");
  btn.id = "btn-editor-toggle";
  btn.className = "editor-toggle-btn";
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20H21"/><path d="M16.5 3.5L20.5 7.5"/><path d="M12 8L4 16V20H8L16 12"/></svg>
    <span>标注</span>`;
  btn.title = "点位标注工具";
  nav.appendChild(btn);
  btn.addEventListener("click", toggleEditor);



  const panel = document.createElement("div");
  panel.id = "editor-panel";
  panel.className = "editor-panel";
  panel.innerHTML = `
    <div class="editor-panel-inner">
      <div class="editor-panel-header">
        <span class="editor-panel-title">标注新点位</span>
        <button class="editor-panel-close" id="editor-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6L18 18"/></svg>
        </button>
      </div>
      <div class="editor-coords" id="editor-coords">点击地图选择位置</div>
      <div class="editor-form">
        <div class="editor-field">
          <label>点位名称</label>
          <input type="text" id="editor-name" placeholder="如：A大转角穿墙" maxlength="30">
        </div>
        <div class="editor-field">
          <label>阵营</label>
          <select id="editor-side">
            <option value="attack">进攻方</option>
            <option value="defense">防守方</option>
          </select>
        <div class="editor-field editor-field-row">
          <label>蹲下</label>
          <label class="editor-toggle-checkbox">
            <input type="checkbox" id="editor-crouch">
            <span class="editor-toggle-track"></span>
          </label>
        </div>
        <div class="editor-field">
          <label>点位描述</label>
          <textarea id="editor-desc" rows="3" placeholder="描述文字，支持换行..."></textarea>
        </div>
                <div class="editor-field">
          <label>点位截图（可上传多张）</label>
          <div class="editor-images-container" id="editor-images-container">
            <!-- 图片缩略图由 JS 动态渲染 -->
          </div>
          <button type="button" class="editor-add-image-btn" id="editor-add-image-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5V19M5 12H19"/></svg>
            添加图片
          </button>
          <input type="file" id="editor-image-input" accept="image/*" multiple hidden>
        </div><button class="editor-generate-btn" id="editor-add">+ 添加到地图</button>
        <div class="editor-add-msg" id="editor-add-msg"></div>
        <div class="editor-export-area">
          <button class="editor-export-btn" id="editor-export-to-json">导出全部点位数据</button>
        </div>
        <div class="editor-output-area" id="editor-output-area" style="display:none">
          <textarea id="editor-output" class="editor-output" readonly rows="12"></textarea>
          <button class="editor-copy-btn" id="editor-copy">复制代码</button>
          <div class="editor-copy-msg" id="editor-copy-msg">已复制！</div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("page-map").appendChild(panel);

  document.getElementById("editor-close").addEventListener("click", deactivateEditor);

  const viewport = document.getElementById("map-viewport");
  viewport.addEventListener("click", (e) => {
    if (!editorActive) return;
    if (e.target.closest(".editor-panel") || e.target.closest(".editor-toggle-btn") || e.target.closest(".map-controls")) return;
    captureClick(e);
  });

    document.getElementById("editor-add-image-btn").addEventListener("click", function() {
    document.getElementById("editor-image-input").click();
  });
  document.getElementById("editor-image-input").addEventListener("change", handleEditorImagesUpload);

  document.getElementById("editor-add").addEventListener("click", addPointToMap);
  document.getElementById("editor-export-to-json").addEventListener("click", exportAllData);
  document.getElementById("editor-copy").addEventListener("click", copyCode);
}

// ===== 多图上传 =====
let editorImages = [];

function handleEditorImagesUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const readerPromises = files.map(function(file) {
    return new Promise(function(resolve) {
      const reader = new FileReader();
      reader.onload = function(ev) { resolve(ev.target.result); };
      reader.readAsDataURL(file);
    });
  });
  Promise.all(readerPromises).then(function(urls) {
    urls.forEach(function(url) { editorImages.push(url); });
    renderEditorImageThumbs();
    document.getElementById("editor-image-input").value = "";
  });
}

function renderEditorImageThumbs() {
  const container = document.getElementById("editor-images-container");
  if (!container) return;
  container.innerHTML = "";
  if (editorImages.length === 0) {
    container.innerHTML = '<div class="editor-image-placeholder" style="cursor:default"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15L16 10L5 21"/></svg><span>暂无图片，点击上方按钮添加</span></div>';
    return;
  }
  editorImages.forEach(function(url, idx) {
    const div = document.createElement("div");
    div.className = "editor-image-thumb";
    div.innerHTML = '<img src="' + url + '" alt="截图' + (idx+1) + '"><button class="editor-image-remove" data-idx="' + idx + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6L18 18"/></svg></button>';
    div.querySelector(".editor-image-remove").addEventListener("click", function(e) {
      e.stopPropagation();
      var i = parseInt(this.dataset.idx);
      editorImages.splice(i, 1);
      renderEditorImageThumbs();
    });
    container.appendChild(div);
  });
}function toggleEditor() {
  if (editorActive) deactivateEditor();
  else activateEditor();
}

// ===== 进入标注模式：隐藏已有标点，方便点地图 =====
function activateEditor() {
  editorActive = true;
  document.getElementById("btn-editor-toggle").classList.add("active");
  document.getElementById("editor-panel").classList.add("open");
  document.getElementById("map-viewport").classList.add("editor-mode");
  editorSelectedMapId = mapEngine.currentMapId;
  editorClickPos = null;
  editorImages = [];
  document.getElementById("editor-coords").textContent = "点击地图选择位置";
  document.getElementById("editor-output-area").style.display = "none";
  document.getElementById("editor-add-msg").textContent = "";

  // 隐藏标点，方便点击地图
  hidePoints();
}

// ===== 退出标注模式：恢复显示所有标点 =====
function deactivateEditor() {
  editorActive = false;
  document.getElementById("btn-editor-toggle").classList.remove("active");
  document.getElementById("editor-panel").classList.remove("open");
  document.getElementById("map-viewport").classList.remove("editor-mode");

  // 恢复显示标点
  showPoints();
}

function hidePoints() {
  const pc = document.getElementById("points-container");
  if (pc) pc.style.display = "none";
}

function showPoints() {
  const pc = document.getElementById("points-container");
  if (pc) {
    pc.style.display = "";
    mapEngine.renderPoints();
  }
}

function captureClick(e) {
  const world = document.getElementById("map-world");
  const worldRect = world.getBoundingClientRect();
  const x = (e.clientX - worldRect.left) / worldRect.width;
  const y = (e.clientY - worldRect.top) / worldRect.height;
  const xPct = Math.max(0, Math.min(1, x));
  const yPct = Math.max(0, Math.min(1, y));
  editorClickPos = { x: xPct, y: yPct };
  document.getElementById("editor-coords").textContent = "X: " + (xPct * 100).toFixed(1) + "%  Y: " + (yPct * 100).toFixed(1) + "%";
  document.getElementById("editor-output-area").style.display = "none";
  document.getElementById("editor-add-msg").textContent = "";
}

// ===== 添加点位到地图 =====
function addPointToMap() {
  if (!editorClickPos) {
    document.getElementById("editor-coords").textContent = " 请先在地图上点击选择位置";
    return;
  }

  const mapId = mapEngine.currentMapId;
  const name = document.getElementById("editor-name").value.trim();
  if (!name) {
    document.getElementById("editor-name").focus();
    document.getElementById("editor-name").style.borderColor = "rgba(255,59,48,0.5)";
    setTimeout(function() { document.getElementById("editor-name").style.borderColor = ""; }, 1500);
    return;
  }

  const side = document.getElementById("editor-side").value;
  const desc = document.getElementById("editor-desc").value.trim() || "请填写点位描述";
  const crouch = document.getElementById("editor-crouch").checked;

  if (!POINTS_DATA[mapId]) POINTS_DATA[mapId] = [];
  const existingPoints = POINTS_DATA[mapId];
  const nextNum = existingPoints.length + 1;

  const newPoint = {
    id: mapId + "-" + String(nextNum).padStart(2, "0"),
    name: name,
    side: side,
    x: editorClickPos.x,
    y: editorClickPos.y,
    detail: {
      title: name,
      description: desc,
      crouch: crouch,
      images: editorImages.length > 0 ? editorImages.slice() : []
    }
  };

  existingPoints.push(newPoint);
  savePointsToLocal();
  savePointsToFile();

  // 短暂显示标点让用户看到效果
  showPoints();

  const msg = document.getElementById("editor-add-msg");
  msg.textContent = "已添加 " + name;
  msg.className = "editor-add-msg success";

  // 重置表单
  document.getElementById("editor-name").value = "";
  document.getElementById("editor-crouch").checked = false;
  document.getElementById("editor-desc").value = "";
  editorImages = [];
  renderEditorImageThumbs();
  editorClickPos = null;
  document.getElementById("editor-coords").textContent = "已添加！继续点击地图选择下一个位置";

  // 继续标注模式，再次隐藏标点
  hidePoints();
}

// ===== 导出全部点位数据 =====
function exportAllData() {
  exportPointsData();
  return;
  var code = "const POINTS_DATA = {\n";
  for (var m = 0; m < MAPS.length; m++) {
    var map = MAPS[m];
    var pts = POINTS_DATA[map.id] || [];
    code += "  " + map.id + ": [\n";
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var comma = (i < pts.length - 1) ? "," : "";
      code += "    {\n";
      code += '      id: "' + p.id + '",\n';
      code += '      name: "' + escapeJs(p.name) + '",\n';
      code += '      side: "' + p.side + '",\n';
      code += '      x: ' + p.x.toFixed(3) + ',\n';
      code += '      y: ' + p.y.toFixed(3) + ',\n';
      code += '      detail: {\n';
      code += '        title: "' + escapeJs(p.detail.title) + '",\n';
      code += '        description: "' + escapeJs(p.detail.description) + '",\n';
      code += '        image: "' + (p.detail.image ? "base64" : "") + '",\n';
      code += '        image2: "' + (p.detail.image2 ? "base64" : "") + '"\n';
    }
    code += "  ],\n";
  }
  code += "};\n";
  document.getElementById("editor-output").value = code;
  document.getElementById("editor-output-area").style.display = "block";
}

function copyCode() {
  var output = document.getElementById("editor-output");
  output.select();
  navigator.clipboard.writeText(output.value).then(function() {
    var msg = document.getElementById("editor-copy-msg");
    msg.classList.add("show");
    setTimeout(function() { msg.classList.remove("show"); }, 2000);
  }).catch(function() {
    document.execCommand("copy");
    var msg = document.getElementById("editor-copy-msg");
    msg.classList.add("show");
    setTimeout(function() { msg.classList.remove("show"); }, 2000);
  });
}

function escapeJs(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
