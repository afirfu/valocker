const API_BASE = "https://valorant-api.com/v1";
const MELEE_CATEGORY = "EEquippableCategory::Melee";
const FINISHER_LEVEL = "EEquippableSkinLevelItem::Finisher";
const MAX_SEQUEL_WAVE = 5;
const ALREADY_VERSIONED = /2\.0|\/\/\d|Vol\.?\s*\d|\bIII\b|\bII\b/i;

const CATEGORY_RANK = {
  "EEquippableCategory::Rifle": 0,
  "EEquippableCategory::SMG": 1,
  "EEquippableCategory::Sniper": 2,
  "EEquippableCategory::Sidearm": 3,
  "EEquippableCategory::Heavy": 4,
  "EEquippableCategory::Shotgun": 5,
};

const CATEGORY_LABEL = {
  "EEquippableCategory::Rifle": "Assault Rifles",
};

const WEAPON_ORDER = [
  "Vandal",
  "Phantom",
  "Bulldog",
  "Guardian",
  "Warden",
  "Stinger",
  "Spectre",
  "Operator",
  "Marshal",
  "Outlaw",
  "Classic",
  "Shorty",
  "Frenzy",
  "Ghost",
  "Sheriff",
  "Bandit",
  "Odin",
  "Ares",
  "Judge",
  "Bucky",
];

const RARITY_COLUMNS = [
  { label: "Ultra/Exclusive", finisher: "(with finisher)", tierNames: ["Ultra Edition", "Exclusive Edition"] },
  { label: "Premium", finisher: "(with finisher)", tierNames: ["Premium Edition"] },
  { label: "Premium", finisher: "(without finisher)", tierNames: ["Premium Edition"] },
  { label: "Select/Deluxe", finisher: "(without finisher)", tierNames: ["Select Edition", "Deluxe Edition"] },
];

const DROPDOWN_VISIBLE = 15;
const BUCKETS = ["ultraExclusive", "premiumFinisher", "premiumNoFinisher", "selectDeluxe"];

const tableBody = document.getElementById("locker-body");
const headerRow = document.getElementById("locker-head");
const sortEl = document.getElementById("locker-sort");
const filterBtn = document.getElementById("locker-filter");
const filterMenu = document.getElementById("filter-menu");
const labelBtn = document.getElementById("locker-label");
const labelOverlay = document.getElementById("label-overlay");
const labelEditor = document.getElementById("label-editor");
const labelGunEl = document.getElementById("label-gun");
const labelRarityEl = document.getElementById("label-rarity");
const labelSkinEl = document.getElementById("label-skin");
const labelUpdateBtn = document.getElementById("label-update");
const labelToast = document.getElementById("label-toast");
let labelToastTimer = 0;
let labelOverlayTimer = 0;
const identityForm = document.getElementById("meta-identity");
const usernameInput = document.getElementById("app-username");
const secretField = document.getElementById("meta-secret");
const secretLabel = document.getElementById("meta-secret-label");
const passwordInput = document.getElementById("meta-password");
const usernameTitle = document.getElementById("username-title");
const saveLockerBtn = document.getElementById("save-locker");
const logoutBtn = document.getElementById("logout-btn");
const exportBtn = document.getElementById("export-docx");
const EXPORT_SOURCES = new Set(["collection", "battlepass", "limited", "agent"]);
const APP_ORIGIN = "http://127.0.0.1:4173";

let lockerCatalog = null;
const FILTER_LABELS = {
  collection: "Collection",
  battlepass: "Battlepass",
  limited: "Limited",
  agent: "Agent gear",
};
const LIMITED_MARK = /champions|\bvct\b|lock\s*\/{0,2}\s*in|esports/i;
let lockerView = { sort: "appearance", filters: new Set(["collection"]) };
const lockerPicks = new Map();
const lastSavedPicks = new Map();
const lockerLabels = new Map();
const lastSavedLabels = new Map();
const LABEL_COLORS = {
  warpath: "#f5c6b8",
  beastly: "#f5c6b8",
  archetype: "#b9d4f0",
  derivation: "#b9d4f0",
  minimal: "#c5e6c4",
  technological: "#c5e6c4",
  whimsical: "#f7e8a0",
  cartoonish: "#f7e8a0",
};
const LABEL_FAMILIES = {
  warpath: "red",
  beastly: "red",
  archetype: "blue",
  derivation: "blue",
  minimal: "green",
  technological: "green",
  whimsical: "yellow",
  cartoonish: "yellow",
};
let labelDraft = { pickId: "", color: "", slant: false, bold: false };
let labelling = false;
let currentUser = null;
let identityExists = null;
let identityTimer = 0;
let identitySeq = 0;

function apiUrl(path) {
  const localApp =
    (location.hostname === "127.0.0.1" || location.hostname === "localhost") && location.port === "4173";
  return localApp ? path : `${APP_ORIGIN}${path}`;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      credentials: "include",
      headers,
    });
  } catch {
    throw new Error("Can't reach the app server. Open http://127.0.0.1:4173/index.html after running py -3 server.py.");
  }
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Can't reach the app server. Open http://127.0.0.1:4173/index.html after running py -3 server.py.");
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function fieldWrap(input) {
  return input.closest(".meta-input-wrap");
}

function closeWarnTips(exceptWrap = null) {
  for (const wrap of document.querySelectorAll(".meta-input-wrap")) {
    if (wrap === exceptWrap) continue;
    const tip = wrap.querySelector(".meta-warn-tip");
    if (tip) tip.hidden = true;
  }
}

function clearFieldError(input) {
  const wrap = fieldWrap(input);
  if (!wrap) return;
  wrap.classList.remove("has-warn");
  const button = wrap.querySelector(".meta-warn");
  const tip = wrap.querySelector(".meta-warn-tip");
  if (button) button.hidden = true;
  if (tip) {
    tip.hidden = true;
    tip.textContent = "";
  }
}

function clearAuthErrors() {
  clearFieldError(usernameInput);
  clearFieldError(passwordInput);
}

function setFieldError(input, message) {
  clearAuthErrors();
  if (!message) return;
  const wrap = fieldWrap(input);
  const button = wrap.querySelector(".meta-warn");
  const tip = wrap.querySelector(".meta-warn-tip");
  wrap.classList.add("has-warn");
  button.hidden = false;
  tip.textContent = message;
  tip.hidden = true;
}

