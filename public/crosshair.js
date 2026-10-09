const XH_COLORS = {
  0: "#FFFFFF",
  1: "#00FF00",
  2: "#7FFF00",
  3: "#DFFF00",
  4: "#FFFF00",
  5: "#00FFFF",
  6: "#FF00FF",
  7: "#FF0000",
};
const XH_UNIT = 2;
const XH_STORE = "valocker-crosshair";
const XH_PASSTHROUGH = ["f", "s", "p", "0m", "0f", "0s", "0e", "1m", "1f", "1s", "1e"];

function defaultCrosshair() {
  return {
    mode: "custom",
    color: 0,
    customHex: "FFFFFF",
    outlines: true,
    outlineOpacity: 0.5,
    outlineThickness: 1,
    centerDot: false,
    centerDotOpacity: 1,
    centerDotThickness: 2,
    inner: { show: true, opacity: 0.8, length: 6, lengthV: 6, linked: true, thickness: 2, offset: 3 },
    outer: { show: true, opacity: 0.35, length: 2, lengthV: 2, linked: true, thickness: 2, offset: 10 },
    extra: {},
  };
}

function xhBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === 1 || value === "1";
}

function xhNum(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function xhHex(value) {
  const raw = String(value || "").replace("#", "").trim().toUpperCase();
  return /^[0-9A-F]{6}$/.test(raw) ? raw : "FFFFFF";
}

function parseCrosshairCode(raw) {
  const tokens = String(raw || "").trim().split(";").filter((part) => part !== "");
  let i = 0;
  if (tokens[0] === "0") i = 1;
  let section = "G";
  const primary = {};
  while (i < tokens.length) {
    const key = tokens[i];
    if (key === "P" || key === "A" || key === "S") {
      section = key;
      i += 1;
      continue;
    }
    const val = tokens[i + 1];
    if (val === undefined) break;
    if (section === "P") primary[key] = val;
    i += 2;
  }
  const next = defaultCrosshair();
  next.mode = "custom";
  next.color = xhNum(primary.c, 0, 0, 8);
  next.customHex = xhHex(primary.u);
  next.outlines = xhBool(primary.h, true);
  next.outlineOpacity = xhNum(primary.o, 0.5, 0, 1);
  next.outlineThickness = xhNum(primary.t, 1, 1, 6);
  next.centerDot = xhBool(primary.d, false);
  next.centerDotOpacity = xhNum(primary.a, 1, 0, 1);
  next.centerDotThickness = xhNum(primary.z, 2, 1, 6);
  next.inner.show = xhBool(primary["0b"], true);
  next.inner.opacity = xhNum(primary["0a"], 0.8, 0, 1);
  next.inner.length = xhNum(primary["0l"], 6, 0, 20);
  next.inner.linked = xhBool(primary["0g"], true);
  next.inner.lengthV = xhNum(primary["0v"], next.inner.length, 0, 20);
  next.inner.thickness = xhNum(primary["0t"], 2, 0, 10);
  next.inner.offset = xhNum(primary["0o"], 3, 0, 20);
  next.outer.show = xhBool(primary["1b"], true);
  next.outer.opacity = xhNum(primary["1a"], 0.35, 0, 1);
  next.outer.length = xhNum(primary["1l"], 2, 0, 20);
  next.outer.linked = xhBool(primary["1g"], true);
  next.outer.lengthV = xhNum(primary["1v"], next.outer.length, 0, 20);
  next.outer.thickness = xhNum(primary["1t"], 2, 0, 10);
  next.outer.offset = xhNum(primary["1o"], 10, 0, 40);
  next.extra = {};
  for (const key of XH_PASSTHROUGH) {
    if (primary[key] !== undefined) next.extra[key] = String(primary[key]);
  }
  return next;
}

function encodeCrosshairCode(spec) {
  const pairs = [
    ["c", spec.color],
    ["u", `#${xhHex(spec.customHex)}`],
    ["h", spec.outlines ? 1 : 0],
    ["o", Number(spec.outlineOpacity.toFixed(3))],
    ["t", spec.outlineThickness],
    ["d", spec.centerDot ? 1 : 0],
    ["a", Number(spec.centerDotOpacity.toFixed(3))],
    ["z", spec.centerDotThickness],
    ["0b", spec.inner.show ? 1 : 0],
    ["0a", Number(spec.inner.opacity.toFixed(3))],
    ["0l", spec.inner.length],
    ["0g", spec.inner.linked ? 1 : 0],
    ["0v", spec.inner.linked ? spec.inner.length : spec.inner.lengthV],
    ["0t", spec.inner.thickness],
    ["0o", spec.inner.offset],
    ["1b", spec.outer.show ? 1 : 0],
    ["1a", Number(spec.outer.opacity.toFixed(3))],
    ["1l", spec.outer.length],
    ["1g", spec.outer.linked ? 1 : 0],
    ["1v", spec.outer.linked ? spec.outer.length : spec.outer.lengthV],
    ["1t", spec.outer.thickness],
    ["1o", spec.outer.offset],
  ];
  for (const key of XH_PASSTHROUGH) {
    if (spec.extra[key] !== undefined) pairs.push([key, spec.extra[key]]);
  }
  return `0;P;${pairs.flat().join(";")}`;
}

function crosshairFill(spec) {
  if (spec.color === 8) return `#${xhHex(spec.customHex)}`;
  return XH_COLORS[spec.color] || XH_COLORS[0];
}

function renderCrosshair(host, spec) {
  if (!host) return;
  host.replaceChildren();
  const color = crosshairFill(spec);
  const outline = spec.outlines ? `${spec.outlineThickness}px` : "0px";
  const outlineA = spec.outlines ? spec.outlineOpacity : 0;

  const addPiece = (left, top, width, height, opacity) => {
    if (width <= 0 || height <= 0) return;
    const el = document.createElement("div");
    el.className = "crosshair-piece";
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.setProperty("--xh-color", color);
    el.style.setProperty("--xh-opacity", String(opacity));
    el.style.setProperty("--xh-outline", outline);
    el.style.setProperty("--xh-outline-a", String(outlineA));
    host.append(el);
  };

  const paintLines = (lines) => {
    if (!lines.show) return;
    const thick = lines.thickness * XH_UNIT;
    const lenH = lines.length * XH_UNIT;
    const lenV = (lines.linked ? lines.length : lines.lengthV) * XH_UNIT;
    const gap = lines.offset * XH_UNIT;
    addPiece(gap, -thick / 2, lenH, thick, lines.opacity);
    addPiece(-(gap + lenH), -thick / 2, lenH, thick, lines.opacity);
    addPiece(-thick / 2, -(gap + lenV), thick, lenV, lines.opacity);
    addPiece(-thick / 2, gap, thick, lenV, lines.opacity);
  };

  paintLines(spec.inner);
  paintLines(spec.outer);
  if (spec.centerDot) {
    const size = spec.centerDotThickness * XH_UNIT;
    addPiece(-size / 2, -size / 2, size, size, spec.centerDotOpacity);
  }
}

const crosshairToggle = document.getElementById("crosshair-toggle");
const crosshairPanel = document.getElementById("crosshair-panel");
const crosshairPreview = document.getElementById("crosshair-preview");
const crosshairHud = document.getElementById("crosshair-hud");
const xhFields = {
  color: document.getElementById("xh-color"),
  hex: document.getElementById("xh-hex"),
  hexRow: document.getElementById("xh-hex-row"),
  outline: document.getElementById("xh-outline"),
  outlineA: document.getElementById("xh-outline-a"),
  outlineT: document.getElementById("xh-outline-t"),
  dot: document.getElementById("xh-dot"),
  dotA: document.getElementById("xh-dot-a"),
  dotT: document.getElementById("xh-dot-t"),
  inOn: document.getElementById("xh-in-on"),
  inA: document.getElementById("xh-in-a"),
  inL: document.getElementById("xh-in-l"),
  inG: document.getElementById("xh-in-g"),
  inV: document.getElementById("xh-in-v"),
  inVRow: document.getElementById("xh-in-v-row"),
  inT: document.getElementById("xh-in-t"),
  inO: document.getElementById("xh-in-o"),
  outOn: document.getElementById("xh-out-on"),
  outA: document.getElementById("xh-out-a"),
  outL: document.getElementById("xh-out-l"),
  outG: document.getElementById("xh-out-g"),
  outV: document.getElementById("xh-out-v"),
  outVRow: document.getElementById("xh-out-v-row"),
  outT: document.getElementById("xh-out-t"),
  outO: document.getElementById("xh-out-o"),
  code: document.getElementById("xh-code"),
  profile: document.getElementById("xh-profile"),
  profileAdd: document.getElementById("xh-profile-add"),
};
let crosshair = defaultCrosshair();
let xhBundle = defaultCrosshairBundle();
let crosshairOverText = false;
let xhSaveTimer = 0;

function defaultCrosshairBundle() {
  const first = defaultCrosshair();
  delete first.mode;
  first.name = "Profile 1";
  const second = defaultCrosshair();
  delete second.mode;
  second.name = "Profile 2";
  return { mode: "custom", active: 0, profiles: [first, second] };
}

function specFromProfile(profile) {
  const base = defaultCrosshair();
  return {
    ...base,
    ...profile,
    mode: xhBundle.mode,
    inner: { ...base.inner, ...(profile.inner || {}) },
    outer: { ...base.outer, ...(profile.outer || {}) },
    extra: profile.extra && typeof profile.extra === "object" ? profile.extra : {},
    name: profile.name,
  };
}

function writeActiveProfile() {
  const index = Math.min(xhBundle.active, xhBundle.profiles.length - 1);
  const { mode, ...spec } = crosshair;
  xhBundle.mode = mode;
  xhBundle.active = index;
  xhBundle.profiles[index] = { ...spec, name: xhBundle.profiles[index]?.name || `Profile ${index + 1}` };
}

function adoptCrosshairBundle(raw) {
  const fresh = defaultCrosshairBundle();
  if (!raw || typeof raw !== "object") {
    xhBundle = fresh;
    crosshair = specFromProfile(xhBundle.profiles[0]);
    crosshair.mode = "custom";
    return;
  }
  if (Array.isArray(raw.profiles) && raw.profiles.length) {
    xhBundle = {
      mode: raw.mode === "default" ? "default" : "custom",
      active: xhNum(raw.active, 0, 0, Math.min(7, raw.profiles.length - 1)),
      profiles: raw.profiles.slice(0, 8).map((item, index) => {
        const spec = specFromProfile({ ...fresh.profiles[0], ...item });
        delete spec.mode;
        spec.name = String(item?.name || `Profile ${index + 1}`).slice(0, 24);
        return spec;
      }),
    };
    if (xhBundle.profiles.length < 2) {
      const extra = defaultCrosshair();
      delete extra.mode;
      extra.name = "Profile 2";
      xhBundle.profiles.push(extra);
    }
  } else {
    const spec = specFromProfile({ ...fresh.profiles[0], ...raw });
    delete spec.mode;
    spec.name = "Profile 1";
    xhBundle = { mode: "custom", active: 0, profiles: [spec, fresh.profiles[1]] };
  }
  const active = xhBundle.profiles[xhBundle.active] || xhBundle.profiles[0];
  crosshair = specFromProfile(active);
  crosshair.mode = xhBundle.mode;
}

function xhUsername() {
  try {
    if (typeof currentUser !== "undefined" && currentUser?.username) {
      return String(currentUser.username).trim().toLowerCase();
    }
    if (typeof currentUsername === "function") {
      const name = String(currentUsername() || "").trim().toLowerCase();
      if (name) return name;
    }
    return (localStorage.getItem("valocker-username") || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function crosshairStorageKey() {
  const name = xhUsername();
  return name ? `${XH_STORE}:${name}` : XH_STORE;
}

function fillCrosshairProfiles() {
  if (!xhFields.profile) return;
  xhFields.profile.replaceChildren();
  xhBundle.profiles.forEach((profile, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = profile.name || `Profile ${index + 1}`;
    xhFields.profile.append(option);
  });
  xhFields.profile.value = String(xhBundle.active);
  if (xhFields.profileAdd) xhFields.profileAdd.disabled = xhBundle.profiles.length >= 8;
}

function closeCrosshairPanel() {
  if (!crosshairPanel || !crosshairToggle || crosshairPanel.hidden) return;
  crosshairPanel.hidden = true;
  crosshairToggle.setAttribute("aria-expanded", "false");
  document.documentElement.classList.remove("is-xh-panel");
  if (typeof syncProfileOpen === "function") syncProfileOpen();
}

function persistCrosshair() {
  writeActiveProfile();
  const payload = { ...xhBundle, mode: crosshair.mode };
  try {
    localStorage.setItem(crosshairStorageKey(), JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  const onLocker = Boolean(document.getElementById("locker-wrap"));
  if (onLocker && (typeof currentUser === "undefined" || !currentUser)) return;
  window.clearTimeout(xhSaveTimer);
  xhSaveTimer = window.setTimeout(() => {
    const req =
      typeof api === "function"
        ? api("/api/picks", { method: "POST", body: JSON.stringify({ crosshair: payload }) })
        : fetch("/api/picks", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ crosshair: payload }),
          });
    Promise.resolve(req).catch(() => {});
  }, 400);
}

function syncCrosshairFields() {
  if (!xhFields.color) return;
  xhFields.color.value = String(crosshair.color);
  xhFields.hex.value = `#${xhHex(crosshair.customHex)}`;
  xhFields.hexRow.hidden = crosshair.color !== 8;
  xhFields.outline.checked = crosshair.outlines;
  xhFields.outlineA.value = String(crosshair.outlineOpacity);
  xhFields.outlineT.value = String(crosshair.outlineThickness);
  xhFields.dot.checked = crosshair.centerDot;
  xhFields.dotA.value = String(crosshair.centerDotOpacity);
  xhFields.dotT.value = String(crosshair.centerDotThickness);
  xhFields.inOn.checked = crosshair.inner.show;
  xhFields.inA.value = String(crosshair.inner.opacity);
  xhFields.inL.value = String(crosshair.inner.length);
  xhFields.inG.checked = crosshair.inner.linked;
  xhFields.inV.value = String(crosshair.inner.lengthV);
  xhFields.inVRow.hidden = crosshair.inner.linked;
  xhFields.inT.value = String(crosshair.inner.thickness);
  xhFields.inO.value = String(crosshair.inner.offset);
  xhFields.outOn.checked = crosshair.outer.show;
  xhFields.outA.value = String(crosshair.outer.opacity);
  xhFields.outL.value = String(crosshair.outer.length);
  xhFields.outG.checked = crosshair.outer.linked;
  xhFields.outV.value = String(crosshair.outer.lengthV);
  xhFields.outVRow.hidden = crosshair.outer.linked;
  xhFields.outT.value = String(crosshair.outer.thickness);
  xhFields.outO.value = String(crosshair.outer.offset);
  xhFields.code.value = encodeCrosshairCode(crosshair);
  fillCrosshairProfiles();
  for (const button of crosshairPanel?.querySelectorAll("[data-xh-mode]") || []) {
    button.classList.toggle("is-on", button.dataset.xhMode === crosshair.mode);
  }
}

function readCrosshairFields() {
  crosshair.color = xhNum(xhFields.color.value, 0, 0, 8);
  crosshair.customHex = xhHex(xhFields.hex.value);
  crosshair.outlines = xhFields.outline.checked;
  crosshair.outlineOpacity = xhNum(xhFields.outlineA.value, 0.5, 0, 1);
  crosshair.outlineThickness = xhNum(xhFields.outlineT.value, 1, 1, 6);
  crosshair.centerDot = xhFields.dot.checked;
  crosshair.centerDotOpacity = xhNum(xhFields.dotA.value, 1, 0, 1);
  crosshair.centerDotThickness = xhNum(xhFields.dotT.value, 2, 1, 6);
  crosshair.inner.show = xhFields.inOn.checked;
  crosshair.inner.opacity = xhNum(xhFields.inA.value, 0.8, 0, 1);
  crosshair.inner.length = xhNum(xhFields.inL.value, 6, 0, 20);
  crosshair.inner.linked = xhFields.inG.checked;
  crosshair.inner.lengthV = xhNum(xhFields.inV.value, crosshair.inner.length, 0, 20);
  if (crosshair.inner.linked) crosshair.inner.lengthV = crosshair.inner.length;
  crosshair.inner.thickness = xhNum(xhFields.inT.value, 2, 0, 10);
  crosshair.inner.offset = xhNum(xhFields.inO.value, 3, 0, 20);
  crosshair.outer.show = xhFields.outOn.checked;
  crosshair.outer.opacity = xhNum(xhFields.outA.value, 0.35, 0, 1);
  crosshair.outer.length = xhNum(xhFields.outL.value, 2, 0, 20);
  crosshair.outer.linked = xhFields.outG.checked;
  crosshair.outer.lengthV = xhNum(xhFields.outV.value, crosshair.outer.length, 0, 20);
  if (crosshair.outer.linked) crosshair.outer.lengthV = crosshair.outer.length;
  crosshair.outer.thickness = xhNum(xhFields.outT.value, 2, 0, 10);
  crosshair.outer.offset = xhNum(xhFields.outO.value, 10, 0, 40);
}

function isCrosshairTextTarget(node) {
  if (!node || node === document.body || node === document.documentElement) return false;
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag !== "INPUT") return false;
  const type = (el.type || "text").toLowerCase();
  return !["button", "submit", "checkbox", "radio", "range", "color", "file", "reset", "image"].includes(type);
}

function applyCrosshair() {
  const on = crosshair.mode === "custom";
  document.body.classList.toggle("is-crosshair", on);
  renderCrosshair(crosshairPreview, crosshair);
  renderCrosshair(crosshairHud, crosshair);
  if (crosshairHud) crosshairHud.hidden = !on || crosshairOverText;
  persistCrosshair();
}

function setCrosshairMode(mode) {
  crosshair.mode = mode === "custom" ? "custom" : "default";
  syncCrosshairFields();
  applyCrosshair();
}

function loadCrosshair(saved) {
  if (saved && typeof saved === "object") {
    adoptCrosshairBundle(saved);
  } else {
    try {
      adoptCrosshairBundle(JSON.parse(localStorage.getItem(crosshairStorageKey()) || "null"));
    } catch {
      adoptCrosshairBundle(null);
    }
  }
  syncCrosshairFields();
  applyCrosshair();
}

crosshairToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!crosshairPanel) return;
  const open = crosshairPanel.hidden;
  crosshairPanel.hidden = !open;
  crosshairToggle.setAttribute("aria-expanded", open ? "true" : "false");
  document.documentElement.classList.toggle("is-xh-panel", open);
  if (typeof syncProfileOpen === "function") syncProfileOpen();
});

