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
const TIER_VP = {
  "Select Edition": 875,
  "Deluxe Edition": 1275,
  "Premium Edition": 1775,
  "Exclusive Edition": 2175,
  "Ultra Edition": 2475,
};
const MY_VP_PACK = { vp: 3650, myr: 118.9 };
const US_VP_PACK = { vp: 3650, usd: 34.99 };
const REGION_CURRENCY = {
  AD: "EUR", AE: "USD", AL: "EUR", AM: "USD", AR: "USD", AT: "EUR", AU: "AUD", AZ: "USD",
  BA: "EUR", BE: "EUR", BG: "EUR", BH: "USD", BO: "USD", BR: "BRL", BY: "USD",
  CA: "CAD", CH: "CHF", CL: "USD", CN: "CNY", CO: "USD", CR: "USD", CY: "EUR", CZ: "CZK",
  DE: "EUR", DK: "DKK", DO: "USD", DZ: "USD",
  EC: "USD", EE: "EUR", EG: "USD", ES: "EUR",
  FI: "EUR", FR: "EUR",
  GB: "GBP", GE: "USD", GR: "EUR", GT: "USD",
  HK: "HKD", HN: "USD", HR: "EUR", HU: "HUF",
  ID: "IDR", IE: "EUR", IL: "ILS", IN: "INR", IQ: "USD", IS: "ISK", IT: "EUR",
  JP: "JPY",
  KR: "KRW", KW: "USD", KZ: "USD",
  LB: "USD", LK: "USD", LT: "EUR", LU: "EUR", LV: "EUR",
  MA: "USD", MC: "EUR", MD: "EUR", ME: "EUR", MK: "EUR", MT: "EUR", MX: "MXN", MY: "MYR",
  NG: "USD", NL: "EUR", NO: "NOK", NZ: "NZD",
  OM: "USD",
  PA: "USD", PE: "USD", PH: "PHP", PK: "USD", PL: "PLN", PR: "USD", PT: "EUR", PY: "USD",
  QA: "USD",
  RO: "RON", RS: "EUR", RU: "USD",
  SA: "USD", SE: "SEK", SG: "SGD", SI: "EUR", SK: "EUR", SM: "EUR", SV: "USD",
  TH: "THB", TR: "TRY", TW: "USD",
  UA: "USD", US: "USD", UY: "USD", UZ: "USD",
  VA: "EUR", VE: "USD", VN: "USD",
  ZA: "ZAR",
};
let fxFromUsd = { USD: 1, MYR: 4.0915 };

const tableBody = document.getElementById("locker-body");
const headerRow = document.getElementById("locker-head");
const tableMeta = document.querySelector(".table-meta");
const lockerHeadStick = document.querySelector(".locker-head-stick");
const lockerHeadTable = document.querySelector(".locker-head-table");
const sortEl = document.getElementById("locker-sort");
const searchInput = document.getElementById("locker-search");
const searchClear = document.getElementById("search-clear");
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
const forgotBtn = document.getElementById("forgot-password");
const logoutBtn = document.getElementById("logout-btn");
const exportBtn = document.getElementById("export-docx");
const showcaseOverlay = document.getElementById("showcase-overlay");
const showcaseKicker = document.getElementById("showcase-kicker");
const showcaseTitle = document.getElementById("showcase-title");
const showcaseVariant = document.getElementById("showcase-variant");
const showcaseClose = document.getElementById("showcase-close");
const showcaseInspect = document.getElementById("showcase-inspect");
const showcaseImage = document.getElementById("showcase-image");
const showcaseVideo = document.getElementById("showcase-video");
const showcaseChromas = document.getElementById("showcase-chromas");
const showcasePlay = document.getElementById("showcase-play");
const showcaseKill = document.getElementById("showcase-kill");
const showcaseKillCount = document.getElementById("showcase-kill-count");
const showcaseKillStatus = document.getElementById("showcase-kill-status");
const showcaseStrip = document.getElementById("showcase-strip");
const showcasePriceFiat = document.getElementById("showcase-price-fiat");
const showcasePriceVp = document.getElementById("showcase-price-vp");
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
let lockerLayout = null;
let lastSavedLayout = null;
let lockerDrag = null;
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
function emptyLabel(pickId = "") {
  return { pickId, color: "", slant: false, bold: false, underline: false };
}

let labelDraft = emptyLabel();
let labelling = false;
let searching = false;
let rearranging = false;
let currentUser = null;
let lockerHydrated = false;
let lockerSaving = false;
let recovering = false;
let recoverPassed = false;
let recoverToken = "";
let recoverKeys = [];
let recoverChecking = false;
let recoverTimer = 0;
let identityExists = null;
let identityTimer = 0;
let identitySeq = 0;

function apiUrl(path) {
  if (location.protocol === "file:") return `${APP_ORIGIN}${path}`;
  return path;
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
  syncForgotLink();
}

function showSecret(exists) {
  if (currentUser) return;
  identityExists = exists === null ? null : Boolean(exists);
  secretField.hidden = false;
  passwordInput.required = true;
  if (identityExists === false) {
    secretLabel.textContent = "Create password";
    passwordInput.autocomplete = "new-password";
    exitRecover();
  } else if (recoverPassed) {
    secretLabel.textContent = "Reset Password";
    passwordInput.autocomplete = "new-password";
  } else {
    secretLabel.textContent = "Password";
    passwordInput.autocomplete = "current-password";
  }
  syncForgotLink();
}

function syncForgotLink() {
  if (!forgotBtn) return;
  forgotBtn.hidden = Boolean(currentUser) || identityExists !== true;
}

function recoverViableSlots() {
  return [...document.querySelectorAll(".skin-select")]
    .filter((wrap) => wrap.dataset.pick && !wrap.classList.contains("is-disabled"))
    .map((wrap) => wrap.dataset.pick);
}

function ensureRecoverNone(wrap) {
  const menu = wrap.skinMenu;
  if (!menu || menu.querySelector(".skin-option-none")) return;
  const none = document.createElement("button");
  none.type = "button";
  none.className = "skin-option skin-option-none";
  none.dataset.value = "";
  none.textContent = "No skins";
  none.setAttribute("role", "option");
  none.setAttribute("aria-selected", "false");
  const remove = menu.querySelector(".skin-option-remove");
  if (remove) remove.after(none);
  else menu.prepend(none);
}

function paintRecoverCells() {
  const keySet = new Set(recoverKeys);
  for (const wrap of document.querySelectorAll(".skin-select")) {
    const on = recovering && keySet.has(wrap.dataset.pick);
    wrap.classList.toggle("is-recover", on);
    if (on) {
      ensureRecoverNone(wrap);
      const remove = wrap.skinMenu?.querySelector(".skin-option-remove");
      if (remove) remove.hidden = true;
    } else {
      delete wrap.dataset.recoverSet;
    }
  }
}

function recoverGuesses() {
  const guesses = {};
  for (const key of recoverKeys) {
    const wrap = document.querySelector(`.skin-select[data-pick="${key}"]`);
    if (!wrap || wrap.dataset.recoverSet !== "1") return null;
    guesses[key] = wrap.dataset.value || "";
  }
  return guesses;
}

function queueRecoverCheck() {
  window.clearTimeout(recoverTimer);
  recoverTimer = window.setTimeout(() => {
    maybeRecoverCheck();
  }, 40);
}

function paintRecoverSecret(passed) {
  const wasPassed = recoverPassed;
  recoverPassed = Boolean(passed);
  if (recoverPassed) {
    secretLabel.textContent = "Reset Password";
    secretLabel.htmlFor = "meta-password";
    passwordInput.autocomplete = "new-password";
    if (!wasPassed) {
      passwordInput.value = "";
      passwordInput.focus();
    }
    return;
  }
  secretLabel.textContent = "Password";
  secretLabel.htmlFor = "meta-password";
  passwordInput.autocomplete = "current-password";
  if (wasPassed) passwordInput.value = "";
}

async function maybeRecoverCheck() {
  if (!recovering || recoverChecking || !recoverToken) return;
  const guesses = recoverGuesses();
  if (!guesses) {
    paintRecoverSecret(false);
    return;
  }
  recoverChecking = true;
  try {
    const data = await api("/api/recover/check", {
      method: "POST",
      body: JSON.stringify({ token: recoverToken, picks: guesses }),
    });
    if (!recovering) return;
    recoverToken = data.token || recoverToken;
    paintRecoverSecret(Boolean(data.ok));
  } catch (error) {
    paintRecoverSecret(false);
    setFieldError(passwordInput, error.message);
  } finally {
    recoverChecking = false;
  }
}