function toggleWarnTip(wrap) {
  const tip = wrap.querySelector(".meta-warn-tip");
  if (!tip || !wrap.classList.contains("has-warn")) return;
  const open = tip.hidden;
  closeWarnTips(wrap);
  tip.hidden = !open;
}

function currentUsername() {
  return usernameInput.value.trim();
}

function sameUser(username, user = currentUser) {
  if (!user) return false;
  return username.toLowerCase() === user.username.toLowerCase();
}

function hideSecret() {
  passwordInput.required = false;
  passwordInput.value = "";
}

function showSecret(exists) {
  if (currentUser) return;
  identityExists = exists === null ? null : Boolean(exists);
  secretField.hidden = false;
  passwordInput.required = true;
  if (identityExists === false) {
    secretLabel.textContent = "Create password";
    passwordInput.autocomplete = "new-password";
  } else {
    secretLabel.textContent = "Password";
    passwordInput.autocomplete = "current-password";
  }
}

function setAuthed(user) {
  currentUser = user;
  usernameInput.value = user.username;
  usernameTitle.textContent = user.username;
  identityForm.classList.add("is-authed");
  secretLabel.textContent = "Save";
  secretLabel.removeAttribute("for");
  saveLockerBtn.setAttribute("aria-hidden", "false");
  saveLockerBtn.tabIndex = 0;
  logoutBtn.setAttribute("aria-hidden", "false");
  logoutBtn.tabIndex = 0;
  usernameInput.tabIndex = -1;
  passwordInput.tabIndex = -1;
  passwordInput.setAttribute("aria-hidden", "true");
  hideSecret();
  clearAuthErrors();
}

function setLoggedOutUi({ keepUsername = false } = {}) {
  currentUser = null;
  identityForm.classList.remove("is-authed");
  usernameTitle.textContent = "";
  saveLockerBtn.textContent = "Save";
  saveLockerBtn.classList.remove("is-saved");
  saveLockerBtn.setAttribute("aria-hidden", "true");
  saveLockerBtn.tabIndex = -1;
  logoutBtn.setAttribute("aria-hidden", "true");
  logoutBtn.tabIndex = -1;
  usernameInput.tabIndex = 0;
  passwordInput.tabIndex = 0;
  passwordInput.removeAttribute("aria-hidden");
  secretLabel.htmlFor = "meta-password";
  if (!keepUsername) usernameInput.value = "";
  showSecret(null);
  clearAuthErrors();
  syncExportButton();
}

async function clearSession({ keepUsername = false } = {}) {
  try {
    await api("/api/logout", { method: "POST", body: "{}" });
  } catch {
    /* still clear the local session */
  }
  lockerPicks.clear();
  lastSavedPicks.clear();
  lockerLabels.clear();
  lastSavedLabels.clear();
  exitLabellingMode();
  setLoggedOutUi({ keepUsername });
  paintLocker();
}

function applyIdentity(user) {
  setAuthed(user);
}

async function loadPicks() {
  lockerPicks.clear();
  lockerLabels.clear();
  const data = await api("/api/picks");
  for (const [key, name] of Object.entries(data.picks || {})) {
    lockerPicks.set(key, name);
  }
  for (const [key, raw] of Object.entries(data.labels || {})) {
    const label = normalizeLabel(raw);
    if (label.color || label.slant || label.bold) lockerLabels.set(key, label);
  }
  rememberSavedPicks();
}

function normalizeLabel(raw) {
  const color = LABEL_COLORS[raw?.color] ? raw.color : "";
  return { color, slant: Boolean(raw?.slant), bold: Boolean(raw?.bold) };
}

function labelFamily(color) {
  return LABEL_FAMILIES[color] || "";
}

function weaponFromPick(pickId) {
  return pickId.includes(":") ? pickId.slice(0, pickId.lastIndexOf(":")) : pickId;
}

function takenColorFamilies(pickId) {
  const weapon = weaponFromPick(pickId);
  const taken = new Set();
  for (const [key, label] of lockerLabels) {
    if (key === pickId) continue;
    if (weaponFromPick(key) !== weapon) continue;
    const family = labelFamily(label.color);
    if (family) taken.add(family);
  }
  return taken;
}

function labelsMatchSaved() {
  if (lockerLabels.size !== lastSavedLabels.size) return false;
  for (const [key, label] of lockerLabels) {
    const saved = lastSavedLabels.get(key);
    if (!saved || saved.color !== label.color || saved.slant !== label.slant || saved.bold !== label.bold) {
      return false;
    }
  }
  return true;
}

function picksMatchSaved() {
  if (lockerPicks.size !== lastSavedPicks.size) return false;
  for (const [key, name] of lockerPicks) {
    if (lastSavedPicks.get(key) !== name) return false;
  }
  return labelsMatchSaved();
}

function rememberSavedPicks() {
  lastSavedPicks.clear();
  lastSavedLabels.clear();
  for (const [key, name] of lockerPicks) lastSavedPicks.set(key, name);
  for (const [key, label] of lockerLabels) lastSavedLabels.set(key, { ...label });
  syncSaveButton();
}

function syncSaveButton() {
  const saved = picksMatchSaved();
  saveLockerBtn.textContent = saved ? "Saved" : "Save";
  saveLockerBtn.classList.toggle("is-saved", saved);
  syncExportButton();
}

function exportReady() {
  return Boolean(currentUser && picksMatchSaved() && lockerCatalog);
}

function syncExportButton() {
  if (!exportBtn) return;
  const ready = exportReady();
  exportBtn.classList.toggle("is-off", !ready);
  exportBtn.setAttribute("aria-disabled", ready ? "false" : "true");
}

