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
          if (!cell.locked) el.dataset.weapon = cell.n;
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
  fillGunIcons(slots).then(() => loadExploreStills(false));
}

const OWNER_USERNAME = "zapirpi";

const PART_KITS = {
  sidearm: [
    { id: "slide", label: "Slide" },
    { id: "frame", label: "Frame" },
    { id: "mag", label: "Mag" },
  ],
  smg: [
    { id: "muzzle", label: "Muzzle" },
    { id: "barrel", label: "Barrel" },
    { id: "receiver", label: "Receiver" },
    { id: "mag", label: "Mag" },
    { id: "stock", label: "Stock" },
  ],
  shotgun: [
    { id: "barrel", label: "Barrel" },
    { id: "receiver", label: "Receiver" },
    { id: "forend", label: "Forend" },
    { id: "stock", label: "Stock" },
  ],
  rifle: [
    { id: "muzzle", label: "Muzzle" },
    { id: "barrel", label: "Barrel" },
    { id: "receiver", label: "Receiver" },
    { id: "mag", label: "Mag" },
    { id: "stock", label: "Stock" },
    { id: "grip", label: "Grip" },
  ],
  sniper: [
    { id: "muzzle", label: "Muzzle" },
    { id: "barrel", label: "Barrel" },
    { id: "receiver", label: "Receiver" },
    { id: "mag", label: "Mag" },
    { id: "stock", label: "Stock" },
  ],
  lmg: [
    { id: "barrel", label: "Barrel" },
    { id: "receiver", label: "Receiver" },
    { id: "mag", label: "Mag" },
    { id: "stock", label: "Stock" },
    { id: "bipod", label: "Bipod" },
  ],
  melee: [
    { id: "blade", label: "Blade" },
    { id: "handle", label: "Handle" },
  ],
};

const WEAPON_CLASS = {
  Classic: "sidearm",
  Shorty: "sidearm",
  Frenzy: "sidearm",
  Ghost: "sidearm",
  Bandit: "sidearm",
  Sheriff: "sidearm",
  Stinger: "smg",
  Spectre: "smg",
  Bucky: "shotgun",
  Judge: "shotgun",
  Melee: "melee",
  Bulldog: "rifle",
  Guardian: "rifle",
  Warden: "rifle",
  Phantom: "rifle",
  Vandal: "rifle",
  Marshal: "sniper",
  Outlaw: "sniper",
  Operator: "sniper",
  Ares: "lmg",
  Odin: "lmg",
};

const builtState = {
  view: "explore",
  sort: "bundle",
  building: false,
  user: null,
  exploreCycle: 0,
  refreshing: false,
  workshop: null,
  publishes: {},
};

const USERNAME_KEY = "valocker-username";
const APP_ORIGIN = "http://127.0.0.1:4173";
const viewTabs = document.getElementById("built-view");
const viewButtons = document.querySelectorAll(".built-view [data-view]");
const sortWrap = document.getElementById("built-sort-wrap");
const sortEl = document.getElementById("built-sort");
const bundleWrap = document.getElementById("built-bundle-wrap");
const bundleEl = document.getElementById("built-bundle");
const bundleNameEl = document.getElementById("built-bundle-name");
const addBtn = document.getElementById("built-add");
const usernameEl = document.getElementById("built-username");
const refreshWrap = document.getElementById("built-refresh-wrap");
const refreshBtn = document.getElementById("built-refresh");
const workshopEl = document.getElementById("workshop");
const workshopTable = document.getElementById("workshop-table");
const workshopFile = document.getElementById("workshop-file");
const workshopToast = document.getElementById("workshop-toast");
const WORKSHOP_UNITS = 60;
let refreshTimer = 0;
let workshopSaveTimer = 0;
let workshopAttachSlot = "concept";
let workshopDrag = null;
let generateBusy = false;
let workshopToastTimer = 0;

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

function generateUrl() {
  if (location.protocol === "file:") return `${APP_ORIGIN}/api/generate`;
  return "/api/generate";
}

function workshopApi(path) {
  if (location.protocol === "file:") return `${APP_ORIGIN}${path}`;
  return path;
}

function canPublish(project) {
  return Boolean(String(project?.concept?.text || "").trim() && project?.still?.src && project?.commitId);
}

function syncPublishButton() {
  const button = workshopTable?.querySelector("[data-publish]");
  if (!button) return;
  button.disabled = generateBusy || !canPublish(builtState.workshop);
}

