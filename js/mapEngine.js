// ===== 地图引擎 v2：修正缩放/拖拽坐标 =====

class MapEngine {
  constructor() {
    this.viewport = document.getElementById("map-viewport");
    this.world = document.getElementById("map-world");
    this.mapImage = document.getElementById("map-image");
    this.pointsContainer = document.getElementById("points-container");

    // 图片参数
    this.naturalW = 0;
    this.naturalH = 0;
    this.displayW = 0;
    this.displayH = 0;

    // 变换状态
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.minScale = 0.3;
    this.maxScale = 5;
    this.currentMapId = null;

    // 拖拽状态
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragged = false;

    // 触屏双指缩放
    this.pinchDist = 0;
    this.pinchScale = 1;
    this.pinchCenterX = 0;
    this.pinchCenterY = 0;

    // 世界尺寸
    this.worldW = 0;
    this.worldH = 0;

    this._bindEvents();
  }

  // ===== 加载地图（自动带淡入淡出） =====
  loadMap(mapId) {
    if (this.currentMapId === mapId) return;
    this.dragged = false;
    this.currentMapId = mapId;

    const mapData = MAPS.find(m => m.id === mapId);
    

    document.querySelectorAll(".map-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.mapId === mapId);
    });

    closeDetailPopup();

    const viewport = document.getElementById("map-viewport");
    viewport.classList.add("map-switching");
    this.pointsContainer.innerHTML = "";