function exitRecover() {
  if (!recovering && !recoverPassed && !recoverToken) {
    syncForgotLink();
    return;
  }
  recovering = false;
  recoverPassed = false;
  recoverToken = "";
  recoverKeys = [];
  recoverChecking = false;
  window.clearTimeout(recoverTimer);
  document.body.classList.remove("is-recovering");
  for (const wrap of document.querySelectorAll(".skin-select.is-recover")) {
    wrap.classList.remove("is-recover");
    delete wrap.dataset.recoverSet;
  }
  if (!currentUser && identityExists === true) {
    secretLabel.textContent = "Password";
    secretLabel.htmlFor = "meta-password";
    passwordInput.autocomplete = "current-password";
  }
  syncForgotLink();
  syncModeLocks();
  if (lockerCatalog && !currentUser) paintLocker();
}

async function startRecover() {
  if (currentUser || identityExists !== true) return;
  if (recovering) {
    exitRecover();
    return;
  }
  clearAuthErrors();
  if (labelling) exitLabellingMode();
  if (searching) exitSearchMode();
  if (rearranging) exitRearrangeMode();
  try {
    await loadLockerTable();
    const slots = recoverViableSlots();
    const data = await api("/api/recover/start", {
      method: "POST",
      body: JSON.stringify({ username: currentUsername(), slots }),
    });
    recoverToken = data.token || "";
    recoverKeys = Array.isArray(data.keys) ? data.keys.filter(Boolean).slice(0, 3) : [];
    if (!recoverToken || recoverKeys.length !== 3) throw new Error("Locker is not ready");
    recovering = true;
    recoverPassed = false;
    document.body.classList.add("is-recovering");
    paintRecoverCells();
    syncCollectionLocks();
    syncModeLocks();
  } catch (error) {
    exitRecover();
    setFieldError(passwordInput, error.message);
  }
}