function currentCommitIndex(project) {
  const commits = project.commits || [];
  const index = commits.findIndex((commit) => commit.id === project.commitId);
  return index < 0 ? commits.length - 1 : index;
}

function applyCommit(project, commit) {
  if (!commit) {
    project.commitId = "";
    project.still = null;
    project.rev = 1;
    return;
  }
  project.commitId = commit.id;
  project.rev = currentCommitIndex(project) + 1;
  project.still = {
    src: commit.src,
    prompt: commit.prompt || "",
    at: Date.now(),
    id: commit.id,
  };
}

function adoptSharedBundle(project, names) {
  if (!project || project.still || project.commitId || project.concept?.text) return false;
  if (project.name && project.name !== "Draft1") return false;
  const real = [...new Set((names || []).filter((name) => name && name !== "Draft1" && name !== "__new__"))];
  const last = lastBundleName();
  const pick = last && last !== "Draft1" && real.includes(last) ? last : real[real.length - 1];
  if (!pick) return false;
  project.name = pick;
  return true;
}

function paintBundleSelect(project, names) {
  if (!bundleEl || !project) return;
  const current = String(project.name || "").trim() || "Draft1";
  const unique = [...new Set(names.filter(Boolean))];
  if (!unique.includes(current)) unique.unshift(current);
  bundleEl.replaceChildren();
  for (const name of unique) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    bundleEl.append(option);
  }
  const create = document.createElement("option");
  create.value = "__new__";
  create.textContent = "Create new…";
  bundleEl.append(create);
  bundleEl.value = current;
  if (bundleNameEl) {
    bundleNameEl.hidden = true;
    bundleNameEl.value = "";
  }
}