function buildExportGroups() {
  if (!lockerCatalog) return [];
  const { weapons, tiers, themes, contracts } = lockerCatalog;
  const tierByUuid = new Map(tiers.map((tier) => [tier.uuid, tier]));
  const themeByUuid = new Map(themes.map((theme) => [theme.uuid, theme]));
  const sequelThemes = buildSequelIndex(weapons, themeByUuid);
  const sourceIndex = buildSkinSourceIndex(contracts);
  return groupedGuns(weapons).map((group) => ({
    label: group.label,
    rows: group.weapons.map((weapon) => {
      const buckets = skinsForWeapon(
        weapon,
        tierByUuid,
        sequelThemes,
        themeByUuid,
        lockerView.sort,
        sourceIndex,
        EXPORT_SOURCES,
      );
      return {
        gun: weapon.displayName,
        cells: BUCKETS.map((bucket) => {
          const key = `${weapon.uuid}:${bucket}`;
          const label = lastSavedLabels.get(key);
          return {
            text: lastSavedPicks.get(key) || "",
            available: buckets[bucket].length > 0,
            color: label?.color || "",
            slant: Boolean(label?.slant),
            bold: Boolean(label?.bold),
          };
        }),
      };
    }),
  }));
}

async function exportLockerDocx() {
  if (!exportReady()) {
    showAppToast("please save current selection to use this function");
    return;
  }
  exportBtn.classList.add("is-off");
  exportBtn.setAttribute("aria-disabled", "true");
  try {
    const response = await fetch(apiUrl("/api/export"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: buildExportGroups() }),
    });
    if (!response.ok) {
      let message = `Export failed (${response.status})`;
      try {
        const data = JSON.parse(await response.text());
        if (data.error) message = data.error;
      } catch {
        /* keep status message */
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentUser.username}-valocker.docx`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    setFieldError(usernameInput, error.message);
  } finally {
    syncExportButton();
  }
}

async function saveLocker() {
  if (!currentUser) return;
  clearAuthErrors();
  saveLockerBtn.disabled = true;
  try {
    await api("/api/picks", {
      method: "POST",
      body: JSON.stringify({
        picks: Object.fromEntries(lockerPicks),
        labels: Object.fromEntries(lockerLabels),
      }),
    });
    rememberSavedPicks();
  } catch (error) {
    setFieldError(passwordInput, error.message);
  } finally {
    saveLockerBtn.disabled = false;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed (${response.status})`);
  }
  return response.json();
}

async function loadCatalog() {
  try {
    const [weaponsRes, tiersRes, themesRes, contractsRes] = await Promise.all([
      fetchJson(`${API_BASE}/weapons`),
      fetchJson(`${API_BASE}/contenttiers`),
      fetchJson(`${API_BASE}/themes`),
      fetchJson(`${API_BASE}/contracts`).catch(() => ({ data: [] })),
    ]);
    return {
      weapons: weaponsRes.data,
      tiers: tiersRes.data,
      themes: themesRes.data,
      contracts: contractsRes.data || [],
      source: `${API_BASE}/weapons, contenttiers, themes, and contracts`,
    };
  } catch (liveError) {
    const [weaponsRes, tiersRes, themesRes] = await Promise.all([
      fetchJson("./data/weapons.json"),
      fetchJson("./data/contenttiers.json"),
      fetchJson("./data/themes.json"),
    ]);
    return {
      weapons: weaponsRes.data,
      tiers: tiersRes.data,
      themes: themesRes.data,
      contracts: [],
      source: `local cache after live API error: ${liveError.message}`,
    };
  }
}

function themeFolder(assetPath) {
  const parts = (assetPath || "").replaceAll("\\", "/").split("/");
  return parts.length >= 2 ? parts[parts.length - 2] : "";
}

function parseFolderWave(folder) {
  const match = folder.match(/^(.*?)(\d+)$/);
  if (match && match[1]) {
    return { base: match[1].toLowerCase(), wave: Number(match[2]) };
  }
  return { base: folder.toLowerCase(), wave: 1 };
}

function buildSequelIndex(weapons, themeByUuid) {
  const foldersByThemeName = new Map();

  for (const weapon of weapons) {
    if (weapon.category === MELEE_CATEGORY) continue;
    for (const skin of weapon.skins || []) {
      const themeName = themeByUuid.get(skin.themeUuid)?.displayName;
      const folder = themeFolder(skin.assetPath);
      if (!themeName || !folder) continue;
      if (!foldersByThemeName.has(themeName)) {
        foldersByThemeName.set(themeName, new Set());
      }
      foldersByThemeName.get(themeName).add(folder);
    }
  }

  const sequelThemes = new Map();
  for (const [themeName, folders] of foldersByThemeName) {
    const wavesByBase = new Map();
    for (const folder of folders) {
      const { base, wave } = parseFolderWave(folder);
      if (wave > MAX_SEQUEL_WAVE) continue;
      if (!wavesByBase.has(base)) wavesByBase.set(base, new Set());
      wavesByBase.get(base).add(wave);
    }

    const sequelBases = {};
    for (const [base, waves] of wavesByBase) {
      if (waves.size >= 2 && Math.max(...waves) >= 2) {
        sequelBases[base] = true;
      }
    }
    if (Object.keys(sequelBases).length) {
      sequelThemes.set(themeName, sequelBases);
    }
  }

  return sequelThemes;
}

function collectionName(skinName, weaponName) {
  const trimmed = (skinName || "").trim();
  const suffix = ` ${weaponName}`;
  if (trimmed.endsWith(suffix)) {
    return trimmed.slice(0, -suffix.length).trim();
  }
  return trimmed;
}

function sequelLabel(skin, sequelThemes, themeByUuid) {
  const folder = themeFolder(skin.assetPath);
  const { base, wave } = parseFolderWave(folder);
  if (wave < 2 || wave > MAX_SEQUEL_WAVE) return null;
  const themeName = themeByUuid.get(skin.themeUuid)?.displayName;
  const sequelBases = sequelThemes.get(themeName);
  if (!sequelBases || !sequelBases[base]) return null;
  return `${wave}.0`;
}

function displayNameForSkin(skin, weaponName, sequelThemes, themeByUuid) {
  const name = collectionName(skin.displayName, weaponName);
  const wave = sequelLabel(skin, sequelThemes, themeByUuid);
  if (wave && !ALREADY_VERSIONED.test(name)) {
    return `${name} (${wave})`;
  }
  return name;
}

function hasFinisher(skin) {
  return (skin.levels || []).some((level) => level.levelItem === FINISHER_LEVEL);
}

function bucketForSkin(skin, tierByUuid) {
  const tier = tierByUuid.get(skin.contentTierUuid);
  if (!tier) return null;
  const tierName = tier.displayName;
  if (tierName === "Ultra Edition" || tierName === "Exclusive Edition") {
    return "ultraExclusive";
  }
  if (tierName === "Premium Edition") {
    return hasFinisher(skin) ? "premiumFinisher" : "premiumNoFinisher";
  }
  if (tierName === "Select Edition" || tierName === "Deluxe Edition") {
    return "selectDeluxe";
  }
  return null;
}