function setAuthed(user) {
  currentUser = user;
  usernameInput.value = user.username;
  usernameTitle.textContent = user.username;
  try {
    localStorage.setItem("valocker-username", user.username);
  } catch {
    /* ignore */
  }
  document.cookie = `valocker_username=${encodeURIComponent(user.username)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
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
  exitRecover();
  syncForgotLink();
  syncLockerStick();
  syncSaveEnabled();
  if (typeof syncProfileAuth === "function") syncProfileAuth(user);
}

function setLoggedOutUi({ keepUsername = false } = {}) {
  currentUser = null;
  lockerHydrated = false;
  lockerSaving = false;
  clearLogoutArm();
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
  if (!keepUsername) {
    try {
      localStorage.removeItem("valocker-username");
    } catch {
      /* ignore */
    }
    document.cookie = "valocker_username=; Path=/; SameSite=Lax; Max-Age=0";
  }
  showSecret(null);
  clearAuthErrors();
  exitRecover();
  syncForgotLink();
  syncSaveEnabled();
  syncExportButton();
  syncLockerStick();
  if (typeof syncProfileAuth === "function") syncProfileAuth(null);
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
  lastSavedLayout = null;
  exitLabellingMode();
  setLoggedOutUi({ keepUsername });
  lockerLayout = loadLayoutLocal();
  loadCrosshair();
  paintLocker();
}

function applyIdentity(user) {
  setAuthed(user);
}

async function loadPicks() {
  lockerHydrated = false;
  syncSaveEnabled();
  lockerPicks.clear();
  lockerLabels.clear();
  const data = await api("/api/picks");
  for (const [key, name] of Object.entries(data.picks || {})) {
    lockerPicks.set(key, name);
  }
  for (const [key, raw] of Object.entries(data.labels || {})) {
    const label = normalizeLabel(raw);
    if (label.color || label.slant || label.bold || label.underline) lockerLabels.set(key, label);
  }
  const serverLayout = sanitizeLayout(data.layout);
  lockerLayout = serverLayout || loadLayoutLocal();
  persistLayoutLocal();
  lastSavedLayout = cloneLayout(serverLayout);
  rememberSavedPicks();
  if (data.crosshair) loadCrosshair(data.crosshair);
  else loadCrosshair();
  if (data.agent && typeof applySavedAgent === "function") applySavedAgent(data.agent);
  lockerHydrated = true;
  syncSaveEnabled();
}

function normalizeLabel(raw) {
  const color = LABEL_COLORS[raw?.color] ? raw.color : "";
  return { color, slant: Boolean(raw?.slant), bold: Boolean(raw?.bold), underline: Boolean(raw?.underline) };
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
    if (
      !saved ||
      saved.color !== label.color ||
      saved.slant !== label.slant ||
      saved.bold !== label.bold ||
      saved.underline !== label.underline
    ) {
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
  return labelsMatchSaved() && layoutsEqual(lockerLayout, lastSavedLayout);
}

function unsavedSelectionCount() {
  const keys = new Set([...lockerPicks.keys(), ...lastSavedPicks.keys()]);
  let count = 0;
  for (const key of keys) {
    if (lockerPicks.get(key) !== lastSavedPicks.get(key)) count += 1;
  }
  return count;
}

function unsavedLogoutMessage() {
  if (unsavedSelectionCount() > 1) {
    return "current selections are not saved yet,\nclick logout again to quit with unsaved selections";
  }
  return "current selection is not saved yet,\nclick logout again to quit with unsaved selection";
}

function rememberSavedPicks() {
  lastSavedPicks.clear();
  lastSavedLabels.clear();
  for (const [key, name] of lockerPicks) lastSavedPicks.set(key, name);
  for (const [key, label] of lockerLabels) lastSavedLabels.set(key, { ...label });
  clearLogoutArm();
  syncSaveButton();
}

function syncSaveEnabled() {
  saveLockerBtn.disabled = !currentUser || !lockerHydrated || lockerSaving;
}

function syncSaveButton() {
  const saved = picksMatchSaved();
  saveLockerBtn.textContent = saved ? "Saved" : "Save";
  saveLockerBtn.classList.toggle("is-saved", saved);
  syncSaveEnabled();
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
            underline: Boolean(label?.underline),
          };
        }),
      };
    }),
  }));
}

let exportArmed = false;
let exportArmTimer = 0;
let logoutArmed = false;
let logoutArmTimer = 0;

function clearLogoutArm() {
  logoutArmed = false;
  window.clearTimeout(logoutArmTimer);
}

function requestLogout() {
  if (!currentUser) return;
  if (picksMatchSaved()) {
    clearLogoutArm();
    clearSession();
    return;
  }
  if (!logoutArmed) {
    logoutArmed = true;
    window.clearTimeout(logoutArmTimer);
    showAppToast(unsavedLogoutMessage(), 4000);
    logoutArmTimer = window.setTimeout(clearLogoutArm, 4000);
    return;
  }
  clearLogoutArm();
  clearSession();
}

function clearExportArm() {
  exportArmed = false;
  window.clearTimeout(exportArmTimer);
}

function askExportConfirm() {
  exportArmed = true;
  window.clearTimeout(exportArmTimer);
  showAppToast("no new changes", 4000);
  exportArmTimer = window.setTimeout(clearExportArm, 4000);
}

async function exportLockerDocx() {
  if (!exportReady()) {
    clearExportArm();
    showAppToast("please save current selection to use this function");
    return;
  }
  if (!exportArmed) {
    askExportConfirm();
    return;
  }
  clearExportArm();
  hideLabelToast();
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
  if (!currentUser || !lockerHydrated || lockerSaving) return;
  clearAuthErrors();
  lockerSaving = true;
  syncSaveEnabled();
  try {
    await api("/api/picks", {
      method: "POST",
      body: JSON.stringify({
        picks: Object.fromEntries(lockerPicks),
        labels: Object.fromEntries(lockerLabels),
        layout: lockerLayout,
        crosshair: { ...xhBundle, mode: crosshair.mode },
      }),
    });
    lastSavedLayout = cloneLayout(lockerLayout);
    rememberSavedPicks();
  } catch (error) {
    setFieldError(passwordInput, error.message);
  } finally {
    lockerSaving = false;
    syncSaveEnabled();
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
        category: key,
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

  return applyLockerLayout(
    [...groups.values()].sort((a, b) => a.rank - b.rank || compareNames(a.label, b.label)),
  );
}

function layoutStorageKey() {
  const name = (currentUser?.username || currentUsername() || "").trim().toLowerCase();
  return name ? `valocker-layout:${name}` : "valocker-layout";
}

function cloneLayout(layout) {
  return layout ? JSON.parse(JSON.stringify(layout)) : null;
}

function layoutsEqual(a, b) {
  return JSON.stringify(a || null) === JSON.stringify(b || null);
}

function sanitizeLayout(raw) {
  if (!raw || typeof raw !== "object") return null;
  const categories = [];
  if (Array.isArray(raw.categories)) {
    for (const item of raw.categories.slice(0, 20)) {
      const value = String(item || "").trim();
      if (value && !categories.includes(value)) categories.push(value);
    }
  }
  const weapons = {};
  if (raw.weapons && typeof raw.weapons === "object") {
    for (const [key, list] of Object.entries(raw.weapons).slice(0, 20)) {
      const category = String(key || "").trim();
      if (!category || !Array.isArray(list)) continue;
      const uuids = [];
      for (const item of list.slice(0, 40)) {
        const uuid = String(item || "").trim();
        if (uuid && !uuids.includes(uuid)) uuids.push(uuid);
      }
      weapons[category] = uuids;
    }
  }
  if (!categories.length && !Object.keys(weapons).length) return null;
  return { categories, weapons };
}

function loadLayoutLocal() {
  try {
    return sanitizeLayout(JSON.parse(localStorage.getItem(layoutStorageKey()) || "null"));
  } catch {
    return null;
  }
}

function persistLayoutLocal() {
  try {
    const key = layoutStorageKey();
    if (lockerLayout) localStorage.setItem(key, JSON.stringify(lockerLayout));
    else localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

function applyLockerLayout(groups) {
  if (!lockerLayout) return groups;
  const byCategory = new Map(groups.map((group) => [group.category, group]));
  const categories = [];
  for (const category of lockerLayout.categories || []) {
    if (byCategory.has(category) && !categories.includes(category)) categories.push(category);
  }
  for (const group of groups) {
    if (!categories.includes(group.category)) categories.push(group.category);
  }
  const weaponsMap = lockerLayout.weapons || {};
  return categories.map((category) => {
    const group = byCategory.get(category);
    const wanted = weaponsMap[category] || [];
    const byId = new Map(group.weapons.map((weapon) => [weapon.uuid, weapon]));
    const ordered = [];
    for (const uuid of wanted) {
      const weapon = byId.get(uuid);
      if (weapon && !ordered.includes(weapon)) ordered.push(weapon);
    }
    for (const weapon of group.weapons) {
      if (!ordered.includes(weapon)) ordered.push(weapon);
    }
    return { ...group, weapons: ordered };
  });
}

function snapshotLayout() {
  if (!lockerCatalog) return { categories: [], weapons: {} };
  const groups = groupedGuns(lockerCatalog.weapons);
  return {
    categories: groups.map((group) => group.category),
    weapons: Object.fromEntries(groups.map((group) => [group.category, group.weapons.map((weapon) => weapon.uuid)])),
  };
}

function commitLayout(next) {
  lockerLayout = sanitizeLayout(next);
  persistLayoutLocal();
  paintLocker();
  syncSaveButton();
}

function resetLockerLayout() {
  commitLayout(null);
}

function moveCategory(from, to, after) {
  const layout = snapshotLayout();
  const categories = layout.categories.filter((category) => category !== from);
  let index = categories.indexOf(to);
  if (index < 0) return;
  if (after) index += 1;
  categories.splice(index, 0, from);
  commitLayout({ ...layout, categories });
}

function moveGun(category, from, to, after) {
  const layout = snapshotLayout();
  const list = (layout.weapons[category] || []).filter((uuid) => uuid !== from);
  let index = list.indexOf(to);
  if (index < 0) return;
  if (after) index += 1;
  list.splice(index, 0, from);
  commitLayout({
    ...layout,
    weapons: { ...layout.weapons, [category]: list },
  });
}

function categoryBlockRect(category) {
  const escaped = CSS.escape(category);
  const head = tableBody.querySelector(`td.rarity[data-category="${escaped}"]`);
  const guns = tableBody.querySelectorAll(`td.gun[data-category="${escaped}"]`);
  const last = guns[guns.length - 1];
  const top = head?.getBoundingClientRect().top ?? guns[0]?.getBoundingClientRect().top ?? 0;
  const bottom = last?.getBoundingClientRect().bottom ?? head?.getBoundingClientRect().bottom ?? 0;
  return { top, bottom };
}

function dropAfterCategory(event, category) {
  const { top, bottom } = categoryBlockRect(category);
  return event.clientY > (top + bottom) / 2;
}

function dropAfterGun(event, cell) {
  const rect = cell.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

function setRearranging(on) {
  if (on) {
    if (searching) exitSearchMode();
    if (labelling) exitLabellingMode();
  } else {
    document.querySelector(".rearrange-ghost")?.remove();
  }
  rearranging = on;
  document.body.classList.toggle("is-rearranging", on);
  syncModeLocks();
  if (on) {
    closeSkinMenu();
    closeFilterMenu();
  }
}

function clearRearrangePreview() {
  tableBody?.querySelectorAll("td").forEach((el) => {
    el.style.transform = "";
    el.classList.remove("is-rearrange-source");
  });
  document.querySelector(".rearrange-ghost")?.remove();
}

function exitRearrangeMode() {
  clearRearrangePreview();
  setRearranging(false);
}

function cacheRearrangeItems(kind, category) {
  if (kind === "category") {
    return [...tableBody.querySelectorAll("td.rarity[data-drag='category']")].map((el) => {
      const rows = [...tableBody.querySelectorAll(`td.gun[data-category="${CSS.escape(el.dataset.category)}"]`)]
        .map((gun) => gun.parentElement);
      const last = rows[rows.length - 1]?.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const bottom = last?.bottom ?? rect.bottom;
      return { id: el.dataset.category, el, rows, top: rect.top, bottom, height: bottom - rect.top };
    });
  }
  return [...tableBody.querySelectorAll(`td.gun[data-category="${CSS.escape(category)}"]`)].map((el) => {
    const rect = el.getBoundingClientRect();
    return { id: el.dataset.weapon, el, top: rect.top, bottom: rect.bottom, height: rect.height };
  });
}

function insertIndexFromY(items, clientY) {
  let hover = items.length - 1;
  for (let i = 0; i < items.length; i += 1) {
    if (clientY < (items[i].top + items[i].bottom) / 2) {
      hover = i;
      break;
    }
  }
  return hover;
}

function applyRearrangePreview(insertIndex) {
  if (!lockerDrag) return;
  if (lockerDrag.insertIndex === insertIndex) return;
  lockerDrag.insertIndex = insertIndex;
  const { fromIndex, items } = lockerDrag;
  const fromH = items[fromIndex].height;
  items.forEach((item, i) => {
    let dy = 0;
    if (i !== fromIndex) {
      if (fromIndex < insertIndex && i > fromIndex && i <= insertIndex) dy = -fromH;
      else if (fromIndex > insertIndex && i >= insertIndex && i < fromIndex) dy = fromH;
    }
    item.el.style.transform = dy ? `translateY(${dy}px)` : "";
    if (item.rows) {
      for (const row of item.rows) {
        for (const td of row.children) {
          if (td === item.el) continue;
          td.style.transform = dy ? `translateY(${dy}px)` : "";
        }
      }
    }
  });
}

function rearrangeTargetCell(event) {
  const cell = event.target.closest?.("td[data-drag]");
  if (!cell || !tableBody.contains(cell) || !lockerDrag) return null;
  if (lockerDrag.kind === "category") {
    return cell.dataset.drag === "category" ? cell : null;
  }
  if (cell.dataset.drag !== "gun" || cell.dataset.category !== lockerDrag.category) return null;
  return cell;
}

function makeRearrangeGhost(cell) {
  const ghost = document.createElement("div");
  ghost.className = "rearrange-ghost";
  ghost.textContent = cell.dataset.drag === "category"
    ? cell.textContent
    : (cell.querySelector(".gun-name")?.textContent || cell.textContent);
  const rect = cell.getBoundingClientRect();
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.append(ghost);
  return ghost;
}

function commitRearrange(drag) {
  if (!drag || drag.insertIndex == null || drag.insertIndex === drag.fromIndex) return false;
  if (drag.kind === "gun") {
    const layout = snapshotLayout();
    const list = [...(layout.weapons[drag.category] || [])];
    const [item] = list.splice(drag.fromIndex, 1);
    if (!item) return false;
    list.splice(drag.insertIndex, 0, item);
    commitLayout({ ...layout, weapons: { ...layout.weapons, [drag.category]: list } });
    return true;
  }
  const layout = snapshotLayout();
  const categories = [...layout.categories];
  const [item] = categories.splice(drag.fromIndex, 1);
  if (!item) return false;
  categories.splice(drag.insertIndex, 0, item);
  commitLayout({ ...layout, categories });
  return true;
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
  gunCell.draggable = true;
  gunCell.dataset.drag = "gun";
  gunCell.dataset.weapon = weapon.uuid;
  gunCell.dataset.category = weapon.category;

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
    icon.draggable = false;
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
  shell.style.left = `${rect.left}px`;
  shell.style.width = `${rect.width}px`;
  shell.style.maxHeight = `${maxHeight}px`;
  menu.style.maxHeight = `${maxHeight}px`;
  shell.style.bottom = "auto";
  shell.style.top = `${rect.bottom}px`;
  updateMenuOverflow(shell, menu);
}

function collectionFamily(name) {
  return (name || "")
    .replace(/\s*\(\d+\.0\)\s*$/i, "")
    .replace(/\s*\/\/\s*\d+(?:\.\d+)?\s*$/i, "")
    .replace(/\s+\d+\.\d+\s*$/i, "")
    .trim()
    .toLowerCase();
}

let showcaseByKey = new Map();
let showcaseByFamily = new Map();
const showcaseInspectState = { x: 0, y: 0, scale: 1, fit: 1, drag: false, px: 0, py: 0, ox: 0, oy: 0 };
let showcaseCurrent = null;
let showcaseOverlayTimer = 0;
let showcaseStripTarget = 0;
let showcaseStripRaf = 0;
let showcaseKillIndex = 1;
let showcaseKillAudio = null;
let showcaseKillReady = false;
let showcaseKillProbe = 0;
let showcaseKillUrls = [];

function tickShowcaseStrip() {
  if (!showcaseStrip) {
    showcaseStripRaf = 0;
    return;
  }
  const current = showcaseStrip.scrollLeft;
  const next = current + (showcaseStripTarget - current) * 0.16;
  if (Math.abs(showcaseStripTarget - next) < 0.5) {
    showcaseStrip.scrollLeft = showcaseStripTarget;
    showcaseStripRaf = 0;
    return;
  }
  showcaseStrip.scrollLeft = next;
  showcaseStripRaf = requestAnimationFrame(tickShowcaseStrip);
}

function nudgeShowcaseStrip(delta) {
  if (!showcaseStrip) return;
  const max = Math.max(0, showcaseStrip.scrollWidth - showcaseStrip.clientWidth);
  showcaseStripTarget = Math.max(0, Math.min(max, showcaseStripTarget + delta));
  if (!showcaseStripRaf) showcaseStripRaf = requestAnimationFrame(tickShowcaseStrip);
}

function scrollShowcaseStripTo(tile) {
  if (!showcaseStrip || !tile) return;
  const left = tile.offsetLeft - (showcaseStrip.clientWidth - tile.offsetWidth) / 2;
  const max = Math.max(0, showcaseStrip.scrollWidth - showcaseStrip.clientWidth);
  showcaseStripTarget = Math.max(0, Math.min(max, left));
  if (!showcaseStripRaf) showcaseStripRaf = requestAnimationFrame(tickShowcaseStrip);
}

function sequelWaveFromLabel(label) {
  const text = label || "";
  const paren = text.match(/\((\d+)\.0\)\s*$/);
  if (paren) return Number(paren[1]);
  const slash = text.match(/\/\/\s*(\d+)(?:\.0)?\s*$/i);
  if (slash) return Number(slash[1]);
  const dotted = text.match(/\s+(\d+)\.0\s*$/);
  if (dotted) return Number(dotted[1]);
  return 1;
}

function showcaseCurrency() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Kuala_Lumpur") return "MYR";
    const region = new Intl.Locale(navigator.language || "en-MY").maximize().region || "MY";
    return REGION_CURRENCY[region] || "MYR";
  } catch {
    return "MYR";
  }
}

function vpToFiat(vp, currency) {
  if (!vp) return 0;
  if (currency === "MYR") return Math.round((vp * MY_VP_PACK.myr) / MY_VP_PACK.vp);
  const usd = (vp * US_VP_PACK.usd) / US_VP_PACK.vp;
  if (currency === "USD") return Math.round(usd);
  const rate = fxFromUsd[currency];
  if (!rate) return Math.round(usd * (fxFromUsd.MYR || 4.0915));
  return Math.round(usd * rate);
}

function formatShowcaseFiat(amount, currency) {
  const code = String(currency || "MYR").toLowerCase();
  return `${amount} ${code}`;
}

function paintShowcasePrice(item) {
  const vp = item?.vp || 0;
  const currency = showcaseCurrency();
  if (showcasePriceFiat) showcasePriceFiat.textContent = vp ? formatShowcaseFiat(vpToFiat(vp, currency), currency) : "";
  if (showcasePriceVp) showcasePriceVp.textContent = vp ? `${vp.toLocaleString("en-US")} VP` : "";
}

fetch("https://api.frankfurter.app/latest?from=USD")
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => {
    if (!data?.rates) return;
    fxFromUsd = { USD: 1, ...data.rates };
    if (showcaseCurrent) paintShowcasePrice(showcaseCurrent);
  })
  .catch(() => {});

function skinPreviewAssets(skin) {
  const chromas = (skin.chromas || []).filter((chroma) => chroma.fullRender || chroma.swatch || chroma.displayIcon);
  const videos = [...(skin.chromas || []), ...(skin.levels || [])].map((item) => item.streamedVideo).filter(Boolean);
  return {
    render: chromas.find((chroma) => chroma.fullRender)?.fullRender || skin.displayIcon || "",
    wallpaper: skin.wallpaper || "",
    chromas,
    video: videos[0] || "",
  };
}

function rebuildShowcaseIndex() {
  showcaseByKey = new Map();
  showcaseByFamily = new Map();
  if (!lockerCatalog) return;
  const { weapons, tiers, themes } = lockerCatalog;
  const tierByUuid = new Map(tiers.map((tier) => [tier.uuid, tier]));
  const themeByUuid = new Map(themes.map((theme) => [theme.uuid, theme]));
  const sequelThemes = buildSequelIndex(weapons, themeByUuid);

  for (const weapon of weapons) {
    if (weapon.category === MELEE_CATEGORY) continue;
    for (const skin of weapon.skins || []) {
      if (!skin.contentTierUuid || skin.displayName === "Random Favorite Skin") continue;
      if (!bucketForSkin(skin, tierByUuid)) continue;
      const label = displayNameForSkin(skin, weapon.displayName, sequelThemes, themeByUuid);
      if (!label) continue;
      const assets = skinPreviewAssets(skin);
      const tier = tierByUuid.get(skin.contentTierUuid);
      const item = {
        key: `${weapon.uuid}:${label}`,
        weaponUuid: weapon.uuid,
        weaponName: weapon.displayName,
        label,
        family: collectionFamily(label),
        wave: sequelWaveFromLabel(label),
        vp: TIER_VP[tier?.displayName] || 0,
        ...assets,
      };
      showcaseByKey.set(item.key, item);
      if (!showcaseByFamily.has(item.family)) showcaseByFamily.set(item.family, []);
      showcaseByFamily.get(item.family).push(item);
    }
  }

  for (const items of showcaseByFamily.values()) {
    items.sort((a, b) => {
      const aIndex = tableWeaponIndex(a.weaponName);
      const bIndex = tableWeaponIndex(b.weaponName);
      if (aIndex !== bIndex) return aIndex - bIndex;
      if (a.wave !== b.wave) return a.wave - b.wave;
      return compareNames(a.label, b.label);
    });
  }
}

function tableWeaponIndex(name) {
  const index = WEAPON_ORDER.indexOf(name);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function lockerWeaponsInTableOrder() {
  if (!lockerCatalog) return [];
  return groupedGuns(lockerCatalog.weapons).flatMap((group) => group.weapons);
}

function familySkinForWeapon(familyItems, weapon, current) {
  const matches = familyItems.filter((entry) => entry.weaponUuid === weapon.uuid);
  if (!matches.length) return null;
  return matches.find((entry) => entry.key === current.key)
    || matches.find((entry) => entry.wave === current.wave)
    || matches[0];
}

function chromaVariantLabel(displayName, index) {
  if (index === 0) return "Default";
  const text = String(displayName || "").replace(/\r/g, "\n");
  const line = text.split("\n").map((part) => part.trim()).find((part) => /^variant\b/i.test(part));
  const inline = text.match(/variant\s+\d+\b[^\n]*/i);
  const raw = (line || inline?.[0] || "").replace(/\s+/g, " ").trim();
  const clean = raw.replace(/^[(\s]+/, "").replace(/[)\s]+$/, "").trim();
  return clean || `Variant ${index}`;
}

function setShowcaseVariant(label) {
  if (showcaseVariant) showcaseVariant.textContent = label || "Default";
}

function stopShowcaseKill() {
  if (showcaseKillAudio) {
    showcaseKillAudio.pause();
    showcaseKillAudio.removeAttribute("src");
    showcaseKillAudio.load();
    showcaseKillAudio = null;
  }
  showcaseKill?.classList.remove("is-busy");
}

function killCountLabel(index) {
  return index >= 5 ? "5 kill or more" : `${index} kill`;
}

function paintShowcaseKillMeta(status, index = showcaseKillIndex) {
  if (showcaseKillCount) {
    showcaseKillCount.textContent = status === "fetched" ? killCountLabel(index) : "";
  }
  if (showcaseKillStatus) showcaseKillStatus.textContent = status;
}

function setShowcaseKillEnabled(on, index = showcaseKillIndex) {
  if (!showcaseKill) return;
  showcaseKill.disabled = !on;
  showcaseKill.setAttribute("aria-label", on ? `Play ${killCountLabel(index)}` : "Kill sound unavailable");
}

function probeShowcaseKill(family) {
  stopShowcaseKill();
  showcaseKillIndex = 1;
  showcaseKillReady = false;
  showcaseKillUrls = [];
  setShowcaseKillEnabled(false, 1);
  paintShowcaseKillMeta("loading", 1);
  if (!family || !showcaseKill) {
    paintShowcaseKillMeta("no audio", 1);
    return;
  }
  const token = ++showcaseKillProbe;
  api(`/api/kill-audio?family=${encodeURIComponent(family)}`).then((data) => {
    if (token !== showcaseKillProbe) return;
    const urls = Array.isArray(data.urls) ? data.urls.filter(Boolean) : [];
    showcaseKillUrls = urls;
    showcaseKillReady = urls.length > 0;
    setShowcaseKillEnabled(showcaseKillReady, 1);
    paintShowcaseKillMeta(showcaseKillReady ? "fetched" : "no audio", 1);
  }).catch(() => {
    if (token !== showcaseKillProbe) return;
    showcaseKillReady = false;
    setShowcaseKillEnabled(false, 1);
    paintShowcaseKillMeta("no audio", 1);
  });
}

function playShowcaseKill() {
  if (!showcaseKillReady || !showcaseKillUrls.length || !showcaseKill || showcaseKill.disabled) return;
  stopShowcaseKill();
  const max = showcaseKillUrls.length;
  const n = ((showcaseKillIndex - 1) % max) + 1;
  const audio = new Audio(showcaseKillUrls[n - 1]);
  showcaseKillAudio = audio;
  showcaseKill.disabled = true;
  showcaseKill.classList.add("is-busy");
  paintShowcaseKillMeta("fetched", n);
  audio.addEventListener("ended", () => {
    if (showcaseKillAudio !== audio) return;
    showcaseKillAudio = null;
    showcaseKillIndex = n >= max ? 1 : n + 1;
    showcaseKill.classList.remove("is-busy");
    setShowcaseKillEnabled(showcaseKillReady, showcaseKillIndex);
    paintShowcaseKillMeta(showcaseKillReady ? "fetched" : "no audio", showcaseKillIndex);
  }, { once: true });
  audio.addEventListener("error", () => {
    if (showcaseKillAudio !== audio) return;
    showcaseKillAudio = null;
    showcaseKillReady = false;
    showcaseKill.classList.remove("is-busy");
    setShowcaseKillEnabled(false, showcaseKillIndex);
    paintShowcaseKillMeta("no audio", showcaseKillIndex);
  }, { once: true });
  audio.play().catch(() => {
    if (showcaseKillAudio !== audio) return;
    showcaseKillAudio = null;
    showcaseKill.classList.remove("is-busy");
    setShowcaseKillEnabled(showcaseKillReady, showcaseKillIndex);
    paintShowcaseKillMeta(showcaseKillReady ? "fetched" : "no audio", showcaseKillIndex);
  });
}

function showcaseInspectFit() {
  if (!showcaseImage || !showcaseInspect) return 1;
  const width = showcaseImage.naturalWidth || 1;
  const height = showcaseImage.naturalHeight || 1;
  const box = showcaseInspect.getBoundingClientRect();
  const availW = Math.max(box.width - 64, 1);
  const availH = Math.max(box.height - 56, 1);
  return Math.min(availW / width, availH / height);
}

function layoutShowcaseInspect() {
  if (!showcaseImage?.naturalWidth) return;
  showcaseInspectState.fit = showcaseInspectFit();
  applyShowcaseInspect();
}

function resetShowcaseInspect() {
  showcaseInspectState.x = 0;
  showcaseInspectState.y = 0;
  showcaseInspectState.scale = 1;
  showcaseInspectState.drag = false;
  layoutShowcaseInspect();
}

function applyShowcaseInspect() {
  if (!showcaseImage) return;
  const { x, y, scale, fit } = showcaseInspectState;
  const width = showcaseImage.naturalWidth;
  const height = showcaseImage.naturalHeight;
  if (width) {
    showcaseImage.style.width = `${width}px`;
    showcaseImage.style.height = `${height}px`;
  }
  showcaseImage.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${(fit || 1) * scale})`;
}