async function loadWorkshopBundles(project) {
  if (!project) return;
  const local = localBundleNames();
  try {
    const response = await fetch(workshopApi(`/api/workshop/commits?weapon=${encodeURIComponent(project.weapon)}`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) {
      paintBundleSelect(project, local.concat(project.name));
      return;
    }
    const data = await response.json();
    const names = [
      ...(data.bundles || []),
      ...local,
      ...(data.commits || []).map((commit) => commit.name),
    ].filter(Boolean);
    const adopted = adoptSharedBundle(project, names);
    paintBundleSelect(project, names);
    if (adopted) await loadWorkshopCommits(project);
  } catch {
    const names = local.concat(project.name);
    const adopted = adoptSharedBundle(project, names);
    paintBundleSelect(project, names);
    if (adopted) await loadWorkshopCommits(project);
  }
}

async function switchBundle(name) {
  const project = builtState.workshop;
  if (!project || !name) return;
  persistProject();
  project.name = name.slice(0, 32);
  project.commitId = "";
  project.still = null;
  project.commits = [];
  await loadWorkshopCommits(project);
  persistProject();
  paintWorkshop();
  paintBundleSelect(project, [...bundleEl.options].map((opt) => opt.value).filter((value) => value && value !== "__new__").concat(name));
}

async function loadWorkshopCommits(project) {
  if (!project) return;
  try {
    const bundle = encodeURIComponent(project.name || "");
    const response = await fetch(workshopApi(`/api/workshop/commits?weapon=${encodeURIComponent(project.weapon)}&bundle=${bundle}`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    project.commits = Array.isArray(data.commits) ? data.commits : [];
    project.bundleStill = project.commits.length ? "" : String(data.bundle_src || "");
    const current = project.commits.find((commit) => commit.id === project.commitId) || project.commits[project.commits.length - 1];
    if (current) applyCommit(project, current);
  } catch {
    /* keep draft */
  }
}

function showWorkshopToast(message, ms = 2800) {
  if (!workshopToast) return;
  window.clearTimeout(workshopToastTimer);
  workshopToast.textContent = message;
  workshopToast.hidden = false;
  requestAnimationFrame(() => workshopToast.classList.add("is-on"));
  workshopToastTimer = window.setTimeout(() => {
    workshopToast.classList.remove("is-on");
  }, ms);
}

function packRef(src) {
  const match = String(src || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i);
  if (!match) return null;
  const data = match[2].replace(/\s+/g, "");
  if (!data || data.length > 400000) return null;
  return { mime: match[1].toLowerCase(), data };
}

function packSlotRefs(slot, limit) {
  const refs = [];
  for (const ref of slot?.refs || []) {
    if (refs.length >= limit) break;
    const packed = packRef(ref.src);
    if (packed) refs.push(packed);
  }
  return refs;
}

function buildGenerateBody(project) {
  let left = 4;
  const conceptRefs = packSlotRefs(project.concept, left);
  left -= conceptRefs.length;
  const parts = {};
  for (const part of kitFor(project.weapon)) {
    const refs = packSlotRefs(project.parts[part.id], left);
    left -= refs.length;
    parts[part.id] = { text: project.parts[part.id]?.text || "", refs };
  }
  return {
    weapon: project.weapon,
    name: project.name,
    parent_id: project.commitId || "",
    base_src: project.still?.src || project.bundleStill || "",
    concept: { text: project.concept.text || "", refs: conceptRefs },
    parts,
  };
}

async function requestGenerate() {
  const project = builtState.workshop;
  if (!project || generateBusy) return;
  generateBusy = true;
  paintWorkshop();
  try {
    const response = await fetch(generateUrl(), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGenerateBody(project)),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Generate failed");
    if (builtState.workshop?.weapon === project.weapon) {
      const commit = data.commit || { id: "", src: data.src, prompt: data.prompt || "" };
      if (commit.id) {
        builtState.workshop.commits = [...(builtState.workshop.commits || []).filter((row) => row.id !== commit.id), commit];
        applyCommit(builtState.workshop, commit);
      } else {
        builtState.workshop.still = { src: data.src, prompt: data.prompt || "", at: Date.now() };
      }
      persistProject();
    }
  } catch (error) {
    showWorkshopToast(error.message || "Generate failed");
  } finally {
    generateBusy = false;
    if (builtState.workshop) paintWorkshop();
  }
}

function paintUsername(name) {
  const value = String(name || "").trim();
  if (usernameEl) usernameEl.textContent = value;
  if (value) document.body.dataset.user = value;
  else delete document.body.dataset.user;
}

function isWorkshopOwner() {
  return String(builtState.user?.username || "").trim().toLowerCase() === OWNER_USERNAME;
}

function kitFor(weapon) {
  return PART_KITS[WEAPON_CLASS[weapon] || "rifle"] || PART_KITS.rifle;
}

function workshopKey(weapon) {
  const user = String(builtState.user?.username || "").trim().toLowerCase();
  return `valocker-workshop:${user}:${weapon}`;
}

function lastBundleKey() {
  const user = String(builtState.user?.username || "").trim().toLowerCase();
  return `valocker-workshop-bundle:${user}`;
}

function lastBundleName() {
  try {
    return String(localStorage.getItem(lastBundleKey()) || "").trim().slice(0, 32);
  } catch {
    return "";
  }
}

function localBundleNames() {
  const user = String(builtState.user?.username || "").trim().toLowerCase();
  const prefix = `valocker-workshop:${user}:`;
  const names = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      const data = JSON.parse(localStorage.getItem(key) || "{}");
      const name = String(data?.name || "").trim();
      if (name && name !== "Draft1") names.push(name);
    }
  } catch {
    /* keep vault names */
  }
  return names;
}

function emptySlot() {
  return { text: "", refs: [] };
}

function makeProject(weapon) {
  const klass = WEAPON_CLASS[weapon] || "rifle";
  const parts = {};
  for (const part of kitFor(weapon)) parts[part.id] = emptySlot();
  return {
    v: 1,
    weapon,
    klass,
    name: "Draft1",
    rev: 1,
    exploded: false,
    chatOpen: false,
    colWeights: kitFor(weapon).map(() => 1),
    concept: emptySlot(),
    parts,
    still: null,
    bundleStill: "",
    commits: [],
    commitId: "",
  };
}

function readProject(weapon) {
  try {
    const raw = localStorage.getItem(workshopKey(weapon));
    if (!raw) return makeProject(weapon);
    const data = JSON.parse(raw);
    const next = makeProject(weapon);
    if (data && typeof data === "object") {
      next.name = String(data.name || "Draft1").slice(0, 32) || "Draft1";
      next.rev = Math.max(1, Number(data.rev) || 1);
      next.exploded = Boolean(data.exploded);
      next.chatOpen = Boolean(data.chatOpen);
      if (Array.isArray(data.colWeights) && data.colWeights.length === kitFor(weapon).length) {
        next.colWeights = data.colWeights.map((weight) => Math.max(0.35, Number(weight) || 1));
      }
      next.concept.text = String(data.concept?.text || "");
      next.concept.refs = Array.isArray(data.concept?.refs) ? data.concept.refs.filter((ref) => ref?.src) : [];
      next.commitId = String(data.commitId || "");
      if (data.still?.src) {
        next.still = {
          src: String(data.still.src),
          prompt: String(data.still.prompt || ""),
          at: Number(data.still.at) || 0,
          id: String(data.still.id || data.commitId || ""),
        };
      }
      for (const part of kitFor(weapon)) {
        const saved = data.parts?.[part.id];
        next.parts[part.id].text = String(saved?.text || "");
        next.parts[part.id].refs = Array.isArray(saved?.refs) ? saved.refs.filter((ref) => ref?.src) : [];
      }
    }
    return next;
  } catch {
    return makeProject(weapon);
  }
}

function persistProject() {
  const project = builtState.workshop;
  if (!project || !isWorkshopOwner()) return;
  try {
    localStorage.setItem(workshopKey(project.weapon), JSON.stringify(project));
    if (project.name && project.name !== "Draft1") localStorage.setItem(lastBundleKey(), project.name);
  } catch {
    const slim = {
      ...project,
      still: project.still
        ? { prompt: project.still.prompt || "", at: project.still.at || 0, id: project.still.id || project.commitId || "" }
        : null,
      concept: { text: project.concept.text, refs: [] },
      parts: Object.fromEntries(
        Object.entries(project.parts).map(([id, slot]) => [id, { text: slot.text, refs: [] }])
      ),
    };
    try {
      localStorage.setItem(workshopKey(project.weapon), JSON.stringify(slim));
      if (project.name && project.name !== "Draft1") localStorage.setItem(lastBundleKey(), project.name);
    } catch {
      /* quota */
    }
  }
}

function queuePersist() {
  window.clearTimeout(workshopSaveTimer);
  workshopSaveTimer = window.setTimeout(persistProject, 180);
}

function slotOf(id) {
  const project = builtState.workshop;
  if (!project) return null;
  return id === "concept" ? project.concept : project.parts[id] || null;
}

function makeSlash() {
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
  return slash;
}

function workshopSpan(count) {
  return Math.max(1, Math.floor(WORKSHOP_UNITS / Math.max(1, count)));
}

function paintRefs(root, slot) {
  if (!root) return;
  root.replaceChildren();
  for (const [index, ref] of (slot.refs || []).entries()) {
    const wrap = document.createElement("div");
    wrap.className = "workshop-ref";
    const img = document.createElement("img");
    img.alt = "";
    img.src = ref.src;
    const drop = document.createElement("button");
    drop.type = "button";
    drop.dataset.refIndex = String(index);
    drop.textContent = "×";
    drop.setAttribute("aria-label", "Remove reference");
    wrap.append(img, drop);
    root.append(wrap);
  }
}

function makeCell(className, span, end) {
  const cell = document.createElement("div");
  cell.className = `workshop-cell ${className}`.trim();
  if (end) cell.classList.add("is-end");
  if (span) cell.style.gridColumn = `span ${span}`;
  return cell;
}

function makeRefCell(slotId, slot, extraClass = "workshop-refcell") {
  const cell = document.createElement("div");
  cell.className = `workshop-cell ${extraClass}`;
  cell.dataset.slot = slotId;
  const label = document.createElement("span");
  label.className = "workshop-ref-label";
  label.textContent = "Ref";
  const refs = document.createElement("div");
  refs.className = "workshop-refs";
  cell.append(label, refs);
  paintRefs(refs, slot);
  return cell;
}

function makeChatCell(slotId, slot, withToggle) {
  const cell = makeCell("workshop-chat");
  cell.dataset.slot = slotId;
  const area = document.createElement("textarea");
  area.spellcheck = false;
  area.placeholder = "chat";
  area.value = slot.text;
  area.dataset.slot = slotId;
  cell.append(area);
  if (withToggle) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "workshop-chat-toggle";
    toggle.dataset.chatToggle = "1";
    toggle.setAttribute("aria-label", builtState.workshop?.chatOpen ? "Collapse chat" : "Expand chat");
    toggle.textContent = builtState.workshop?.chatOpen ? "∨" : "∧";
    cell.append(toggle);
  }
  return cell;
}

