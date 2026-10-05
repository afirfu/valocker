const API_BASE = "https://valorant-api.com/v1";

const BUILT_COLUMNS = [
  [
    { k: "gc", n: "Sidearms" },
    { k: "gt", n: "Classic" },
    { k: "gt", n: "Shorty" },
    { k: "gt", n: "Frenzy" },
    { k: "gt", n: "Ghost" },
    { k: "gt", n: "Bandit" },
    { k: "gt", n: "Sheriff" },
  ],
  [
    { k: "gc", n: "SMGs" },
    { k: "gt", n: "Stinger" },
    { k: "gt", n: "Spectre" },
    { k: "gc", n: "Shotguns" },
    { k: "gt", n: "Bucky" },
    { k: "gt", n: "Judge" },
    { k: "gc", n: "Melee" },
    { k: "gt", n: "Melee" },
  ],
  [
    { k: "gc", n: "Rifles" },
    { k: "gt", n: "Bulldog" },
    { k: "gt", n: "Guardian" },
    { k: "gt", n: "Warden" },
    { k: "gt", n: "Phantom" },
    { k: "gt", n: "Vandal" },
  ],
  [
    { k: "gc", n: "Sniper Rifles" },
    { k: "gt", n: "Marshal" },
    { k: "gt", n: "Outlaw" },
    { k: "gt", n: "Operator" },
    { k: "gc", n: "Machine Guns" },
    { k: "gt", n: "Ares" },
    { k: "gt", n: "Odin" },
  ],
  [
    { k: "gc", n: "Player Card" },
    { k: "gt", n: "Player Card", locked: true, tall: 2 },
    { k: "gc", n: "Expression" },
    { k: "gt", n: "Expressions", locked: true },
  ],
];

function weaponIcon(weapon) {
  return weapon.killStreamIcon || weapon.displayIcon || "";
}

function cropTransparentPng(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const source = document.createElement("canvas");
      source.width = image.naturalWidth;
      source.height = image.naturalHeight;
      const ctx = source.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, source.width, source.height);

      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (data[(y * width + x) * 4 + 3] >= 24) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < 0) {
        resolve(src);
        return;
      }

      const pad = 2;
      const sx = Math.max(0, minX - pad);
      const sy = Math.max(0, minY - pad);
      const sw = Math.min(width - sx, maxX - minX + 1 + pad * 2);
      const sh = Math.min(height - sy, maxY - minY + 1 + pad * 2);
      const cropped = document.createElement("canvas");
      cropped.width = sw;
      cropped.height = sh;
      cropped.getContext("2d").drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(cropped.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("icon load failed"));
    image.src = src;
  });
}

async function loadWeapons() {
  try {
    const response = await fetch(`${API_BASE}/weapons`);
    if (!response.ok) throw new Error(`weapons failed (${response.status})`);
    const payload = await response.json();
    return payload.data || [];
  } catch {
    return [];
  }
}

function weaponsByName(weapons) {
  const map = new Map();
  for (const weapon of weapons) {
    const name = String(weapon.displayName || "").trim().toLowerCase();
    if (name) map.set(name, weapon);
  }
  return map;
}

function createGunIcon(weapon, src) {
  const icon = document.createElement("img");
  icon.className = "gun-icon";
  icon.alt = "";
  icon.decoding = "async";
  icon.draggable = false;
  icon.src = src;
  icon.addEventListener("error", () => {
    const fallback = weapon.killStreamIcon || weapon.displayIcon;
    if (fallback && icon.getAttribute("src") !== fallback) {
      icon.src = fallback;
      return;
    }
    icon.remove();
  });
  return icon;
}

function renderBuiltBoard(root, columns) {
  root.replaceChildren();
  const slots = [];
  columns.forEach((cells, colIndex) => {
    const col = document.createElement("div");
    col.className = "built-col";
    col.style.setProperty("--search-col", String(colIndex));
    if (!cells.length) {
      const empty = document.createElement("div");
      empty.className = "built-empty";
      col.append(empty);
    } else {
      let gtRow = 0;
      for (const cell of cells) {
        const el = document.createElement("div");
        el.className = cell.k === "gc" ? "built-gc" : "built-gt";
        if (!cell.n) el.classList.add("is-open");
        if (cell.locked) el.classList.add("is-locked");
        if (cell.tall === 2) el.classList.add("is-double");
        if (cell.k === "gt") el.style.setProperty("--search-row", String(gtRow++));
        if (cell.k === "gt" && cell.n) {
          if (cell.locked) {
            const slash = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            slash.setAttribute("class", "built-slash");
            slash.setAttribute("viewBox", "0 0 100 100");
            slash.setAttribute("preserveAspectRatio", "none");
            slash.setAttribute("aria-hidden", "true");
            const down = document.createElementNS("http://www.w3.org/2000/svg", "line");
            down.setAttribute("x1", "0");
            down.setAttribute("y1", "0");
            down.setAttribute("x2", "100");
            down.setAttribute("y2", "100");
            const up = document.createElementNS("http://www.w3.org/2000/svg", "line");
            up.setAttribute("x1", "100");
            up.setAttribute("y1", "0");
            up.setAttribute("x2", "0");
            up.setAttribute("y2", "100");
            slash.append(down, up);
            el.append(slash);
          }
          const swap = document.createElement("div");
          swap.className = "gun-swap";
          const name = document.createElement("span");
          name.className = "gun-name";
          name.textContent = cell.n;
          swap.append(name);
          if (!cell.locked) {
            const plus = document.createElement("span");
            plus.className = "built-plus-mark";
            plus.setAttribute("aria-hidden", "true");
            plus.textContent = "+";
            const shimmer = document.createElement("span");
            shimmer.className = "gun-search-shimmer";
            shimmer.setAttribute("aria-hidden", "true");
            swap.append(plus, shimmer);
            slots.push({ name: cell.n, swap });
          }
          el.append(swap);
        } else {
          el.textContent = cell.n;
        }
        col.append(el);
      }
    }
    root.append(col);
  });
  return slots;
}

