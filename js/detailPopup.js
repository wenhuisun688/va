// ===== 详情侧边栏 + 点位名称标签 =====

let currentPointData = null;
let currentDotEl = null;
let _editMode = false;

function ensureSidebar() {
  var s = document.getElementById("detail-sidebar");
  if (s) return s;
  s = document.createElement("div");
  s.id = "detail-sidebar";
  s.className = "detail-sidebar";
  s.innerHTML = "";
  document.body.appendChild(s);

  var b = document.createElement("div");
  b.className = "sidebar-backdrop";
  b.id = "sidebar-backdrop";
  document.body.appendChild(b);
  b.addEventListener("click", closeDetailPopup);

  return s;
}

function ensureLabel() {
  var lbl = document.getElementById("point-label");
  if (lbl) return lbl;
  lbl = document.createElement("div");
  lbl.id = "point-label";
  lbl.className = "point-label";
  var pc = document.getElementById("points-container");
  if (pc) pc.appendChild(lbl);
  return lbl;
}

// ===== 打开侧边栏 =====
function showDetailPopup(pointData, dotEl) {
  if (!pointData) return;

  currentPointData = pointData;
  currentDotEl = dotEl;
  _editMode = false;
  if (dotEl) dotEl.dataset.selected = "true";

  var d = pointData.detail || {};
  var side = pointData.side || "attack";
  var sideLabel = SIDE_LABELS[side] || side;

  // 点位名称标签（地图上）
  var lbl = ensureLabel();
  lbl.textContent = pointData.name;
  if (dotEl) {
    lbl.style.left = dotEl.style.left;
    lbl.style.top = dotEl.style.top;
  }
  lbl.classList.add("show");

  renderSidebarView(pointData, dotEl);
}