function setShowcasePlayState(playing) {
  if (!showcasePlay) return;
  showcasePlay.classList.toggle("is-playing", playing);
  showcasePlay.setAttribute("aria-label", playing ? "Back to inspect" : "Play preview");
}

function stopShowcaseVideo() {
  if (!showcaseVideo) return;
  showcaseVideo.pause();
  showcaseVideo.removeAttribute("src");
  showcaseVideo.load();
  showcaseVideo.hidden = true;
  showcaseInspect?.classList.remove("is-playing");
  if (showcaseImage) showcaseImage.hidden = false;
  setShowcasePlayState(false);
}

function paintShowcase(item) {
  if (!item || !showcaseOverlay) return;
  showcaseCurrent = item;
  showcaseKicker.textContent = item.weaponName;
  showcaseTitle.textContent = item.label;
  paintShowcasePrice(item);
  setShowcaseVariant("Default");
  showcaseImage.src = item.render;
  showcaseImage.alt = `${item.label} ${item.weaponName}`;
  showcaseImage.hidden = false;
  stopShowcaseVideo();
  stopShowcaseKill();
  resetShowcaseInspect();
  if (showcaseImage.complete && showcaseImage.naturalWidth) layoutShowcaseInspect();
  probeShowcaseKill(item.family);

  const extraChromas = item.chromas.filter((chroma, index) => index > 0 && (chroma.fullRender || chroma.swatch));
  showcaseChromas.replaceChildren();
  if (extraChromas.length) {
    const chips = [{ fullRender: item.render, swatch: item.chromas[0]?.swatch || "", displayName: "Default" }, ...extraChromas];
    for (const [index, chroma] of chips.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "showcase-chroma";
      const variantName = chromaVariantLabel(chroma.displayName, index);
      button.title = variantName;
      button.dataset.variant = variantName;
      if (chroma.swatch) button.style.backgroundImage = `url("${chroma.swatch}")`;
      button.classList.toggle("is-on", index === 0);
      button.addEventListener("click", () => {
        for (const chip of showcaseChromas.children) chip.classList.remove("is-on");
        button.classList.add("is-on");
        setShowcaseVariant(variantName);
        stopShowcaseVideo();
        showcaseImage.src = chroma.fullRender || item.render;
        resetShowcaseInspect();
      });
      showcaseChromas.append(button);
    }
  }

  showcasePlay.hidden = !item.video;
  setShowcasePlayState(false);
  const family = showcaseByFamily.get(item.family) || [item];
  showcaseStrip.replaceChildren();
  for (const weapon of lockerWeaponsInTableOrder()) {
    const entry = familySkinForWeapon(family, weapon, item);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "showcase-tile";
    const media = document.createElement("span");
    media.className = "showcase-tile-media";
    const caption = document.createElement("span");
    caption.className = "showcase-tile-name";
    if (!entry) {
      tile.classList.add("is-empty");
      tile.disabled = true;
      const mark = document.createElement("span");
      mark.className = "showcase-tile-x";
      mark.setAttribute("aria-hidden", "true");
      media.append(mark);
      caption.textContent = weapon.displayName;
    } else {
      tile.classList.toggle("is-on", entry.key === item.key);
      const img = document.createElement("img");
      img.src = entry.render;
      img.alt = "";
      media.append(img);
      caption.textContent = entry.wave > 1 ? `${entry.weaponName} (${entry.wave}.0)` : entry.weaponName;
      tile.addEventListener("click", () => paintShowcase(entry));
    }
    tile.append(media, caption);
    showcaseStrip.append(tile);
  }
  scrollShowcaseStripTo(showcaseStrip.querySelector(".is-on"));
}