    setTimeout(() => {
      this.mapImage.src = `maps/${mapId}.png`;
    }, 180);
  }

  // ===== 图片加载完成后设置尺寸 =====
  _onImageLoad() {
    this.naturalW = this.mapImage.naturalWidth || 1200;
    this.naturalH = this.mapImage.naturalHeight || 900;

    this._calcDisplaySize();
    this._centerView();
    this.renderPoints();

    const viewport = document.getElementById("map-viewport");
    viewport.classList.remove("map-switching");
  }

  // ===== 计算图片在视口中的实际显示尺寸 =====
  _calcDisplaySize() {
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;

    if (vpW === 0 || vpH === 0 || this.naturalW === 0 || this.naturalH === 0) {
      this.displayW = vpW;
      this.displayH = vpH;
      return;
    }

    const imgAspect = this.naturalW / this.naturalH;
    const vpAspect = vpW / vpH;

    if (imgAspect > vpAspect) {
      this.displayW = vpW;
      this.displayH = vpW / imgAspect;
    } else {
      this.displayH = vpH;
      this.displayW = vpH * imgAspect;
    }

    this.displayW = Math.round(this.displayW);
    this.displayH = Math.round(this.displayH);
  }

  // ===== 将世界居中在视口内 =====
  _centerView() {
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;

    this.offsetX = Math.round((vpW - this.displayW) / 2);
    this.offsetY = Math.round((vpH - this.displayH) / 2);
    this.scale = 1;

    this.worldW = this.displayW;
    this.worldH = this.displayH;

    this._updateWorldSize();
    this._applyTransform();
  }

  // ===== 更新世界 div 的宽高 =====
  _updateWorldSize() {
    this.world.style.width = this.displayW + "px";
    this.world.style.height = this.displayH + "px";
  }

  // ===== 应用 CSS transform =====
  _applyTransform() {
    this.world.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
  }

  // ===== 边界限制 =====
  _clampBounds() {
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;

    const curWorldW = this.worldW * this.scale;
    const curWorldH = this.worldH * this.scale;

    const maxOffsetX = vpW - (vpW - curWorldW) / 2;
    const minOffsetX = -curWorldW + (vpW - curWorldW) / 2;
    const maxOffsetY = vpH - (vpH - curWorldH) / 2;
    const minOffsetY = -curWorldH + (vpH - curWorldH) / 2;

    if (curWorldW <= vpW) {
      this.offsetX = (vpW - curWorldW) / 2;
    } else {
      this.offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, this.offsetX));
    }

    if (curWorldH <= vpH) {
      this.offsetY = (vpH - curWorldH) / 2;
    } else {
      this.offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, this.offsetY));
    }
  }

  // ===== 重置视角 =====
  resetView() {
    this._centerView();
    this._applyTransform();
  }

  // ===== 缩放控制（按钮用，以视口中心为锚点） =====
  zoomIn() {
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;
    this._zoomToPoint(vpW / 2, vpH / 2, this.scale * 1.4);
  }

  zoomOut() {
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;
    this._zoomToPoint(vpW / 2, vpH / 2, this.scale / 1.4);
  }

  // ===== 以视口内某点为锚点缩放 =====
  _zoomToPoint(vpX, vpY, newScale) {
    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    if (newScale === this.scale) return;

    const worldX = (vpX - this.offsetX) / this.scale;
    const worldY = (vpY - this.offsetY) / this.scale;

    this.offsetX = vpX - worldX * newScale;
    this.offsetY = vpY - worldY * newScale;
    this.scale = newScale;

    this._clampBounds();
    this._applyTransform();
  }

  // ===== 渲染点位（支持叠加合并） =====
  renderPoints() {
    this.pointsContainer.innerHTML = "";
    const points = getPoints(this.currentMapId);
    if (!points || points.length === 0) return;

    // 按邻近程度分组（坐标相差 < 2.5% 视为重叠）
    const THRESHOLD = 0.025;
    const groups = [];
    const assigned = new Array(points.length).fill(false);

    for (let i = 0; i < points.length; i++) {
      if (assigned[i]) continue;
      const group = [points[i]];
      assigned[i] = true;
      for (let j = i + 1; j < points.length; j++) {
        if (assigned[j]) continue;
        if (Math.abs(points[i].x - points[j].x) < THRESHOLD &&
            Math.abs(points[i].y - points[j].y) < THRESHOLD) {
          group.push(points[j]);
          assigned[j] = true;
        }
      }
      groups.push(group);
    }

    groups.forEach(group => {
      if (group.length === 1) {
        // 单个点位：正常渲染
        this._renderDot(group[0]);
      } else {
        // 多个重叠点位：合成绿色标点
        this._renderCombinedDot(group);
      }
    });
  }

  // ===== 渲染单个点位 =====
  _renderDot(point) {
    const dot = document.createElement("div");
    dot.className = `map-point side-${point.side}`;

    const px = point.x * this.displayW;
    const py = point.y * this.displayH;
    dot.style.left = px + "px";
    dot.style.top = py + "px";
    dot.dataset.pointId = point.id;

    const tooltip = document.createElement("div");
    tooltip.className = "map-point-tooltip";
    tooltip.textContent = point.name;
    dot.appendChild(tooltip);

    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.dragged) {
        this.dragged = false;
        return;
      }
      dot.classList.remove("pop-open");
      void dot.offsetWidth;
      dot.classList.add("pop-open");
      showDetailPopup(point, dot);
    });

    this.pointsContainer.appendChild(dot);
  }

  // ===== 渲染合成绿色标点（多个重叠） =====
  _renderCombinedDot(group) {
    const avgX = group.reduce((s, p) => s + p.x, 0) / group.length;
    const avgY = group.reduce((s, p) => s + p.y, 0) / group.length;

    const dot = document.createElement("div");
    dot.className = "map-point side-combined";

    const px = avgX * this.displayW;
    const py = avgY * this.displayH;
    dot.style.left = px + "px";
    dot.style.top = py + "px";
    dot.dataset.groupCount = group.length;

    const tooltip = document.createElement("div");
    tooltip.className = "map-point-tooltip";
    tooltip.textContent = `${group.length} 个点位叠加`;
    dot.appendChild(tooltip);

    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.dragged) {
        this.dragged = false;
        return;
      }
      dot.classList.remove("pop-open");
      void dot.offsetWidth;
      dot.classList.add("pop-open");
      showGroupPicker(group, dot);
    });

    this.pointsContainer.appendChild(dot);
  }

  // ===== 事件绑定 =====
  _bindEvents() {
    // --- 图片加载 ---
    this.mapImage.addEventListener("load", () => this._onImageLoad());
    if (this.mapImage.complete && this.mapImage.naturalWidth > 0) {
      this._onImageLoad();
    }

    // --- 鼠标拖拽 ---
    this.viewport.addEventListener("mousedown", (e) => {
      if (e.target.closest(".map-point") || e.target.closest(".detail-popup") || e.target.closest(".map-controls")) return;
      this._startDrag(e.clientX, e.clientY);
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      this._moveDrag(e.clientX, e.clientY);
    });

    document.addEventListener("mouseup", () => {
      this._endDrag();
    });

    // --- 滚轮缩放（以鼠标位置为锚点） ---
    this.viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const vpRect = this.viewport.getBoundingClientRect();
      const mx = e.clientX - vpRect.left;
      const my = e.clientY - vpRect.top;
      const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
      if (newScale === this.scale) return;
      this._zoomToPoint(mx, my, newScale);
    }, { passive: false });

    // --- 触屏事件 ---
    this.viewport.addEventListener("touchstart", (e) => {
      if (e.target.closest(".map-point") || e.target.closest(".detail-popup") || e.target.closest(".map-controls")) return;
      if (e.touches.length === 1) {
        this._startDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        this._endDrag();
        this.pinchDist = this._getPinchDist(e.touches);
        this.pinchScale = this.scale;
        this.pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        this.pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    }, { passive: true });

    this.viewport.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const newDist = this._getPinchDist(e.touches);
        const ratio = newDist / this.pinchDist;
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.pinchScale * ratio));
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const vpRect = this.viewport.getBoundingClientRect();
        const vpX = cx - vpRect.left;
        const vpY = cy - vpRect.top;
        if (newScale !== this.scale) {
          this._zoomToPoint(vpX, vpY, newScale);
        }
      }
    }, { passive: false });

    this.viewport.addEventListener("touchend", (e) => {
      if (e.touches.length < 2) {
        this._endDrag();
      }
    });

    // --- 缩放按钮 ---
    document.getElementById("btn-zoom-in").addEventListener("click", () => this.zoomIn());
    document.getElementById("btn-zoom-out").addEventListener("click", () => this.zoomOut());
    document.getElementById("btn-reset").addEventListener("click", () => this.resetView());

    // --- 窗口 resize ---
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this._calcDisplaySize();
        this._updateWorldSize();
        this._centerView();
        this._applyTransform();
        this.renderPoints();
      }, 200);
    });
  }

  _startDrag(clientX, clientY) {
    this.isDragging = true;
    this.dragged = false;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.dragOffsetX = this.offsetX;
    this.dragOffsetY = this.offsetY;
    this.viewport.classList.add("dragging");
  }

  _moveDrag(clientX, clientY) {
    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.dragged = true;
    }

    this.offsetX = this.dragOffsetX + dx;
    this.offsetY = this.dragOffsetY + dy;
    this._clampBounds();
    this._applyTransform();
  }

  _endDrag() {
    this.isDragging = false;
    this.viewport.classList.remove("dragging");
  }

  _getPinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