// ===== 渲染侧边栏（查看模式） =====
function renderSidebarView(pointData, dotEl) {
  if (!pointData) return;
  var d = pointData.detail || {};
  var side = pointData.side || "attack";
  var sideLabel = SIDE_LABELS[side] || side;

  // 构建侧边栏内容（多图支持，过滤空字符串）
  var rawImages = d.images || [];
  if (rawImages.length === 0 && d.image) rawImages = [d.image];
  var images = [];
  for (var fi = 0; fi < rawImages.length; fi++) {
    if (rawImages[fi] && rawImages[fi].trim() !== "") images.push(rawImages[fi]);
  }

  var imagesHtml = "";
  if (images.length > 0) {
    imagesHtml = '<div class=\"sidebar-images-grid\">';
    for (var ii = 0; ii < images.length; ii++) {
      imagesHtml += '<div class=\"sidebar-image\"><img src=\"' + images[ii] + '\" alt=\"截图' + (ii+1) + '\" style=\"cursor:zoom-in\"></div>';
    }
    imagesHtml += '</div>';
  } else {
    imagesHtml = '<div class=\"sidebar-image-placeholder-icon\"><svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"rgba(255,255,255,0.2)\" stroke-width=\"1.5\"><rect x=\"2\" y=\"2\" width=\"20\" height=\"20\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><path d=\"M21 15L16 10L5 21\"/></svg></div>';
  }

  var editBtnHtml = "<button class=\"sidebar-btn\" id=\"sidebar-edit\" title=\"编辑此点位\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M12 20H21\"/><path d=\"M16.5 3.5L20.5 7.5\"/><path d=\"M12 8L4 16V20H8L16 12\"/></svg></button>";
  var deleteBtnHtml = "<button class=\"sidebar-btn danger\" id=\"sidebar-delete\" title=\"删除此点位\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M3 6H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6\"/></svg></button>";

  var sidebar = ensureSidebar();
  sidebar.innerHTML =
    '<div class=\"sidebar-inner\">' +
      '<div class=\"sidebar-header\">' +
        '<div class=\"sidebar-title-area\">' +
          '<div class=\"sidebar-title\">' + escapeHtml(d.title || pointData.name) + '</div>' +
          '<span class=\"sidebar-side-tag side-' + side + '\">' + sideLabel + '</span>' + (d.crouch ? '<span class=\"sidebar-crouch-badge\">蹲下</span>' : '') +
        '</div>' +
        '<div class=\"sidebar-actions\">' +
          editBtnHtml +
          deleteBtnHtml +
          '<button class=\"sidebar-btn\" id=\"sidebar-close\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M18 6L6 18M6 6L18 18\"/></svg></button>' +
        '</div>' +
      '</div>' +
      '<div class=\"sidebar-body\">' +
        '<div class=\"sidebar-description\">' + escapeHtml(d.description || '') + '</div>' +
        '<div class=\"sidebar-image-block\">' +
          '<span class=\"sidebar-image-label\">点位截图</span>' +
          imagesHtml +
        '</div>' +
      '</div>' +
    '</div>';

  // 强制回流，确保 translateX(100%) 先渲染再触发过渡动画
  void sidebar.offsetWidth;
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      sidebar.classList.add("open");
      var bd = document.getElementById("sidebar-backdrop");
      if (bd) bd.classList.add("show");
    });
  });

  // 事件绑定
  setTimeout(function() {
    var closeBtn = document.getElementById("sidebar-close");
    if (closeBtn) closeBtn.addEventListener("click", closeDetailPopup);

    // 图片点击放大（事件委托，更可靠）
    var sidebarBody = document.querySelector("#detail-sidebar .sidebar-body");
    if (sidebarBody) {
      sidebarBody.addEventListener("click", function(ev) {
        var imgEl = ev.target.closest(".sidebar-image img");
        if (imgEl) {
          ev.stopPropagation();
          openImagePreview(imgEl.src);
        }
      });
    }

    var editBtn = document.getElementById("sidebar-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function() {
        toggleEditMode();
      });
    }

    var delBtn = document.getElementById("sidebar-delete");
    if (delBtn) {
      delBtn.addEventListener("click", function() {
        if (currentPointData && typeof mapEngine !== 'undefined' && mapEngine) {
          var pts = POINTS_DATA[mapEngine.currentMapId];
          if (pts) {
            var idx = -1;
            for (var i = 0; i < pts.length; i++) {
              if (pts[i].id === currentPointData.id) { idx = i; break; }
            }
            if (idx !== -1) {
              pts.splice(idx, 1);
              savePointsToLocal();
              savePointsToFile();
              mapEngine.renderPoints();
            }
          }
        }
        closeDetailPopup();
      });
    }
  }, 10);
}

// ===== 编辑模式 =====
var _editImages = [];