async function fillGunIcons(slots) {
  const byName = weaponsByName(await loadWeapons());
  await Promise.all(
    slots.map(async ({ name, swap }) => {
      const weapon = byName.get(name.toLowerCase());
      if (!weapon) return;
      const src = weaponIcon(weapon);
      if (!src) return;
      let iconSrc = src;
      try {
        iconSrc = await cropTransparentPng(src);
      } catch {
        iconSrc = src;
      }
      swap.append(createGunIcon(weapon, iconSrc));
    })
  );
}

const board = document.getElementById("built-board");
if (board) {
  const slots = renderBuiltBoard(board, BUILT_COLUMNS);
  fillGunIcons(slots);
}

const builtState = {
  view: "explore",
  sort: "bundle",
  building: false,
  user: null,
  exploreCycle: 0,
  refreshing: false,
};

const USERNAME_KEY = "valocker-username";
const APP_ORIGIN = "http://127.0.0.1:4173";
const viewTabs = document.getElementById("built-view");
const viewButtons = document.querySelectorAll(".built-view [data-view]");
const sortWrap = document.getElementById("built-sort-wrap");
const sortEl = document.getElementById("built-sort");
const addBtn = document.getElementById("built-add");
const usernameEl = document.getElementById("built-username");
const refreshWrap = document.getElementById("built-refresh-wrap");
const refreshBtn = document.getElementById("built-refresh");
let refreshTimer = 0;

function cookieUsername() {
  const match = document.cookie.match(/(?:^|;\s*)valocker_username=([^;]*)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1] || "").trim();
  } catch {
    return "";
  }
}

function readRememberedUsername() {
  try {
    const stored = (localStorage.getItem(USERNAME_KEY) || "").trim();
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return cookieUsername();
}

function rememberUsername(name) {
  const value = String(name || "").trim();
  try {
    if (value) localStorage.setItem(USERNAME_KEY, value);
    else localStorage.removeItem(USERNAME_KEY);
  } catch {
    /* ignore */
  }
  document.cookie = value
    ? `valocker_username=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    : "valocker_username=; Path=/; SameSite=Lax; Max-Age=0";
}

function sessionUrl() {
  if (location.protocol === "file:") return `${APP_ORIGIN}/api/session`;
  return "/api/session";
}

function paintUsername(name) {
  const value = String(name || "").trim();
  if (usernameEl) usernameEl.textContent = value;
  if (value) document.body.dataset.user = value;
  else delete document.body.dataset.user;
}

function syncBuiltChrome() {
  document.body.dataset.view = builtState.view;
  document.body.classList.toggle("is-building", builtState.building);
  document.body.classList.toggle("is-authed", Boolean(builtState.user));
  paintUsername(builtState.user?.username || readRememberedUsername());
  if (viewTabs) viewTabs.dataset.on = builtState.view;
  for (const button of viewButtons) {
    const on = button.dataset.view === builtState.view;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-selected", on ? "true" : "false");
  }
  if (sortWrap) sortWrap.hidden = builtState.view !== "user";
  if (refreshWrap) refreshWrap.hidden = builtState.view !== "explore";
  if (sortEl) sortEl.value = builtState.sort;
  if (addBtn) {
    addBtn.classList.toggle("is-on", builtState.building);
    addBtn.setAttribute("aria-pressed", builtState.building ? "true" : "false");
  }
}

async function loadBuiltSession() {
  try {
    const response = await fetch(sessionUrl(), {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.user || null;
  } catch {
    return null;
  }
}

function cycleExplore() {
  if (builtState.view !== "explore" || builtState.refreshing) return;
  builtState.refreshing = true;
  builtState.exploreCycle += 1;
  document.body.dataset.exploreCycle = String(builtState.exploreCycle);
  document.body.classList.add("is-refreshing");
  refreshBtn?.classList.remove("is-spin");
  if (refreshBtn) {
    void refreshBtn.offsetWidth;
    refreshBtn.classList.add("is-spin");
  }
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    document.body.classList.remove("is-refreshing");
    builtState.refreshing = false;
  }, 1100);
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    builtState.view = button.dataset.view === "user" ? "user" : "explore";
    if (builtState.view === "explore") builtState.building = false;
    syncBuiltChrome();
  });
});
sortEl?.addEventListener("change", () => {
  builtState.sort = sortEl.value === "random" ? "random" : "bundle";
});
addBtn?.addEventListener("click", () => {
  builtState.building = !builtState.building;
  if (builtState.building) builtState.view = "user";
  syncBuiltChrome();
});
refreshBtn?.addEventListener("click", cycleExplore);
refreshBtn?.addEventListener("animationend", () => {
  refreshBtn.classList.remove("is-spin");
});

syncBuiltChrome();
loadBuiltSession().then((user) => {
  builtState.user = user;
  if (user?.username) rememberUsername(user.username);
  syncBuiltChrome();
});