function compareNames(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function uniqueInOrder(items) {
  const seen = new Set();
  const ordered = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    ordered.push(item);
  }
  return ordered;
}

function uniqueSkins(items) {
  const seen = new Set();
  const ordered = [];
  for (const item of items) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    ordered.push(item);
  }
  return ordered;
}

function buildSkinSourceIndex(contracts) {
  const index = new Map();
  const kindByRel = { Season: "battlepass", Event: "limited", Agent: "agent" };
  for (const item of contracts || []) {
    const kind = kindByRel[(item.content || {}).relationType];
    if (!kind) continue;
    for (const chapter of item.content?.chapters || []) {
      for (const level of chapter.levels || []) {
        const reward = level.reward || {};
        if (reward.type === "EquippableSkinLevel" && reward.uuid) index.set(reward.uuid, kind);
      }
      for (const reward of chapter.freeRewards || []) {
        const type = reward.type || reward.reward?.type;
        const uuid = reward.uuid || reward.reward?.uuid;
        if (type === "EquippableSkinLevel" && uuid) index.set(uuid, kind);
      }
    }
  }
  return index;
}

function skinSource(skin, theme, sourceIndex) {
  for (const level of skin.levels || []) {
    const kind = sourceIndex.get(level.uuid);
    if (kind) return kind;
  }
  const themeName = theme?.displayName || "";
  const name = skin.displayName || "";
  if (LIMITED_MARK.test(themeName) || LIMITED_MARK.test(name)) return "limited";
  return "collection";
}

function skinsForWeapon(weapon, tierByUuid, sequelThemes, themeByUuid, sortMode = "appearance", sourceIndex = new Map(), filters = lockerView.filters) {
  const buckets = {
    ultraExclusive: [],
    premiumFinisher: [],
    premiumNoFinisher: [],
    selectDeluxe: [],
  };

  for (const skin of weapon.skins || []) {
    if (!skin.contentTierUuid) continue;
    if (skin.displayName === "Random Favorite Skin") continue;
    const bucket = bucketForSkin(skin, tierByUuid);
    if (!bucket) continue;
    const label = displayNameForSkin(skin, weapon.displayName, sequelThemes, themeByUuid);
    if (!label) continue;
    const source = skinSource(skin, themeByUuid.get(skin.themeUuid), sourceIndex);
    buckets[bucket].push({ name: label, themeUuid: skin.themeUuid || "", source });
  }

  for (const key of Object.keys(buckets)) {
    const unique = uniqueSkins(buckets[key]).filter((item) => filters.has(item.source));
    buckets[key] = sortMode === "alpha" ? unique.sort((a, b) => compareNames(a.name, b.name)) : unique;
  }
  return buckets;
}

function categoryLabel(weapon) {
  return (
    CATEGORY_LABEL[weapon.category] ||
    weapon.shopData?.categoryText ||
    weapon.shopData?.category ||
    weapon.category.replace("EEquippableCategory::", "")
  );
}

function groupedGuns(weapons) {
  const guns = weapons.filter((weapon) => weapon.category !== MELEE_CATEGORY);
  const groups = new Map();

  for (const weapon of guns) {
    const key = weapon.category;
    if (!groups.has(key)) {
      groups.set(key, {
        label: categoryLabel(weapon),
        rank: CATEGORY_RANK[weapon.category] ?? 99,
        weapons: [],
      });
    }
    groups.get(key).weapons.push(weapon);
  }

  for (const group of groups.values()) {
    group.weapons.sort((a, b) => {
      const aIndex = WEAPON_ORDER.indexOf(a.displayName);
      const bIndex = WEAPON_ORDER.indexOf(b.displayName);
      const aKey = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const bKey = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      if (aKey !== bKey) return aKey - bKey;
      return compareNames(a.displayName, b.displayName);
    });
  }

  return [...groups.values()].sort((a, b) => a.rank - b.rank || compareNames(a.label, b.label));
}

const croppedIcons = new Map();

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

async function preloadWeaponIcons(weapons) {
  const jobs = weapons
    .filter((weapon) => weapon.category !== MELEE_CATEGORY)
    .map(async (weapon) => {
      const src = weaponIcon(weapon);
      if (!src) return;
      try {
        croppedIcons.set(weapon.uuid, await cropTransparentPng(src));
      } catch {
        croppedIcons.set(weapon.uuid, src);
      }
    });
  await Promise.all(jobs);
}

function syncSelectedState(wrap) {
  wrap.classList.toggle("is-selected", Boolean(wrap.dataset.value) && !wrap.classList.contains("is-disabled"));
}

function createGunCell(weapon) {
  const gunCell = document.createElement("td");
  gunCell.className = "gun";

  const swap = document.createElement("div");
  swap.className = "gun-swap";

  const name = document.createElement("span");
  name.className = "gun-name";
  name.textContent = weapon.displayName;

  const iconSrc = croppedIcons.get(weapon.uuid) || weaponIcon(weapon);
  if (iconSrc) {
    const icon = document.createElement("img");
    icon.className = "gun-icon";
    icon.alt = "";
    icon.decoding = "async";
    icon.src = iconSrc;
    icon.addEventListener("error", () => {
      const fallback = weapon.killStreamIcon || weapon.displayIcon;
      if (fallback && icon.getAttribute("src") !== fallback) {
        icon.src = fallback;
        return;
      }
      icon.remove();
    });
    swap.append(name, icon);
  } else {
    swap.append(name);
  }

  gunCell.append(swap);
  return gunCell;
}

let openSkinSelect = null;
let skinBackdrop = null;
let planePops = [];

function getSkinBackdrop() {
  if (!skinBackdrop) {
    skinBackdrop = document.createElement("div");
    skinBackdrop.className = "skin-backdrop";
    skinBackdrop.addEventListener("click", () => closeSkinMenu());
    document.body.append(skinBackdrop);
  }
  return skinBackdrop;
}

function showBackdrop() {
  const el = getSkinBackdrop();
  requestAnimationFrame(() => {
    el.classList.add("is-on");
  });
}