function toggleEditMode() {
  if (!currentPointData) return;
  _editMode = !_editMode;

  if (!_editMode) {
    renderSidebarView(currentPointData, currentDotEl);
    return;
  }

  var d = currentPointData.detail || {};
  var side = currentPointData.side || "attack";
  var sideLabel = SIDE_LABELS[side] || side;
  var isCrouch = d.crouch || false;

  // 复制当前图片到编辑缓存
  var rawImages = d.images || [];
  if (rawImages.length === 0 && d.image) rawImages = [d.image];
  _editImages = [];
  for (var fi = 0; fi < rawImages.length; fi++) {
    if (rawImages[fi] && rawImages[fi].trim() !== "") _editImages.push(rawImages[fi]);
  }

  var imagesThumbsHtml = renderEditImageThumbs();

  var sidebar = ensureSidebar();
  sidebar.innerHTML =
    '<div class=\"sidebar-inner\">' +
      '<div class=\"sidebar-header\">' +
        '<div class=\"sidebar-title-area\">' +
          '<div class=\"sidebar-title\" style=\"font-size:16px;color:rgba(255,255,255,0.6)\">编辑点位</div>' +
        '</div>' +
        '<div class=\"sidebar-actions\">' +
          '<button class=\"sidebar-btn\" id=\"sidebar-close\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M18 6L6 18M6 6L18 18\"/></svg></button>' +
        '</div>' +
      '</div>' +
      '<div class=\"sidebar-body\">' +
        '<div class=\"editor-form\" style=\"padding:0\">' +
          '<div class=\"editor-field\">' +
            '<label>点位名称</label>' +
            '<input type=\"text\" id=\"edit-name\" value=\"' + escapeHtml(currentPointData.name) + '\" maxlength=\"30\">' +
          '</div>' +
          '<div class=\"editor-field\">' +
            '<label>详细标题</label>' +
            '<input type=\"text\" id=\"edit-title\" value=\"' + escapeHtml(d.title || currentPointData.name) + '\" maxlength=\"30\">' +
          '</div>' +
          '<div class=\"editor-field\">' +
            '<label>阵营</label>' +
            '<select id=\"edit-side\">' +
              '<option value=\"attack\"' + (side === 'attack' ? ' selected' : '') + '>进攻方</option>' +
              '<option value=\"defense\"' + (side === 'defense' ? ' selected' : '') + '>防守方</option>' +
            '</select>' +
          '</div>' +
          '<div class=\"editor-field editor-field-row\">' +
            '<label>蹲下</label>' +
            '<label class=\"editor-toggle-checkbox\">' +
              '<input type=\"checkbox\" id=\"edit-crouch\"' + (isCrouch ? ' checked' : '') + '>' +
              '<span class=\"editor-toggle-track\"></span>' +
            '</label>' +
          '</div>' +
          '<div class=\"editor-field\">' +
            '<label>点位描述</label>' +
            '<textarea id=\"edit-desc\" rows=\"3\">' + escapeHtml(d.description || '') + '</textarea>' +
          '</div>' +
          '<div class=\"editor-field\">' +
            '<label>点位截图</label>' +
            '<div class=\"editor-images-container\" id=\"edit-images-container\">' + imagesThumbsHtml + '</div>' +
            '<button type=\"button\" class=\"editor-add-image-btn\" id=\"edit-add-image-btn\">' +
              '<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M12 5V19M5 12H19\"/></svg>' +
              '添加图片' +
            '</button>' +
            '<input type=\"file\" id=\"edit-image-input\" accept=\"image/*\" multiple hidden>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style=\"padding:12px 20px 20px;display:flex;gap:10px;flex-shrink:0\">' +
        '<button class=\"editor-generate-btn\" id=\"edit-save-btn\" style=\"flex:1\">保存修改</button>' +
        '<button class=\"editor-generate-btn\" id=\"edit-cancel-btn\" style=\"flex:1;background:rgba(255,255,255,0.06);color:var(--text-secondary)\">取消</button>' +
      '</div>' +
    '</div>';

  void sidebar.offsetWidth;
  sidebar.classList.add("open");
  var bd = document.getElementById("sidebar-backdrop");
  if (bd) bd.classList.add("show");

  // 事件绑定
  document.getElementById("sidebar-close").addEventListener("click", function() {
    _editMode = false;
    renderSidebarView(currentPointData, currentDotEl);
  });

  document.getElementById("edit-add-image-btn").addEventListener("click", function() {
    document.getElementById("edit-image-input").click();
  });
  document.getElementById("edit-image-input").addEventListener("change", handleEditImagesUpload);

  document.getElementById("edit-save-btn").addEventListener("click", saveEditChanges);
  document.getElementById("edit-cancel-btn").addEventListener("click", function() {
    _editMode = false;
    renderSidebarView(currentPointData, currentDotEl);
  });
}

function renderEditImageThumbs() {
  if (!_editImages || _editImages.length === 0) return '<div style="font-size:12px;color:var(--text-tertiary);padding:8px 0">暂无截图</div>';
  var html = '';
  for (var i = 0; i < _editImages.length; i++) {
    html += '<div class=\"editor-image-thumb\" data-idx=\"' + i + '\">' +
      '<img src=\"' + _editImages[i] + '\" alt=\"缩略图\">' +
      '<button class=\"editor-image-remove\" data-idx=\"' + i + '\">' +
        '<svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M18 6L6 18M6 6L18 18\"/></svg>' +
      '</button>' +
    '</div>';
  }
  return html;
}