function applyColWeights(body, weights) {
  if (!body) return;
  const cols = weights.map((weight) => `minmax(0, ${weight}fr)`).join(" ");
  body.style.setProperty("--ws-cols", cols);
  body.style.gridTemplateColumns = cols;
}

function syncWorkshopState() {
  const state = workshopTable?.querySelector(".workshop-state");
  const project = builtState.workshop;
  if (!state || !project) return;
  const on = project.exploded ? "exploded" : "collapse";
  state.dataset.on = on;
  for (const button of state.querySelectorAll("[data-mode]")) {
    button.classList.toggle("is-on", button.dataset.mode === on);
  }
}

function renderWorkshop({ keepBar = false } = {}) {
  const project = builtState.workshop;
  if (!workshopTable || !project) return;
  const kit = kitFor(project.weapon);
  if (!Array.isArray(project.colWeights) || project.colWeights.length !== kit.length) {
    project.colWeights = kit.map(() => 1);
  }

  workshopTable.className = `workshop-table${project.chatOpen ? " is-chat-open" : ""}`;

  const bar = document.createElement("div");
  bar.className = "workshop-bar";
  function barCell(child, end) {
    const cell = makeCell("", 0, end);
    cell.append(child);
    bar.append(cell);
  }
  const state = document.createElement("div");
  state.className = "built-view workshop-state";
  state.dataset.on = project.exploded ? "exploded" : "collapse";
  const thumb = document.createElement("span");
  thumb.className = "built-view-thumb";
  thumb.setAttribute("aria-hidden", "true");
  const collapse = document.createElement("button");
  collapse.type = "button";
  collapse.dataset.mode = "collapse";
  collapse.textContent = "Collapse";
  collapse.classList.toggle("is-on", !project.exploded);
  const explodedBtn = document.createElement("button");
  explodedBtn.type = "button";
  explodedBtn.dataset.mode = "exploded";
  explodedBtn.textContent = "Exploded";
  explodedBtn.classList.toggle("is-on", project.exploded);
  state.append(thumb, collapse, explodedBtn);
  const gun = document.createElement("div");
  gun.textContent = project.weapon;
  const rev = document.createElement("div");
  rev.className = "workshop-rev";
  const prev = document.createElement("button");
  prev.type = "button";
  prev.dataset.rev = "-1";
  prev.textContent = "<";
  prev.setAttribute("aria-label", "Previous version");
  const revLabel = document.createElement("span");
  const commitCount = (project.commits || []).length;
  const commitIndex = currentCommitIndex(project);
  revLabel.textContent = commitCount ? `Version ${commitIndex + 1}` : "Version 1";
  prev.disabled = commitIndex <= 0;
  const next = document.createElement("button");
  next.type = "button";
  next.dataset.rev = "1";
  next.textContent = ">";
  next.setAttribute("aria-label", "Next version");
  next.disabled = commitIndex < 0 || commitIndex >= commitCount - 1;
  rev.append(prev, revLabel, next);
  const publish = document.createElement("button");
  publish.type = "button";
  publish.className = "workshop-publish";
  publish.dataset.publish = "1";
  publish.textContent = "Publish";
  publish.disabled = generateBusy || !canPublish(project);
  barCell(state, false);
  barCell(gun, false);
  barCell(rev, false);
  barCell(publish, true);

  const body = document.createElement("div");
  body.className = `workshop-body${project.exploded ? " is-exploded" : ""}`;
  if (project.exploded) {
    applyColWeights(body, project.colWeights);
    kit.forEach((col, index) => {
      const end = index === kit.length - 1;
      const part = makeCell("workshop-part", 0, end);
      part.textContent = col.label;
      body.append(part);
    });
    kit.forEach((col, index) => {
      const end = index === kit.length - 1;
      const mesh = makeCell("workshop-mesh", 0, end);
      mesh.append(makeSlash());
      if (!end) {
        const split = document.createElement("button");
        split.type = "button";
        split.className = "workshop-col-split";
        split.dataset.split = String(index);
        split.setAttribute("aria-label", "Resize preview");
        mesh.append(split);
      }
      body.append(mesh);
    });
    kit.forEach((col, index) => {
      const chat = makeChatCell(col.id, project.parts[col.id], false);
      if (index === kit.length - 1) chat.classList.add("is-end");
      body.append(chat);
    });
    kit.forEach((col, index) => {
      const ref = makeRefCell(col.id, project.parts[col.id]);
      if (index === kit.length - 1) ref.classList.add("is-end");
      body.append(ref);
    });
  } else {
    const mesh = makeCell("workshop-mesh is-end");
    if (project.still?.src) {
      mesh.classList.add("has-still");
      const img = document.createElement("img");
      img.className = "workshop-still";
      img.alt = "";
      img.src = project.still.src;
      mesh.append(img);
    } else {
      mesh.append(makeSlash());
    }
    body.append(mesh);
  }

  const foot = document.createElement("div");
  foot.className = "workshop-footrow";
  const footRef = makeRefCell("concept", project.concept, "workshop-foot is-ref");
  const footChat = makeChatCell("concept", project.concept, true);
  footChat.classList.add("workshop-foot", "is-chat");
  const generateCell = makeCell("workshop-foot is-generate is-end");
  const go = document.createElement("button");
  go.type = "button";
  go.className = "workshop-generate";
  go.dataset.generate = "1";
  go.disabled = generateBusy;
  go.textContent = generateBusy ? "Generating…" : "Generate";
  generateCell.append(go);
  foot.append(footRef, footChat, generateCell);

  const existingBar = keepBar ? workshopTable.querySelector(".workshop-bar") : null;
  if (existingBar) {
    syncWorkshopState();
    workshopTable.replaceChildren(existingBar, body, foot);
    return;
  }
  workshopTable.replaceChildren(bar, body, foot);
}