function hideBackdrop() {
  if (!skinBackdrop) return;
  skinBackdrop.classList.remove("is-on");
}

function clearSkinMenus() {
  closeSkinMenu();
  document.querySelectorAll("body > .skin-menu-shell, body > .skin-plane-pop").forEach((el) => el.remove());
  planePops = [];
}

function clearPlanePops() {
  planePops.forEach((el) => el.remove());
  planePops = [];
}

function closeSkinMenu({ keepBackdrop = false } = {}) {
  if (!openSkinSelect) return;
  openSkinSelect.wrap.classList.remove("is-open");
  openSkinSelect.shell.hidden = true;
  openSkinSelect.button.setAttribute("aria-expanded", "false");
  if (!keepBackdrop) hideBackdrop();
  clearPlanePops();
  openSkinSelect = null;
}

function planeBackground(el) {
  if (el.matches("th")) {
    return getComputedStyle(el).backgroundColor || getComputedStyle(document.documentElement).getPropertyValue("--table-header").trim();
  }
  const row = el.parentElement;
  if (row) {
    const painted = getComputedStyle(row).backgroundColor;
    if (painted && painted !== "rgba(0, 0, 0, 0)" && painted !== "transparent") return painted;
  }
  const theme = getComputedStyle(document.documentElement);
  const index = row ? [...row.parentElement.children].indexOf(row) : 0;
  return index % 2 === 1
    ? theme.getPropertyValue("--table-stripe").trim()
    : theme.getPropertyValue("--table-bg").trim();
}