function handleEditImagesUpload(e) {
  var files = Array.from(e.target.files);
  if (!files.length) return;
  var readerPromises = files.map(function(file) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        var nameParts = file.name.split(".");
        var ext = nameParts.length > 1 ? nameParts.pop() : "png";
        var baseName = nameParts.join(".") || "image";
        resolve({ url: ev.target.result, name: baseName, ext: ext });
      };
      reader.readAsDataURL(file);
    });
  });
  Promise.all(readerPromises).then(function(results) {
    var uploadPromises = results.map(function(item) {
      return fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(item.url) + "&name=" + encodeURIComponent(item.name) + "&ext=" + encodeURIComponent(item.ext)
      }).then(function(r) { return r.json(); });
    });
    return Promise.all(uploadPromises);
  }).then(function(responses) {
    responses.forEach(function(resp) {
      if (resp.ok && resp.url) {
        _editImages.push(resp.url);
      }
    });
    // 刷新缩略图
    var container = document.getElementById("edit-images-container");
    if (container) {
      container.innerHTML = renderEditImageThumbs();
      // 给删除按钮绑定事件
      container.querySelectorAll(".editor-image-remove").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var idx = parseInt(this.dataset.idx);
          if (!isNaN(idx) && idx >= 0 && idx < _editImages.length) {
            _editImages.splice(idx, 1);
            container.innerHTML = renderEditImageThumbs();
            // 重新绑定删除事件 - use named handler
            refreshEditImageDeleteHandlers(container);
          }
        });
      });
    }
  }).catch(function(err) {
    console.warn("图片上传失败:", err);
  });
}

function refreshEditImageDeleteHandlers(container) {
  if (!container) return;
  var btns = container.querySelectorAll(".editor-image-remove");
  for (var bi = 0; bi < btns.length; bi++) {
    btns[bi].addEventListener("click", function() {
      var idx = parseInt(this.dataset.idx);
      if (!isNaN(idx) && idx >= 0 && idx < _editImages.length) {
        _editImages.splice(idx, 1);
        container.innerHTML = renderEditImageThumbs();
        refreshEditImageDeleteHandlers(container);
      }
    });
  }
}

function saveEditChanges() {
  if (!currentPointData) return;

  var name = document.getElementById("edit-name").value.trim();
  if (!name) {
    document.getElementById("edit-name").focus();
    document.getElementById("edit-name").style.borderColor = "rgba(255,59,48,0.5)";
    setTimeout(function() {
      var el = document.getElementById("edit-name");
      if (el) el.style.borderColor = "";
    }, 1500);
    return;
  }

  var title = document.getElementById("edit-title").value.trim() || name;
  var side = document.getElementById("edit-side").value;
  var desc = document.getElementById("edit-desc").value.trim() || "请填写点位描述";
  var crouch = document.getElementById("edit-crouch").checked;

  // 更新数据
  currentPointData.name = name;
  currentPointData.side = side;
  if (!currentPointData.detail) currentPointData.detail = {};
  currentPointData.detail.title = title;
  currentPointData.detail.description = desc;
  currentPointData.detail.crouch = crouch;
  currentPointData.detail.images = _editImages.slice();

  // 保存
  savePointsToLocal();
  savePointsToFile();

  _editMode = false;

  // 重新渲染侧边栏
  renderSidebarView(currentPointData, currentDotEl);

  // 更新地图上的标签
  var lbl = document.getElementById("point-label");
  if (lbl) lbl.textContent = name;

  // 更新标点
  if (typeof mapEngine !== 'undefined' && mapEngine && mapEngine.renderPoints) {
    mapEngine.renderPoints();
  }
}