function openShowcase(item) {
  if (!item || !showcaseOverlay) return;
  window.clearTimeout(showcaseOverlayTimer);
  showcaseOverlay.hidden = false;
  document.body.classList.add("is-showcasing");
  paintShowcase(item);
  void showcaseOverlay.offsetWidth;
  showcaseOverlay.classList.add("is-on");
}

function closeShowcase() {
  if (!showcaseOverlay) return;
  const wasOpen = showcaseOverlay.classList.contains("is-on") || !showcaseOverlay.hidden;
  showcaseOverlay.classList.remove("is-on");
  document.body.classList.remove("is-showcasing");
  stopShowcaseVideo();
  stopShowcaseKill();
  showcaseKillProbe += 1;
  showcaseKillReady = false;
  setShowcaseKillEnabled(false, 1);
  showcaseCurrent = null;
  window.clearTimeout(showcaseOverlayTimer);
  if (wasOpen && !showcaseOverlay.hidden) {
    showcaseOverlayTimer = window.setTimeout(() => {
      if (!showcaseOverlay.classList.contains("is-on")) showcaseOverlay.hidden = true;
    }, 400);
  } else {
    showcaseOverlay.hidden = true;
  }
}

function showcaseItemForHit(weaponUuid, label) {
  return showcaseByKey.get(`${weaponUuid}:${label}`) || null;
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
  if (recovering) {
    for (const wrap of document.querySelectorAll(".skin-select")) {
      const menu = wrap.skinMenu;
      if (!menu) continue;
      for (const option of menu.querySelectorAll(".skin-option")) {
        if (option.classList.contains("skin-option-remove")) continue;
        option.disabled = false;
        option.classList.remove("skin-option-locked", "skin-option-lock-start");
        option.setAttribute("aria-disabled", "false");
      }
    }
    return;
  }
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
  if (bucket === "premiumFinisher") return "Premium (wf)";
  if (bucket === "premiumNoFinisher") return "Premium (wof)";
  const column = RARITY_COLUMNS[BUCKETS.indexOf(bucket)];
  return column ? `${column.label} ${column.finisher}` : bucket;
}