crosshairPanel?.addEventListener("click", (event) => {
  const modeBtn = event.target.closest("[data-xh-mode]");
  if (modeBtn) setCrosshairMode(modeBtn.dataset.xhMode);
});

crosshairPanel?.addEventListener("input", (event) => {
  if (event.target === xhFields.code || event.target === xhFields.profile) return;
  readCrosshairFields();
  syncCrosshairFields();
  applyCrosshair();
});

document.getElementById("xh-apply")?.addEventListener("click", () => {
  try {
    const next = parseCrosshairCode(xhFields.code.value);
    next.mode = "custom";
    next.extra = { ...crosshair.extra, ...next.extra };
    crosshair = next;
    writeActiveProfile();
    syncCrosshairFields();
    applyCrosshair();
  } catch {
    /* keep current */
  }
});

xhFields.profile?.addEventListener("change", () => {
  writeActiveProfile();
  xhBundle.active = xhNum(xhFields.profile.value, 0, 0, xhBundle.profiles.length - 1);
  crosshair = specFromProfile(xhBundle.profiles[xhBundle.active]);
  syncCrosshairFields();
  applyCrosshair();
});

xhFields.profileAdd?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (xhBundle.profiles.length >= 8) return;
  writeActiveProfile();
  const next = defaultCrosshair();
  delete next.mode;
  next.name = `Profile ${xhBundle.profiles.length + 1}`;
  xhBundle.profiles.push(next);
  xhBundle.active = xhBundle.profiles.length - 1;
  crosshair = specFromProfile(next);
  syncCrosshairFields();
  applyCrosshair();
});

xhFields.code?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("xh-apply")?.click();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-profile")) closeCrosshairPanel();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCrosshairPanel();
});

document.addEventListener("pointermove", (event) => {
  if (!crosshairHud || crosshair.mode !== "custom") return;
  crosshairHud.style.left = `${event.clientX}px`;
  crosshairHud.style.top = `${event.clientY}px`;
  crosshairOverText = isCrosshairTextTarget(event.target);
  crosshairHud.hidden = crosshairOverText;
});

document.addEventListener("pointerleave", () => {
  if (crosshairHud) crosshairHud.hidden = true;
});

loadCrosshair();

if (!document.getElementById("locker-wrap")) {
  fetch("/api/picks", { credentials: "include" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.crosshair) loadCrosshair(data.crosshair);
    })
    .catch(() => {});
}