function popPlaneCell(source) {
  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true);
  clone.classList.add("skin-plane-pop");
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.style.top = `${rect.top}px`;
  clone.style.left = `${rect.left}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.backgroundColor = planeBackground(source);
  document.body.append(clone);
  planePops.push(clone);
}

function showPlanePops(wrap) {
  clearPlanePops();
  const td = wrap.closest("td");
  const row = td?.parentElement;
  if (!td || !row) return;
  const gunCell = row.querySelector("td.gun");
  const selectCells = [...row.querySelectorAll("td")].filter((cell) => cell.querySelector(".skin-select"));
  const colIndex = selectCells.indexOf(td);
  const header = headerRow.querySelectorAll("th.rarity-col")[colIndex];
  if (gunCell) popPlaneCell(gunCell);
  if (header) popPlaneCell(header);
}

function updateMenuOverflow(shell, menu) {
  const moreBelow = menu.scrollHeight - menu.clientHeight - menu.scrollTop > 1;
  shell.classList.toggle("has-more", moreBelow);
}

function positionSkinMenu(wrap, shell, menu) {
  const rect = wrap.getBoundingClientRect();
  const optionHeight = parseFloat(getComputedStyle(menu).fontSize) * 2;
  const maxHeight = optionHeight * DROPDOWN_VISIBLE;
  menu.style.maxHeight = "none";
  const contentHeight = menu.scrollHeight;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < Math.min(maxHeight, contentHeight) && rect.top > spaceBelow;

  shell.style.left = `${rect.left}px`;
  shell.style.width = `${rect.width}px`;
  shell.style.maxHeight = `${maxHeight}px`;
  menu.style.maxHeight = `${maxHeight}px`;
  if (openUp) {
    shell.style.top = "auto";
    shell.style.bottom = `${window.innerHeight - rect.top}px`;
  } else {
    shell.style.bottom = "auto";
    shell.style.top = `${rect.bottom}px`;
  }
  updateMenuOverflow(shell, menu);
}

function collectionFamily(name) {
  return (name || "").replace(/\s*\(\d+\.0\)\s*$/i, "").trim().toLowerCase();
}

function claimedCollectionsByWeapon() {
  const claimed = new Map();
  for (const wrap of document.querySelectorAll(".skin-select")) {
    const collection = wrap.dataset.collection;
    const weapon = wrap.dataset.weapon;
    if (!collection || !weapon || !wrap.dataset.value) continue;
    if (!claimed.has(collection)) claimed.set(collection, new Set());
    claimed.get(collection).add(weapon);
  }
  return claimed;
}

function syncCollectionLocks() {
  const claimed = claimedCollectionsByWeapon();
  for (const wrap of document.querySelectorAll(".skin-select")) {
    const menu = wrap.skinMenu;
    if (!menu) continue;
    const weapon = wrap.dataset.weapon;
    const remove = menu.querySelector(".skin-option-remove");
    const enabled = [];
    const locked = [];
    for (const option of menu.querySelectorAll(".skin-option")) {
      if (option.classList.contains("skin-option-remove")) continue;
      const collection = option.dataset.collection;
      const holders = collection ? claimed.get(collection) : null;
      const isLocked = Boolean(holders && [...holders].some((owner) => owner !== weapon));
      option.disabled = isLocked;
      option.classList.toggle("skin-option-locked", isLocked);
      option.classList.remove("skin-option-lock-start");
      option.setAttribute("aria-disabled", isLocked ? "true" : "false");
      (isLocked ? locked : enabled).push(option);
    }
    if (remove) menu.append(remove);
    for (const option of enabled) menu.append(option);
    locked[0]?.classList.add("skin-option-lock-start");
    for (const option of locked) menu.append(option);
  }
}

function rarityCaption(bucket) {
  const column = RARITY_COLUMNS[BUCKETS.indexOf(bucket)];
  return column ? `${column.label} ${column.finisher}` : bucket;
}

function applySkinLabel(wrap) {
  const pickId = wrap.dataset.pick;
  const label = pickId ? lockerLabels.get(pickId) : null;
  const color = label && wrap.dataset.value ? label.color : "";
  const pastel = LABEL_COLORS[color] || "";
  wrap.classList.toggle("is-labeled", Boolean(pastel));
  wrap.classList.toggle("is-slanted", Boolean(label?.slant && wrap.dataset.value));
  wrap.classList.toggle("is-bought", Boolean(label?.bold && wrap.dataset.value));
  if (pastel) wrap.style.setProperty("--color", pastel);
  else wrap.style.removeProperty("--color");
}

function applyAllSkinLabels() {
  for (const wrap of document.querySelectorAll(".skin-select")) applySkinLabel(wrap);
}

function hideLabelToast() {
  window.clearTimeout(labelToastTimer);
  labelToast.classList.remove("is-on");
}

function showAppToast(message) {
  hideLabelToast();
  labelToast.textContent = message;
  labelToast.hidden = false;
  requestAnimationFrame(() => labelToast.classList.add("is-on"));
  labelToastTimer = window.setTimeout(hideLabelToast, 2600);
}

function showLabelToast() {
  showAppToast("Click a selected skin to label it.");
}

function closeLabelWindows() {
  if (!labelOverlay) return;
  const wasOpen = labelOverlay.classList.contains("is-on") || !labelOverlay.hidden;
  labelOverlay.classList.remove("is-on");
  window.clearTimeout(labelOverlayTimer);
  if (wasOpen && !labelOverlay.hidden) {
    labelOverlayTimer = window.setTimeout(() => {
      if (!labelOverlay.classList.contains("is-on")) labelOverlay.hidden = true;
    }, 400);
  } else {
    labelOverlay.hidden = true;
  }
  labelDraft = { pickId: "", color: "", slant: false, bold: false };
}

function setLabelling(on) {
  labelling = on;
  document.body.classList.toggle("is-labelling", on);
  labelBtn.setAttribute("aria-checked", on ? "true" : "false");
  sortEl.disabled = on;
  if (filterBtn) filterBtn.disabled = on;
  if (on) closeFilterMenu();
}

function exitLabellingMode() {
  setLabelling(false);
  hideLabelToast();
  closeLabelWindows();
}

function enterLabellingMode() {
  setLabelling(true);
  closeSkinMenu();
  closeLabelWindows();
  showLabelToast();
}

function paintLabelPreview() {
  const pastel = LABEL_COLORS[labelDraft.color] || "";
  labelSkinEl.style.background = pastel || "";
  labelSkinEl.style.color = pastel ? "#222" : "";
  labelSkinEl.style.fontStyle = labelDraft.slant ? "italic" : "normal";
  labelSkinEl.style.fontWeight = labelDraft.bold ? "700" : "400";
}

function paintLabelEditor() {
  const taken = labelDraft.pickId ? takenColorFamilies(labelDraft.pickId) : new Set();
  for (const button of labelEditor.querySelectorAll(".label-choice")) {
    const color = button.dataset.color;
    const slant = button.dataset.toggle === "slant";
    const bold = button.dataset.toggle === "bold";
    let on = false;
    if (color) on = labelDraft.color === color;
    else if (slant) on = Boolean(labelDraft.slant);
    else if (bold) on = Boolean(labelDraft.bold);
    button.classList.toggle("is-on", on);
    if (slant || bold) button.setAttribute("aria-checked", on ? "true" : "false");
    if (color) {
      const locked = Boolean(labelFamily(color) && taken.has(labelFamily(color)));
      button.disabled = locked;
      button.classList.toggle("is-locked", locked);
    } else {
      button.disabled = false;
      button.classList.remove("is-locked");
    }
  }
  paintLabelPreview();
}

function openLabelEditor(wrap) {
  const pickId = wrap.dataset.pick;
  if (!pickId || !wrap.dataset.value) return;
  const current = lockerLabels.get(pickId) || { color: "", slant: false, bold: false };
  labelDraft = { pickId, color: current.color, slant: current.slant, bold: current.bold };
  labelGunEl.textContent = wrap.dataset.weaponName || "";
  labelRarityEl.textContent = rarityCaption(wrap.dataset.bucket);
  labelSkinEl.textContent = wrap.dataset.value;
  window.clearTimeout(labelOverlayTimer);
  labelOverlay.hidden = false;
  paintLabelEditor();
  void labelOverlay.offsetWidth;
  labelOverlay.classList.add("is-on");
}

function createSelect(options, pickId = "", weaponOrId = "") {
  const weaponUuid = typeof weaponOrId === "object" && weaponOrId ? weaponOrId.uuid : weaponOrId;
  const weaponName = typeof weaponOrId === "object" && weaponOrId ? weaponOrId.displayName : "";
  const wrap = document.createElement("div");
  wrap.className = "skin-select";
  wrap.dataset.value = "";
  wrap.dataset.pick = pickId;
  wrap.dataset.weaponName = weaponName;
  wrap.dataset.bucket = pickId.includes(":") ? pickId.slice(pickId.lastIndexOf(":") + 1) : "";
  wrap.dataset.weapon = weaponUuid || (pickId.includes(":") ? pickId.slice(0, pickId.lastIndexOf(":")) : "");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "skin-trigger";
  const saved = pickId ? lockerPicks.get(pickId) || "" : "";
  const list = [...options];
  if (saved && !list.some((item) => item.name === saved)) {
    list.push({ name: saved, themeUuid: "" });
  }

  if (!list.length) {
    button.textContent = "No skins";
    button.disabled = true;
    wrap.classList.add("is-disabled");
    wrap.append(button);
    decorateSkinSelect(wrap);
    return wrap;
  }

  button.textContent = "Choose skin";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const shell = document.createElement("div");
  shell.className = "skin-menu-shell";
  shell.hidden = true;

  const menu = document.createElement("div");
  menu.className = "skin-menu";
  menu.setAttribute("role", "listbox");

  const fade = document.createElement("div");
  fade.className = "skin-menu-fade";
  fade.setAttribute("aria-hidden", "true");

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "skin-option skin-option-remove";
  remove.dataset.value = "";
  remove.textContent = "Remove skin";
  remove.setAttribute("role", "option");
  remove.hidden = true;
  menu.append(remove);

  function setValue(value, label, persist = true) {
    const previous = wrap.dataset.value;
    wrap.dataset.value = value;
    const match = [...menu.querySelectorAll(".skin-option")].find((option) => option.dataset.value === value);
    wrap.dataset.theme = value ? match?.dataset.theme || "" : "";
    wrap.dataset.collection = value ? match?.dataset.collection || collectionFamily(value) : "";
    button.textContent = value ? label : "Choose skin";
    syncSelectedState(wrap);
    remove.hidden = !value;
    for (const option of menu.querySelectorAll(".skin-option")) {
      const isActive = Boolean(value) && option.dataset.value === value;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-selected", isActive ? "true" : "false");
    }
    if (pickId) {
      if (value) lockerPicks.set(pickId, value);
      else lockerPicks.delete(pickId);
      if (persist && previous !== value) lockerLabels.delete(pickId);
      applySkinLabel(wrap);
      syncSaveButton();
    }
    if (persist) syncCollectionLocks();
  }

  for (const item of list) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "skin-option";
    option.dataset.value = item.name;
    option.dataset.theme = item.themeUuid || "";
    option.dataset.collection = collectionFamily(item.name);
    option.textContent = item.name;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    menu.append(option);
  }

  shell.append(menu, fade);
  menu.addEventListener("scroll", () => updateMenuOverflow(shell, menu));

  wrap.skinMenu = menu;

  menu.addEventListener("click", (event) => {
    const option = event.target.closest(".skin-option");
    if (!option || option.disabled || option.classList.contains("skin-option-locked")) return;
    event.stopPropagation();
    setValue(option.dataset.value, option.textContent);
    closeSkinMenu();
    button.focus();
  });

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (labelling) {
      closeSkinMenu();
      if (wrap.dataset.value) openLabelEditor(wrap);
      return;
    }
    if (openSkinSelect?.wrap === wrap) {
      closeSkinMenu();
      return;
    }
    closeSkinMenu({ keepBackdrop: true });
    syncCollectionLocks();
    wrap.classList.add("is-open");
    shell.hidden = false;
    document.body.append(shell);
    showBackdrop();
    showPlanePops(wrap);
    positionSkinMenu(wrap, shell, menu);
    openSkinSelect = { wrap, menu, button, shell };
    button.setAttribute("aria-expanded", "true");
    const active = menu.querySelector(".skin-option.is-active");
    active?.scrollIntoView({ block: "nearest" });
    updateMenuOverflow(shell, menu);
  });

  wrap.append(button);
  decorateSkinSelect(wrap);
  if (saved) setValue(saved, saved, false);
  return wrap;
}

function decorateSkinSelect(wrap) {
  const arrow = document.createElement("span");
  arrow.className = "skin-arrow";
  arrow.setAttribute("aria-hidden", "true");
  const mark = document.createElement("span");
  mark.className = "skin-mode-x";
  mark.setAttribute("aria-hidden", "true");
  wrap.append(arrow, mark);
}

function createRarityHeader(column, tiersByName) {
  const th = document.createElement("th");
  th.className = "rarity-col";

  const head = document.createElement("div");
  head.className = "rarity-head";

  const line1 = document.createElement("div");
  line1.className = "rarity-line1";

  const title = document.createElement("span");
  title.className = "rarity-title";
  title.textContent = column.label;

  const badges = document.createElement("span");
  badges.className = "rarity-badges";
  for (const name of column.tierNames) {
    const tier = tiersByName.get(name);
    if (!tier?.displayIcon) continue;
    const img = document.createElement("img");
    img.src = tier.displayIcon;
    img.alt = name;
    img.title = name;
    badges.append(img);
  }

  line1.append(title, badges);

  const finisher = document.createElement("div");
  finisher.className = "rarity-finisher";
  finisher.textContent = column.finisher;

  head.append(line1, finisher);
  th.append(head);
  return th;
}

function renderRarityHeaders(tiers) {
  headerRow.querySelectorAll("th.rarity-col").forEach((th) => th.remove());
  const tiersByName = new Map(tiers.map((tier) => [tier.displayName, tier]));
  for (const column of RARITY_COLUMNS) {
    headerRow.append(createRarityHeader(column, tiersByName));
  }
}

function renderLocker(weapons, tiers, themes, source, contracts = []) {
  lockerCatalog = { weapons, tiers, themes, source, contracts };
  paintLocker();
}

function paintLocker() {
  if (!lockerCatalog) return;
  const { weapons, tiers, themes, contracts } = lockerCatalog;
  const tierByUuid = new Map(tiers.map((tier) => [tier.uuid, tier]));
  const themeByUuid = new Map(themes.map((theme) => [theme.uuid, theme]));
  const sequelThemes = buildSequelIndex(weapons, themeByUuid);
  const sourceIndex = buildSkinSourceIndex(contracts);
  const groups = groupedGuns(weapons);

  clearSkinMenus();
  renderRarityHeaders(tiers);
  tableBody.replaceChildren();

  for (const group of groups) {
    group.weapons.forEach((weapon, index) => {
      const buckets = skinsForWeapon(weapon, tierByUuid, sequelThemes, themeByUuid, lockerView.sort, sourceIndex);
      const row = document.createElement("tr");

      if (index === 0) {
        const categoryCell = document.createElement("td");
        categoryCell.className = "rarity";
        categoryCell.rowSpan = group.weapons.length;
        categoryCell.textContent = group.label;
        row.append(categoryCell);
      }

      const gunCell = createGunCell(weapon);
      row.append(gunCell);

      for (const bucket of BUCKETS) {
        const cell = document.createElement("td");
        cell.append(createSelect(buckets[bucket], `${weapon.uuid}:${bucket}`, weapon));
        row.append(cell);
      }

      tableBody.append(row);
    });
  }

  syncCollectionLocks();
  applyAllSkinLabels();
}

function closeFilterMenu() {
  if (!filterMenu || !filterBtn) return;
  filterMenu.hidden = true;
  filterBtn.setAttribute("aria-expanded", "false");
}

function paintFilterButton() {
  if (!filterBtn) return;
  const selected = [...filterMenu.querySelectorAll("input[type=checkbox]")]
    .filter((input) => input.checked)
    .map((input) => FILTER_LABELS[input.value] || input.value);
  const total = filterMenu.querySelectorAll("input[type=checkbox]").length;
  filterBtn.textContent = selected.length === 0 ? "None" : selected.length === total ? "All" : selected.join(", ");
}

function syncFiltersFromMenu() {
  lockerView.filters = new Set(
    [...filterMenu.querySelectorAll("input[type=checkbox]")].filter((input) => input.checked).map((input) => input.value)
  );
  paintFilterButton();
  paintLocker();
}

sortEl.addEventListener("change", () => {
  lockerView.sort = sortEl.value;
  paintLocker();
});
filterBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (filterBtn.disabled) return;
  const open = filterMenu.hidden;
  if (open) {
    closeSkinMenu();
    filterMenu.hidden = false;
    filterBtn.setAttribute("aria-expanded", "true");
  } else {
    closeFilterMenu();
  }
});
filterMenu?.addEventListener("click", (event) => event.stopPropagation());
filterMenu?.addEventListener("change", syncFiltersFromMenu);
paintFilterButton();

async function loadLockerTable() {
  if (lockerCatalog) {
    paintLocker();
    return;
  }
  const { weapons, tiers, themes, source, contracts } = await loadCatalog();
  await preloadWeaponIcons(weapons);
  renderLocker(weapons, tiers, themes, source, contracts);
}

async function restoreLocker(user) {
  applyIdentity(user);
  await loadPicks();
  await loadLockerTable();
}

async function lookupIdentity() {
  const seq = ++identitySeq;
  const username = currentUsername();
  clearFieldError(usernameInput);

  if (sameUser(username)) return;

  if (currentUser) {
    await clearSession({ keepUsername: true });
    if (seq !== identitySeq) return;
  }

  if (!username) {
    showSecret(null);
    return;
  }

  try {
    const query = new URLSearchParams({ username });
    const data = await api(`/api/identity?${query}`);
    if (seq !== identitySeq) return;
    const latest = currentUsername();
    if (!latest || sameUser(latest)) return;
    showSecret(Boolean(data.exists));
  } catch (error) {
    if (seq !== identitySeq) return;
    setFieldError(usernameInput, error.message);
  }
}

function scheduleIdentityLookup() {
  window.clearTimeout(identityTimer);
  identityTimer = window.setTimeout(() => {
    lookupIdentity();
  }, 280);
}

async function submitIdentity(event) {
  event.preventDefault();
  if (currentUser) {
    await saveLocker();
    return;
  }
  const username = currentUsername();
  const password = passwordInput.value;
  clearAuthErrors();

  if (!username) {
    setFieldError(usernameInput, "Username is required");
    return;
  }
  if (!password) {
    setFieldError(passwordInput, "Password is required");
    return;
  }

  try {
    let exists = identityExists;
    if (exists === null) {
      const data = await api(`/api/identity?${new URLSearchParams({ username })}`);
      exists = Boolean(data.exists);
      showSecret(exists);
    }
    const data = await api(exists ? "/api/login" : "/api/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    passwordInput.value = "";
    await restoreLocker(data.user);
  } catch (error) {
    const onUsername = /username/i.test(error.message) && !/password/i.test(error.message);
    setFieldError(onUsername ? usernameInput : passwordInput, error.message);
  }
}

identityForm.addEventListener("submit", submitIdentity);
identityForm.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  if (event.target !== usernameInput && event.target !== passwordInput) return;
  event.preventDefault();
  identityForm.requestSubmit();
});
saveLockerBtn.addEventListener("click", (event) => {
  event.preventDefault();
  saveLocker();
});
exportBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  exportLockerDocx();
});
logoutBtn.addEventListener("click", (event) => {
  event.preventDefault();
  clearSession();
});
usernameInput.addEventListener("input", scheduleIdentityLookup);
passwordInput.addEventListener("input", () => clearFieldError(passwordInput));
identityForm.addEventListener("click", (event) => {
  const button = event.target.closest(".meta-warn");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  toggleWarnTip(button.closest(".meta-input-wrap"));
});

document.querySelector(".theme-switch")?.addEventListener("click", (event) => {
  const swatch = event.target.closest(".theme-swatch");
  if (swatch) applyTheme(swatch.dataset.theme);
});

function applyTheme(theme) {
  if (theme !== "dark" && theme !== "light") theme = "green";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("valocker-theme", theme);
  } catch {
    /* ignore */
  }
  for (const swatch of document.querySelectorAll(".theme-swatch")) {
    const on = swatch.dataset.theme === theme;
    swatch.classList.toggle("is-on", on);
    swatch.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

try {
  applyTheme(localStorage.getItem("valocker-theme") || "green");
} catch {
  applyTheme("green");
}

async function init() {
  try {
    const session = await api("/api/session");
    if (session.user) {
      await restoreLocker(session.user);
      return;
    }
  } catch (error) {
    setFieldError(usernameInput, error.message);
  }

  try {
    await loadLockerTable();
  } catch (error) {
    setFieldError(usernameInput, error.message);
  }
}

labelBtn.addEventListener("click", (event) => {
  event.preventDefault();
  if (labelling) exitLabellingMode();
  else enterLabellingMode();
});
labelUpdateBtn.addEventListener("click", (event) => {
  event.preventDefault();
  if (!labelDraft.pickId) return;
  const pickId = labelDraft.pickId;
  const next = normalizeLabel(labelDraft);
  if (next.color && takenColorFamilies(pickId).has(labelFamily(next.color))) next.color = "";
  closeLabelWindows();
  if (next.color || next.slant || next.bold) lockerLabels.set(pickId, next);
  else lockerLabels.delete(pickId);
  requestAnimationFrame(() => {
    applyAllSkinLabels();
    syncSaveButton();
  });
});
labelEditor.addEventListener("click", (event) => {
  const button = event.target.closest(".label-choice");
  if (!button || button.disabled || button.classList.contains("is-locked")) return;
  if (button.dataset.color) {
    labelDraft.color = labelDraft.color === button.dataset.color ? "" : button.dataset.color;
  } else if (button.dataset.toggle === "slant") {
    labelDraft.slant = !labelDraft.slant;
  } else if (button.dataset.toggle === "bold") {
    labelDraft.bold = !labelDraft.bold;
  }
  paintLabelEditor();
});
labelOverlay.addEventListener("click", (event) => {
  if (event.target === labelOverlay) closeLabelWindows();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".meta-input-wrap")) closeWarnTips();
  if (!event.target.closest(".filter-wrap")) closeFilterMenu();
  if (!openSkinSelect) return;
  if (openSkinSelect.wrap.contains(event.target) || openSkinSelect.shell.contains(event.target)) return;
  closeSkinMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWarnTips();
    closeSkinMenu();
    closeFilterMenu();
    if (!labelOverlay.hidden) closeLabelWindows();
    else if (labelling) exitLabellingMode();
  }
});

window.addEventListener(
  "scroll",
  (event) => {
    if (!openSkinSelect) return;
    if (event.target === openSkinSelect.menu || openSkinSelect.menu.contains(event.target)) return;
    closeSkinMenu();
  },
  true
);

window.addEventListener("resize", closeSkinMenu);

init();