function applySkinLabel(wrap) {
  if (searching) return;
  const pickId = wrap.dataset.pick;
  const label = pickId ? lockerLabels.get(pickId) : null;
  const color = label && wrap.dataset.value ? label.color : "";
  const pastel = LABEL_COLORS[color] || "";
  wrap.classList.toggle("is-labeled", Boolean(pastel));
  wrap.classList.toggle("is-slanted", Boolean(label?.slant && wrap.dataset.value));
  wrap.classList.toggle("is-bought", Boolean(label?.bold && wrap.dataset.value));
  wrap.classList.toggle("is-underlined", Boolean(label?.underline && wrap.dataset.value));
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

function showAppToast(message, ms = 2600) {
  hideLabelToast();
  labelToast.textContent = message;
  labelToast.hidden = false;
  requestAnimationFrame(() => labelToast.classList.add("is-on"));
  labelToastTimer = window.setTimeout(hideLabelToast, ms);
}

function showLabelToast() {
  showAppToast("Click a selected skin to label it.");
}

function labelGridItems() {
  return labelEditor ? [...labelEditor.querySelectorAll(".label-grid > *")] : [];
}

function labelCellFromSkin(el) {
  const dx = labelSkinEl.offsetLeft + labelSkinEl.offsetWidth / 2 - (el.offsetLeft + el.offsetWidth / 2);
  const dy = labelSkinEl.offsetTop + labelSkinEl.offsetHeight / 2 - (el.offsetTop + el.offsetHeight / 2);
  const dist = Math.abs(dx) / Math.max(el.offsetWidth, 1) + Math.abs(dy) / Math.max(el.offsetHeight, 1);
  return { dx, dy, dist };
}

function labelOriginFromSkin(el) {
  const ox = ((labelSkinEl.offsetLeft + labelSkinEl.offsetWidth / 2) - el.offsetLeft) / Math.max(el.offsetWidth, 1) * 100;
  const oy = ((labelSkinEl.offsetTop + labelSkinEl.offsetHeight / 2) - el.offsetTop) / Math.max(el.offsetHeight, 1) * 100;
  return `${ox}% ${oy}%`;
}

function setLabelMotion(on) {
  labelEditor?.classList.toggle("is-motion", on);
}

function pileLabelCells() {
  setLabelMotion(true);
  for (const el of labelGridItems()) {
    if (el === labelSkinEl) {
      el.style.transition = "none";
      el.style.transitionDelay = "0s";
      el.style.transformOrigin = "center";
      el.style.transform = "none";
      el.style.opacity = "1";
      continue;
    }
    el.style.transition = "none";
    el.style.transitionDelay = "0s";
    el.style.transformOrigin = labelOriginFromSkin(el);
    el.style.transform = "scale(0.2)";
    el.style.opacity = "0.2";
  }
}

function labelMotionEase(move, fade) {
  return `transform ${move}, opacity ${fade}, background-color 0.45s ease, font-weight 0.45s ease, color 0.45s ease`;
}

function growLabelCells() {
  const ease = labelMotionEase("0.55s cubic-bezier(0.22, 1, 0.36, 1)", "0.35s ease");
  for (const el of labelGridItems()) {
    if (el === labelSkinEl) continue;
    const { dist } = labelCellFromSkin(el);
    el.style.transformOrigin = labelOriginFromSkin(el);
    el.style.transition = ease;
    el.style.transitionDelay = `${dist * 45}ms`;
    el.style.transform = "scale(1)";
    el.style.opacity = "1";
  }
  window.setTimeout(() => {
    if (!labelOverlay?.classList.contains("is-on")) return;
    for (const el of labelGridItems()) {
      if (el === labelSkinEl) continue;
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.style.opacity = "";
      el.style.transition = "";
      el.style.transitionDelay = "";
    }
    setLabelMotion(false);
  }, 780);
}

function foldLabelCells() {
  setLabelMotion(true);
  const ease = labelMotionEase("0.45s cubic-bezier(0.4, 0, 0.2, 1)", "0.3s ease");
  let maxDist = 0;
  const packed = labelGridItems().filter((el) => el !== labelSkinEl).map((el) => {
    const pack = labelCellFromSkin(el);
    if (pack.dist > maxDist) maxDist = pack.dist;
    return { el, ...pack };
  });
  for (const { el, dist } of packed) {
    el.style.transformOrigin = labelOriginFromSkin(el);
    el.style.transition = ease;
    el.style.transitionDelay = `${(maxDist - dist) * 30}ms`;
    el.style.transform = "scale(0.2)";
    el.style.opacity = "0.2";
  }
}

function clearLabelCellMotion() {
  setLabelMotion(false);
  for (const el of labelGridItems()) {
    el.style.transform = "";
    el.style.transformOrigin = "";
    el.style.opacity = "";
    el.style.transition = "";
    el.style.transitionDelay = "";
  }
}

function setLabelScrollLock(on) {
  document.body.classList.toggle("is-label-open", on);
}

function closeLabelWindows() {
  if (!labelOverlay) return;
  const wasOpen = labelOverlay.classList.contains("is-on") || !labelOverlay.hidden;
  labelOverlay.classList.remove("is-on");
  if (wasOpen && !labelOverlay.hidden) foldLabelCells();
  window.clearTimeout(labelOverlayTimer);
  if (wasOpen && !labelOverlay.hidden) {
    labelOverlayTimer = window.setTimeout(() => {
      if (!labelOverlay.classList.contains("is-on")) {
        labelOverlay.hidden = true;
        clearLabelCellMotion();
        setLabelScrollLock(false);
      }
    }, 720);
  } else {
    labelOverlay.hidden = true;
    clearLabelCellMotion();
    setLabelScrollLock(false);
  }
  labelDraft = emptyLabel();
}

function syncModeLocks() {
  const locked = labelling || searching || rearranging || recovering;
  sortEl.disabled = locked;
  if (filterBtn) filterBtn.disabled = locked;
  if (labelBtn) labelBtn.disabled = searching || rearranging || recovering;
  if (searchInput) {
    searchInput.disabled = recovering;
    searchInput.tabIndex = recovering ? -1 : 0;
  }
}

function setLabelling(on) {
  if (on && searching) exitSearchMode();
  if (on && rearranging) exitRearrangeMode();
  labelling = on;
  document.body.classList.toggle("is-labelling", on);
  labelBtn.setAttribute("aria-checked", on ? "true" : "false");
  syncModeLocks();
  if (on) closeFilterMenu();
}

function matchSkinName(names, query) {
  const q = query.trim().toLowerCase();
  if (!q || !names?.length) return "";
  return (
    names.find((name) => name.toLowerCase() === q) ||
    names.find((name) => name.toLowerCase().startsWith(q)) ||
    names.find((name) => name.toLowerCase().includes(q)) ||
    ""
  );
}

function applySearchHits() {
  const query = searching ? searchInput.value : "";
  const hasQuery = searching && Boolean(query.trim());
  document.body.classList.toggle("has-search-query", hasQuery);
  for (const wrap of document.querySelectorAll(".skin-select")) {
    if (wrap.classList.contains("is-disabled")) {
      wrap.classList.remove("is-search-hit");
      continue;
    }
    const hit = hasQuery ? matchSkinName(wrap._searchNames || [], query) : "";
    wrap.classList.toggle("is-search-hit", Boolean(hit));
    wrap._searchHit = hit;
    const button = wrap.querySelector(".skin-trigger");
    if (searching) {
      wrap.classList.toggle("is-selected", Boolean(hit));
      wrap.classList.remove("is-labeled", "is-slanted", "is-bought", "is-underlined");
      wrap.style.removeProperty("--color");
      if (button) button.textContent = hit;
    } else if (button) {
      button.textContent = wrap.dataset.value || "Choose skin";
      syncSelectedState(wrap);
      applySkinLabel(wrap);
    }
  }
}

function enterSearchMode() {
  if (searching || recovering) return;
  if (labelling) exitLabellingMode();
  if (rearranging) exitRearrangeMode();
  searching = true;
  document.body.classList.add("is-searching");
  searchClear.hidden = false;
  syncModeLocks();
  closeSkinMenu();
  closeFilterMenu();
  applySearchHits();
}

function exitSearchMode() {
  if (!searching && !searchInput.value) {
    searchClear.hidden = true;
    return;
  }
  closeShowcase();
  searching = false;
  searchInput.value = "";
  document.body.classList.remove("is-searching", "has-search-query");
  searchClear.hidden = true;
  syncModeLocks();
  applySearchHits();
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
  labelSkinEl.style.textDecoration = labelDraft.underline ? "underline" : "none";
}

function labelDraftDirty() {
  if (!labelDraft.pickId) return false;
  const current = lockerLabels.get(labelDraft.pickId) || emptyLabel();
  const next = normalizeLabel(labelDraft);
  return (
    next.color !== (current.color || "") ||
    next.slant !== Boolean(current.slant) ||
    next.bold !== Boolean(current.bold) ||
    next.underline !== Boolean(current.underline)
  );
}

function syncLabelUpdate() {
  if (!labelUpdateBtn) return;
  const dirty = labelDraftDirty();
  labelUpdateBtn.disabled = !dirty;
}

function paintLabelEditor() {
  const taken = labelDraft.pickId ? takenColorFamilies(labelDraft.pickId) : new Set();
  for (const button of labelEditor.querySelectorAll(".label-choice")) {
    const color = button.dataset.color;
    const slant = button.dataset.toggle === "slant";
    const bold = button.dataset.toggle === "bold";
    const underline = button.dataset.toggle === "underline";
    let on = false;
    if (color) on = labelDraft.color === color;
    else if (slant) on = Boolean(labelDraft.slant);
    else if (bold) on = Boolean(labelDraft.bold);
    else if (underline) on = Boolean(labelDraft.underline);
    button.classList.toggle("is-on", on);
    if (slant || bold || underline) button.setAttribute("aria-checked", on ? "true" : "false");
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
  syncLabelUpdate();
}

function labelOrientation(wrap) {
  const col = Math.max(0, BUCKETS.indexOf(wrap.dataset.bucket));
  const guns = lockerWeaponsInTableOrder();
  let row = guns.findIndex((gun) => gun.uuid === wrap.dataset.weapon);
  if (row < 0) row = 0;
  const growRight = col < 2;
  const growDown = row < 10;
  if (growRight && growDown) return "rd";
  if (growRight && !growDown) return "ru";
  if (!growRight && growDown) return "ld";
  return "lu";
}

function placeLabelWindow(wrap) {
  if (!labelEditor) return;
  const rect = wrap.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  const orient = labelOrientation(wrap);
  const left = orient === "ld" || orient === "lu" ? rect.right - width * 3 : rect.left;
  const top = orient === "ld" || orient === "rd" ? rect.top : rect.bottom - height * 5;
  labelEditor.dataset.orient = orient;
  labelEditor.style.setProperty("--label-cell-w", `${width}px`);
  labelEditor.style.setProperty("--label-cell-h", `${height}px`);
  labelEditor.style.left = `${left}px`;
  labelEditor.style.top = `${top}px`;
}

function openLabelEditor(wrap) {
  const pickId = wrap.dataset.pick;
  if (!pickId || !wrap.dataset.value) return;
  const current = lockerLabels.get(pickId) || emptyLabel();
  labelDraft = {
    pickId,
    color: current.color,
    slant: Boolean(current.slant),
    bold: Boolean(current.bold),
    underline: Boolean(current.underline),
  };
  labelGunEl.textContent = wrap.dataset.weaponName || "";
  labelRarityEl.textContent = rarityCaption(wrap.dataset.bucket);
  labelSkinEl.textContent = wrap.dataset.value;
  window.clearTimeout(labelOverlayTimer);
  setLabelScrollLock(true);
  placeLabelWindow(wrap);
  paintLabelEditor();
  labelOverlay.hidden = false;
  pileLabelCells();
  void labelEditor.offsetWidth;
  placeLabelWindow(wrap);
  pileLabelCells();
  labelOverlay.classList.add("is-on");
  requestAnimationFrame(() => requestAnimationFrame(growLabelCells));
}

function createSelect(options, pickId = "", weaponOrId = "", searchNames = null) {
  const weaponUuid = typeof weaponOrId === "object" && weaponOrId ? weaponOrId.uuid : weaponOrId;
  const weaponName = typeof weaponOrId === "object" && weaponOrId ? weaponOrId.displayName : "";
  const wrap = document.createElement("div");
  wrap.className = "skin-select";
  wrap.dataset.value = "";
  wrap.dataset.pick = pickId;
  wrap.dataset.weaponName = weaponName;
  wrap.dataset.bucket = pickId.includes(":") ? pickId.slice(pickId.lastIndexOf(":") + 1) : "";
  wrap.dataset.weapon = weaponUuid || (pickId.includes(":") ? pickId.slice(0, pickId.lastIndexOf(":")) : "");
  wrap._searchNames = [...new Set((searchNames || options.map((item) => item.name)).filter(Boolean))];

  const button = document.createElement("button");
  button.type = "button";
  button.className = "skin-trigger";
  const saved = pickId ? lockerPicks.get(pickId) || "" : "";
  const list = [...options];
  if (saved && !list.some((item) => item.name === saved)) {
    list.push({ name: saved, themeUuid: "" });
  }

  if (!list.length && !wrap._searchNames.length) {
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
    if (recovering && wrap.classList.contains("is-recover") && !value) button.textContent = "No skins";
    syncSelectedState(wrap);
    remove.hidden = recovering || !value;
    for (const option of menu.querySelectorAll(".skin-option")) {
      const isNone = option.classList.contains("skin-option-none");
      const isActive = recovering && isNone ? !value && wrap.dataset.recoverSet === "1" : Boolean(value) && option.dataset.value === value;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-selected", isActive ? "true" : "false");
    }
    if (pickId) {
      if (recovering && !currentUser) lockerPicks.delete(pickId);
      else if (value) lockerPicks.set(pickId, value);
      else lockerPicks.delete(pickId);
      if (persist && previous !== value) lockerLabels.delete(pickId);
      applySkinLabel(wrap);
      syncSaveButton();
    }
    if (recovering && wrap.classList.contains("is-recover")) {
      wrap.dataset.recoverSet = "1";
      queueRecoverCheck();
    }
    if (persist && !recovering) syncCollectionLocks();
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
    if (searching) {
      if (wrap.classList.contains("is-search-hit") && wrap._searchHit) {
        openShowcase(showcaseItemForHit(wrap.dataset.weapon, wrap._searchHit));
      }
      return;
    }
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
  const shimmer = document.createElement("span");
  shimmer.className = "skin-search-shimmer";
  shimmer.setAttribute("aria-hidden", "true");
  wrap.append(arrow, mark, shimmer);
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
  rebuildShowcaseIndex();
  paintLocker();
}

function syncLockerStick() {
  if (!tableMeta) return;
  document.documentElement.style.setProperty("--locker-meta-h", `${tableMeta.offsetHeight}px`);
  if (!lockerHeadStick || !lockerHeadTable) return;
  if (rearranging) {
    lockerHeadStick.classList.remove("has-more");
    return;
  }
  const gutter = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--locker-gutter")) || 36;
  const stickyTop = gutter + tableMeta.offsetHeight;
  const headRect = lockerHeadTable.getBoundingClientRect();
  lockerHeadStick.classList.toggle("has-more", headRect.top <= stickyTop + 1);
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

  let searchRow = 0;
  for (const group of groups) {
    group.weapons.forEach((weapon, index) => {
      const buckets = skinsForWeapon(weapon, tierByUuid, sequelThemes, themeByUuid, lockerView.sort, sourceIndex);
      const allBuckets = skinsForWeapon(weapon, tierByUuid, sequelThemes, themeByUuid, lockerView.sort, sourceIndex, EXPORT_SOURCES);
      const row = document.createElement("tr");

      if (index === 0) {
        const categoryCell = document.createElement("td");
        categoryCell.className = "rarity";
        categoryCell.rowSpan = group.weapons.length;
        categoryCell.textContent = group.label;
        categoryCell.draggable = true;
        categoryCell.dataset.drag = "category";
        categoryCell.dataset.category = group.category;
        row.append(categoryCell);
      }

      const gunCell = createGunCell(weapon);
      row.append(gunCell);

      BUCKETS.forEach((bucket, col) => {
        const cell = document.createElement("td");
        const select = createSelect(buckets[bucket], `${weapon.uuid}:${bucket}`, weapon, allBuckets[bucket].map((item) => item.name));
        select.style.setProperty("--search-col", col);
        select.style.setProperty("--search-row", searchRow);
        cell.append(select);
        row.append(cell);
      });

      tableBody.append(row);
      searchRow += 1;
    });
  }

  syncCollectionLocks();
  applyAllSkinLabels();
  if (searching) applySearchHits();
  syncLockerStick();
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
  if (!currentUser && lockerLayout === null) lockerLayout = loadLayoutLocal();
  if (lockerCatalog) {
    paintLocker();
    return;
  }
  const { weapons, tiers, themes, source, contracts } = await loadCatalog();
  await preloadWeaponIcons(weapons);
  renderLocker(weapons, tiers, themes, source, contracts);
}

async function restoreLocker(user) {
  lockerHydrated = false;
  applyIdentity(user);
  await loadPicks();
  await loadLockerTable();
}

async function lookupIdentity() {
  const seq = ++identitySeq;
  const username = currentUsername();
  clearFieldError(usernameInput);

  if (sameUser(username)) return;
  if (recovering) exitRecover();

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
    if (recoverPassed) {
      await api("/api/recover/reset", {
        method: "POST",
        body: JSON.stringify({ token: recoverToken, password }),
      });
      passwordInput.value = "";
      exitRecover();
      showSecret(true);
      showAppToast("reset password successful");
      return;
    }
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
document.querySelector(".corner-guns")?.addEventListener("click", (event) => {
  event.preventDefault();
  resetLockerLayout();
});
tableBody?.addEventListener("dragstart", (event) => {
  const cell = event.target.closest("td[data-drag]");
  if (!cell || !tableBody.contains(cell)) return;
  const kind = cell.dataset.drag;
  const category = cell.dataset.category || "";
  const items = cacheRearrangeItems(kind, category);
  const fromId = kind === "category" ? category : cell.dataset.weapon;
  const fromIndex = items.findIndex((item) => item.id === fromId);
  if (fromIndex < 0) return;
  setRearranging(true);
  cell.classList.add("is-rearrange-source");
  const ghost = makeRearrangeGhost(cell);
  lockerDrag = {
    kind,
    category,
    weapon: cell.dataset.weapon || "",
    fromIndex,
    insertIndex: fromIndex,
    items,
    ghost,
  };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", kind);
  const rect = cell.getBoundingClientRect();
  event.dataTransfer.setDragImage(ghost, event.clientX - rect.left, event.clientY - rect.top);
});
tableBody?.addEventListener("dragend", () => {
  lockerDrag = null;
  if (rearranging) exitRearrangeMode();
});
document.addEventListener("dragover", (event) => {
  if (!lockerDrag) return;
  const cell = rearrangeTargetCell(event);
  if (!cell) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  applyRearrangePreview(insertIndexFromY(lockerDrag.items, event.clientY));
});
document.addEventListener("drop", (event) => {
  if (!lockerDrag) return;
  const cell = rearrangeTargetCell(event);
  if (!cell) return;
  event.preventDefault();
  applyRearrangePreview(insertIndexFromY(lockerDrag.items, event.clientY));
  const drag = lockerDrag;
  lockerDrag = null;
  const changed = drag.insertIndex != null && drag.insertIndex !== drag.fromIndex;
  clearRearrangePreview();
  setRearranging(false);
  if (changed) commitRearrange(drag);
});
saveLockerBtn.addEventListener("click", (event) => {
  event.preventDefault();
  saveLocker();
});
exportBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  exportLockerDocx();
});
forgotBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  startRecover();
});
logoutBtn.addEventListener("click", (event) => {
  event.preventDefault();
  requestLogout();
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

async function init() {
  syncLockerStick();
  if (tableMeta && typeof ResizeObserver === "function") {
    new ResizeObserver(syncLockerStick).observe(tableMeta);
  }
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
  if (searching) return;
  if (labelling) exitLabellingMode();
  else enterLabellingMode();
});
searchInput?.addEventListener("focus", enterSearchMode);
searchInput?.addEventListener("pointerdown", enterSearchMode);
searchInput?.addEventListener("input", () => {
  if (!searching) enterSearchMode();
  applySearchHits();
});
searchClear?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  exitSearchMode();
  searchInput.blur();
});
labelUpdateBtn.addEventListener("click", (event) => {
  event.preventDefault();
  if (labelUpdateBtn.disabled || !labelDraft.pickId || !labelDraftDirty()) return;
  const pickId = labelDraft.pickId;
  const next = normalizeLabel(labelDraft);
  if (next.color && takenColorFamilies(pickId).has(labelFamily(next.color))) next.color = "";
  closeLabelWindows();
  if (next.color || next.slant || next.bold || next.underline) lockerLabels.set(pickId, next);
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
  } else if (button.dataset.toggle === "underline") {
    labelDraft.underline = !labelDraft.underline;
  }
  paintLabelEditor();
});
labelOverlay.addEventListener("click", (event) => {
  if (event.target === labelOverlay) closeLabelWindows();
});
showcaseClose?.addEventListener("click", (event) => {
  event.preventDefault();
  closeShowcase();
});
showcaseOverlay?.addEventListener("click", (event) => {
  if (event.target === showcaseOverlay) closeShowcase();
});
showcaseImage?.addEventListener("load", layoutShowcaseInspect);
showcaseKill?.addEventListener("click", playShowcaseKill);
showcasePlay?.addEventListener("click", () => {
  if (!showcaseCurrent?.video || !showcaseVideo) return;
  if (!showcaseVideo.hidden) {
    stopShowcaseVideo();
    return;
  }
  showcaseImage.hidden = true;
  showcaseVideo.hidden = false;
  showcaseInspect.classList.add("is-playing");
  showcaseVideo.src = showcaseCurrent.video;
  setShowcasePlayState(true);
  showcaseVideo.play();
});
showcaseOverlay?.addEventListener("wheel", (event) => {
  if (event.target.closest(".showcase-strip")) {
    event.preventDefault();
    nudgeShowcaseStrip(event.deltaY + event.deltaX);
    return;
  }
  if (event.target.closest(".showcase-inspect") && showcaseVideo?.hidden) return;
  event.preventDefault();
}, { passive: false });
showcaseInspect?.addEventListener("pointerdown", (event) => {
  if (event.target.closest("video")) return;
  if (event.button !== 0 || (showcaseVideo && !showcaseVideo.hidden)) return;
  showcaseInspectState.drag = true;
  showcaseInspectState.px = event.clientX;
  showcaseInspectState.py = event.clientY;
  showcaseInspectState.ox = showcaseInspectState.x;
  showcaseInspectState.oy = showcaseInspectState.y;
  showcaseInspect.classList.add("is-dragging");
  showcaseInspect.setPointerCapture(event.pointerId);
});
showcaseInspect?.addEventListener("pointermove", (event) => {
  if (!showcaseInspectState.drag) return;
  showcaseInspectState.x = showcaseInspectState.ox + (event.clientX - showcaseInspectState.px);
  showcaseInspectState.y = showcaseInspectState.oy + (event.clientY - showcaseInspectState.py);
  applyShowcaseInspect();
});
function endShowcaseDrag(event) {
  if (!showcaseInspectState.drag) return;
  showcaseInspectState.drag = false;
  showcaseInspect.classList.remove("is-dragging");
  try {
    showcaseInspect.releasePointerCapture(event.pointerId);
  } catch {
    /* ignore */
  }
}
showcaseInspect?.addEventListener("pointerup", endShowcaseDrag);
showcaseInspect?.addEventListener("pointercancel", endShowcaseDrag);
showcaseInspect?.addEventListener("wheel", (event) => {
  if (showcaseVideo && !showcaseVideo.hidden) return;
  event.preventDefault();
  const next = showcaseInspectState.scale * (event.deltaY < 0 ? 1.12 : 0.9);
  showcaseInspectState.scale = Math.min(4, Math.max(1, next));
  if (showcaseInspectState.scale === 1) {
    showcaseInspectState.x = 0;
    showcaseInspectState.y = 0;
  }
  applyShowcaseInspect();
}, { passive: false });
showcaseInspect?.addEventListener("dblclick", () => {
  if (showcaseVideo && !showcaseVideo.hidden) {
    stopShowcaseVideo();
    return;
  }
  resetShowcaseInspect();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".meta-input-wrap")) closeWarnTips();
  if (!event.target.closest(".filter-wrap")) closeFilterMenu();
  if (!event.target.closest(".header-profile")) closeThemeMenu();
  if (!event.target.closest(".header-profile")) closeCrosshairPanel();
  if (!openSkinSelect) return;
  if (openSkinSelect.wrap.contains(event.target) || openSkinSelect.shell.contains(event.target)) return;
  closeSkinMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWarnTips();
    closeSkinMenu();
    closeFilterMenu();
    closeThemeMenu();
    closeCrosshairPanel();
    if (showcaseOverlay && !showcaseOverlay.hidden) closeShowcase();
    else if (!labelOverlay.hidden) closeLabelWindows();
    else if (labelling) exitLabellingMode();
  }
});

window.addEventListener(
  "scroll",
  (event) => {
    syncLockerStick();
    if (!openSkinSelect) return;
    if (event.target === openSkinSelect.menu || openSkinSelect.menu.contains(event.target)) return;
    closeSkinMenu();
  },
  true
);

window.addEventListener("resize", () => {
  closeSkinMenu();
  syncLockerStick();
  if (showcaseOverlay && !showcaseOverlay.hidden) layoutShowcaseInspect();
});

init();