function paintWorkshop(options) {
  renderWorkshop(options);
}

async function addRefs(slot, files) {
  if (!slot || !files?.length) return;
  const incoming = [...files].filter((file) => file.type.startsWith("image/")).slice(0, 6 - slot.refs.length);
  for (const file of incoming) {
    const src = await readRef(file);
    if (src) slot.refs.push({ name: file.name, src });
  }
  persistProject();
  paintWorkshop();
}

async function openWorkshop(weapon) {
  if (!isWorkshopOwner() || !WEAPON_CLASS[weapon]) return;
  builtState.workshop = readProject(weapon);
  const last = lastBundleName();
  if (
    last &&
    last !== "Draft1" &&
    !builtState.workshop.still &&
    !builtState.workshop.commitId &&
    !builtState.workshop.concept.text &&
    builtState.workshop.name === "Draft1"
  ) {
    builtState.workshop.name = last;
  }
  builtState.building = true;
  builtState.view = "user";
  if (workshopEl) workshopEl.hidden = false;
  document.body.classList.add("is-workshop");
  paintWorkshop();
  syncBuiltChrome();
  await loadWorkshopBundles(builtState.workshop);
  await loadWorkshopCommits(builtState.workshop);
  if (builtState.workshop?.weapon === weapon) {
    persistProject();
    paintWorkshop();
  }
}