// ===== 合成绿色标点的选择器 =====
function showGroupPicker(group, dotEl) {
  var itemsHtml = "";
  for (var i = 0; i < group.length; i++) {
    var p = group[i];
    var sLabel = SIDE_LABELS[p.side] || p.side;
    var dotColor = p.side === "attack" ? "#007AFF" : "#FF3B30";
    itemsHtml +=
      '<div class=\"group-picker-item\" data-pid=\"' + p.id + '\">' +
        '<span class=\"group-picker-dot\" style=\"background:' + dotColor + '\"></span>' +
        '<span class=\"group-picker-name\">' + escapeHtml(p.name) + '</span>' +
        '<span class=\"group-picker-side\">' + sLabel + '</span>' +
      '</div>';
  }

  var popup = document.createElement("div");
  popup.className = "group-picker-popup open";
  popup.innerHTML =
    '<div class=\"group-picker-inner\">' +
      '<div class=\"group-picker-header\">' +
        '<span class=\"group-picker-title\">选择点位</span>' +
        '<button class=\"sidebar-btn\" id=\"grouppicker-close\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M18 6L6 18M6 6L18 18\"/></svg></button>' +
      '</div>' +
      '<div class=\"group-picker-items\">' + itemsHtml + '</div>' +
    '</div>';
  document.body.appendChild(popup);

  // 定位
  var dotRect = dotEl.getBoundingClientRect();
  var cx = dotRect.left + dotRect.width / 2;
  var cy = dotRect.top + dotRect.height / 2;

  requestAnimationFrame(function() {
    var r = popup.getBoundingClientRect();
    var left = cx - r.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - r.width - 12));
    var top = cy - r.height - 16;
    if (top < 12) top = cy + 16;
    popup.style.left = left + "px";
    popup.style.top = top + "px";
  });

  // 关闭
  popup.addEventListener("click", function(e) {
    var item = e.target.closest(".group-picker-item");
    if (item) {
      var pid = item.dataset.pid;
      var pt = null;
      for (var i = 0; i < group.length; i++) {
        if (group[i].id === pid) { pt = group[i]; break; }
      }
      if (pt) {
        popup.remove();
        showDetailPopup(pt, dotEl);
      }
      return;
    }
    if (e.target.closest(".group-picker-close") || e.target.closest("#grouppicker-close") || e.target === popup) {
      popup.remove();
    }
  });

  // 点击外部关闭
  setTimeout(function() {
    function closeOnOutside(e) {
      if (!popup.isConnected) { document.removeEventListener("click", closeOnOutside); return; }
      if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener("click", closeOnOutside); }
    }
    document.addEventListener("click", closeOnOutside);
  }, 10);
}

// ===== 关闭侧边栏 =====
function closeDetailPopup() {
  currentPointData = null;
  _editMode = false;

  // 清除选中标点的 tooltip 隐藏标记
  document.querySelectorAll(".map-point[data-selected]").forEach(function(el) {
    el.removeAttribute("data-selected");
  });
  currentDotEl = null;

  var sidebar = document.getElementById("detail-sidebar");
  if (sidebar) {
    sidebar.classList.remove("open");
  }
  var backdrop = document.getElementById("sidebar-backdrop");
  if (backdrop) backdrop.classList.remove("show");

  // 移除标签
  var lbl = document.getElementById("point-label");
  if (lbl) lbl.classList.remove("show");

  // 移除残存的 group picker
  var pickers = document.querySelectorAll(".group-picker-popup");
  for (var i = 0; i < pickers.length; i++) pickers[i].remove();
}

// ===== 图片放大预览 =====
function openImagePreview(src) {
  var overlay = document.createElement("div");
  overlay.className = "image-preview-overlay";
  overlay.innerHTML = '<div class=\"image-preview-backdrop\"></div><div class=\"image-preview-container\"><button class=\"image-preview-close\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M18 6L6 18M6 6L18 18\"/></svg></button><img src=\"' + src + '\" alt=\"预览\" class=\"image-preview-img\"></div>';
  document.body.appendChild(overlay);

  // 强制回流后显示
  void overlay.offsetWidth;
  overlay.classList.add("open");

  // 关闭
  overlay.querySelector(".image-preview-backdrop").addEventListener("click", function() { closeImagePreview(overlay); });
  overlay.querySelector(".image-preview-close").addEventListener("click", function() { closeImagePreview(overlay); });
}

function closeImagePreview(overlay) {
  overlay.classList.remove("open");
  setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
}

function escapeHtml(text) {
  if (!text) return '';
  var d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}
