// ===== 主菜单渲染 =====

function renderMenu() {
  const grid = document.getElementById("menu-grid");
  grid.innerHTML = "";

  // 主要功能卡片
  const mainCard = createCard({
    icon: "primary",
    svg: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.15)"/>
      <path d="M12 8V16M8 12H16" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M7 7L17 17" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      <path d="M7 17L17 7" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    </svg>`,
    name: "穿墙",
    action: "map",
    badge: ""
  });

  grid.appendChild(mainCard);

  // 占位卡片
  const placeholders = [
    { icon: "placeholder", name: "武器数据库" },
    { icon: "placeholder", name: "地图攻略" },
    { icon: "placeholder", name: "道具点位" },
    { icon: "placeholder", name: "社区投稿" },
    { icon: "placeholder", name: "设置" }
  ];

  placeholders.forEach(p => {
    const card = createPlaceholderCard(p);
    grid.appendChild(card);
  });
}

function createCard({ icon, svg, name, action, badge }) {
  const div = document.createElement("div");
  div.className = "menu-card";
  div.setAttribute("data-action", action);

  if (badge) {
    const badgeEl = document.createElement("div");
    badgeEl.className = "menu-card-badge";
    badgeEl.textContent = badge;
    div.appendChild(badgeEl);
  }

    const iconDiv = document.createElement("div");
  iconDiv.className = "menu-card-icon " + icon;
  iconDiv.innerHTML = svg;
  div.appendChild(iconDiv);

  const nameEl = document.createElement("div");
  nameEl.className = "menu-card-name";
  nameEl.textContent = name;
  div.appendChild(nameEl);


  div.addEventListener("click", () => {
    if (action === "map") {
      navigateTo("map");
    }
  });

  return div;
}

function createPlaceholderCard({ icon, name }) {
  const div = document.createElement("div");
  div.className = "menu-card placeholder";

  const iconDiv = document.createElement("div");
  iconDiv.className = "menu-card-icon " + icon;
  iconDiv.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M12 8V16M8 12H16" stroke-linecap="round"/>
  </svg>`;
  div.appendChild(iconDiv);

  const nameEl = document.createElement("div");
  nameEl.className = "menu-card-name";
  nameEl.textContent = name;
  nameEl.style.color = "var(--text-tertiary)";
  div.appendChild(nameEl);


  const badge = document.createElement("div");
  badge.className = "menu-card-badge";
  badge.textContent = "即将推出";
  div.appendChild(badge);

  return div;
}