function closeWorkshop() {
  persistProject();
  builtState.workshop = null;
  if (workshopEl) workshopEl.hidden = true;
  document.body.classList.remove("is-workshop");
}

function syncBuiltChrome() {
  document.body.dataset.view = builtState.view;
  document.body.classList.toggle("is-building", builtState.building);
  document.body.classList.toggle("is-authed", Boolean(builtState.user));
  document.body.classList.toggle("is-workshop", Boolean(builtState.workshop));
  paintUsername(builtState.user?.username || readRememberedUsername());
  if (viewTabs) viewTabs.dataset.on = builtState.view;
  for (const button of viewButtons) {
    const on = button.dataset.view === builtState.view;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-selected", on ? "true" : "false");
  }
  if (sortWrap) sortWrap.hidden = builtState.view !== "user" || Boolean(builtState.workshop);
  if (refreshWrap) refreshWrap.hidden = builtState.view !== "explore" || Boolean(builtState.workshop);
  if (bundleWrap) bundleWrap.hidden = !builtState.workshop;
  if (sortEl) sortEl.value = builtState.sort;
  if (addBtn) {
    addBtn.classList.toggle("is-on", builtState.building);
    addBtn.setAttribute("aria-pressed", builtState.building ? "true" : "false");
  }
  if (workshopEl) workshopEl.hidden = !builtState.workshop;
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

function applyExploreStill(swap, src) {
  if (!swap) return;
  const cell = swap.closest(".built-gt");
  const weapon = cell?.dataset.weapon || "skin";
  if (cell) {
    if (src) cell.dataset.stillSrc = src;
    else delete cell.dataset.stillSrc;
  }
  let still = swap.querySelector(".gun-still");
  let open = swap.querySelector(".gun-still-open");
  const icon = swap.querySelector(".gun-icon");
  if (!src) {
    still?.remove();
    open?.remove();
    if (icon) icon.hidden = false;
    return;
  }
  if (!still) {
    still = document.createElement("img");
    still.className = "gun-icon gun-still";
    still.alt = "";
    still.draggable = false;
    still.addEventListener("error", () => {
      still.remove();
      swap.querySelector(".gun-still-open")?.remove();
      if (cell) delete cell.dataset.stillSrc;
      if (icon) icon.hidden = false;
    });
    swap.append(still);
  }
  still.src = src;
  if (!open) {
    open = document.createElement("a");
    open.className = "gun-still-open";
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    swap.append(open);
  }
  open.href = src;
  open.setAttribute("aria-label", `Open ${weapon} concept`);
  if (icon) icon.hidden = true;
}

function paintExploreStills(publishes, randomize) {
  if (!board || !publishes) return;
  for (const cell of board.querySelectorAll(".built-gt[data-weapon]")) {
    const mine = builtState.view === "user";
    const user = String(builtState.user?.username || "").trim().toLowerCase();
    const pool = (publishes[cell.dataset.weapon] || []).filter((item) => !mine || String(item.username || "").toLowerCase() === user);
    const pick = pool.length ? pool[randomize ? Math.floor(Math.random() * pool.length) : pool.length - 1] : null;
    applyExploreStill(cell.querySelector(".gun-swap"), pick?.src || "");
  }
}

async function loadExploreStills(randomize = false) {
  try {
    const response = await fetch(workshopApi("/api/explore"), { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    builtState.publishes = data.publishes || {};
    paintExploreStills(builtState.publishes, randomize);
  } catch {
    /* silhouette */
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
  paintExploreStills(builtState.publishes || {}, true);
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    document.body.classList.remove("is-refreshing");
    builtState.refreshing = false;
  }, 1100);
}

async function requestPublish() {
  const project = builtState.workshop;
  if (!canPublish(project)) return;
  try {
    const response = await fetch(workshopApi("/api/workshop/publish"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weapon: project.weapon, commit_id: project.commitId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Publish failed");
    showWorkshopToast("Published");
    loadExploreStills(false);
  } catch (error) {
    showWorkshopToast(error.message || "Publish failed");
  }
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (builtState.workshop) return;
    builtState.view = button.dataset.view === "user" ? "user" : "explore";
    if (builtState.view === "explore") builtState.building = false;
    closeWorkshop();
    syncBuiltChrome();
    paintExploreStills(builtState.publishes || {}, false);
  });
});
bundleEl?.addEventListener("change", () => {
  if (bundleEl.value === "__new__") {
    if (bundleNameEl) {
      bundleNameEl.hidden = false;
      bundleNameEl.value = "";
      bundleNameEl.focus();
    }
    return;
  }
  switchBundle(bundleEl.value);
});
bundleNameEl?.addEventListener("change", () => {
  const name = String(bundleNameEl.value || "").trim().slice(0, 32);
  if (!name) return;
  bundleNameEl.hidden = true;
  switchBundle(name);
});
sortEl?.addEventListener("change", () => {
  builtState.sort = sortEl.value === "random" ? "random" : "bundle";
});
addBtn?.addEventListener("click", () => {
  if (builtState.workshop) {
    closeWorkshop();
    builtState.building = false;
    syncBuiltChrome();
    return;
  }
  builtState.building = !builtState.building;
  if (builtState.building) builtState.view = "user";
  syncBuiltChrome();
});
refreshBtn?.addEventListener("click", cycleExplore);
refreshBtn?.addEventListener("animationend", () => {
  refreshBtn.classList.remove("is-spin");
});
board?.addEventListener("click", (event) => {
  if (!builtState.building || !isWorkshopOwner()) return;
  const cell = event.target.closest(".built-gt[data-weapon]");
  if (!cell || cell.classList.contains("is-locked")) return;
  event.preventDefault();
  openWorkshop(cell.dataset.weapon);
});
workshopEl?.addEventListener("click", (event) => {
  const project = builtState.workshop;
  if (!project) return;
  if (event.target.closest("[data-generate]")) {
    requestGenerate();
    return;
  }
  if (event.target.closest("[data-publish]")) {
    requestPublish();
    return;
  }
  const revBtn = event.target.closest("[data-rev]");
  if (revBtn) {
    const commits = project.commits || [];
    const index = currentCommitIndex(project) + Number(revBtn.dataset.rev);
    if (index < 0 || index >= commits.length) return;
    applyCommit(project, commits[index]);
    persistProject();
    paintWorkshop();
    return;
  }
  const mode = event.target.closest("[data-mode]");
  if (mode) {
    const next = mode.dataset.mode === "exploded";
    if (project.exploded === next) return;
    project.exploded = next;
    syncWorkshopState();
    persistProject();
    paintWorkshop({ keepBar: true });
    return;
  }
  const partTitle = event.target.closest(".workshop-part");
  if (partTitle && project.exploded) {
    const body = workshopTable?.querySelector(".workshop-body");
    body?.classList.remove("is-resizing");
    project.colWeights = kitFor(project.weapon).map(() => 1);
    applyColWeights(body, project.colWeights);
    persistProject();
    return;
  }
  const toggle = event.target.closest("[data-chat-toggle]");
  if (toggle) {
    project.chatOpen = !project.chatOpen;
    persistProject();
    paintWorkshop();
    return;
  }
  const cut = event.target.closest("[data-ref-index]");
  if (cut) {
    const cell = cut.closest("[data-slot]");
    const slot = slotOf(cell?.dataset.slot);
    if (slot) {
      slot.refs.splice(Number(cut.dataset.refIndex), 1);
      persistProject();
      paintWorkshop();
    }
    return;
  }
  const refCell = event.target.closest(".workshop-refcell, .workshop-foot.is-ref");
  if (refCell && workshopFile) {
    workshopAttachSlot = refCell.dataset.slot || "concept";
    workshopFile.value = "";
    workshopFile.click();
  }
});
workshopEl?.addEventListener("focusin", (event) => {
  const chat = event.target.closest(".workshop-body .workshop-chat");
  chat?.classList.add("is-focus");
});
workshopEl?.addEventListener("focusout", (event) => {
  const chat = event.target.closest(".workshop-body .workshop-chat");
  if (!chat) return;
  window.setTimeout(() => {
    if (!chat.contains(document.activeElement)) chat.classList.remove("is-focus");
  }, 0);
});
workshopEl?.addEventListener("input", (event) => {
  const project = builtState.workshop;
  if (!project) return;
  if (event.target.dataset.workshopName) {
    return;
  }
  if (event.target.dataset.slot) {
    const slot = slotOf(event.target.dataset.slot);
    if (slot) {
      slot.text = event.target.value;
      queuePersist();
      if (event.target.dataset.slot === "concept") syncPublishButton();
    }
  }
});
workshopEl?.addEventListener("dragover", (event) => {
  const cell = event.target.closest(".workshop-refcell, .workshop-foot.is-ref");
  if (!cell) return;
  event.preventDefault();
  cell.classList.add("is-drop");
});
workshopEl?.addEventListener("dragleave", (event) => {
  const cell = event.target.closest(".workshop-refcell, .workshop-foot.is-ref");
  cell?.classList.remove("is-drop");
});
workshopEl?.addEventListener("drop", async (event) => {
  const cell = event.target.closest(".workshop-refcell, .workshop-foot.is-ref");
  if (!cell) return;
  event.preventDefault();
  cell.classList.remove("is-drop");
  await addRefs(slotOf(cell.dataset.slot), event.dataTransfer?.files);
});
workshopEl?.addEventListener("pointerdown", (event) => {
  const split = event.target.closest(".workshop-col-split");
  const project = builtState.workshop;
  if (!split || !project?.exploded) return;
  const body = workshopTable?.querySelector(".workshop-body");
  if (!body) return;
  event.preventDefault();
  body.classList.add("is-resizing");
  workshopDrag = {
    index: Number(split.dataset.split),
    x: event.clientX,
    width: body.getBoundingClientRect().width,
    weights: project.colWeights.slice(),
  };
  split.setPointerCapture?.(event.pointerId);
});
window.addEventListener("pointermove", (event) => {
  if (!workshopDrag || !builtState.workshop) return;
  const { index, x, width, weights } = workshopDrag;
  const pair = weights[index] + weights[index + 1];
  const left = weights[index];
  const delta = ((event.clientX - x) / width) * weights.reduce((sum, weight) => sum + weight, 0);
  const nextLeft = Math.min(pair - 0.35, Math.max(0.35, left + delta));
  builtState.workshop.colWeights[index] = nextLeft;
  builtState.workshop.colWeights[index + 1] = pair - nextLeft;
  applyColWeights(workshopTable?.querySelector(".workshop-body"), builtState.workshop.colWeights);
});
window.addEventListener("pointerup", () => {
  if (!workshopDrag) return;
  workshopTable?.querySelector(".workshop-body")?.classList.remove("is-resizing");
  workshopDrag = null;
  persistProject();
});
workshopFile?.addEventListener("change", async () => {
  await addRefs(slotOf(workshopAttachSlot), workshopFile.files);
});

function readRef(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

syncBuiltChrome();
loadBuiltSession().then((user) => {
  builtState.user = user;
  if (user?.username) rememberUsername(user.username);
  syncBuiltChrome();
});
