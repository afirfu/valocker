const AGENT_API = "https://valorant-api.com/v1/agents?isPlayableCharacter=true";
const PFP_KEY = "valocker-agent";
const PFP_USER_KEY = "valocker-username";

const profileWrap = document.getElementById("header-profile");
const profileBtn = document.getElementById("profile-pfp");
const profileImg = document.getElementById("profile-pfp-img");
const profileMenu = document.getElementById("profile-menu");
const profileOpen = document.getElementById("profile-open");
const profilePicker = document.getElementById("profile-picker");
const profileGrid = document.getElementById("profile-picker-grid");

let playableAgents = [];
let profileUser = null;
let authKnown = false;
let pfpSaveTimer = 0;

function agentPortrait(agent) {
  return agent?.killfeedPortrait || agent?.minimapPortrait || agent?.displayIcon || "";
}

function hintedUsername() {
  try {
    return (localStorage.getItem(PFP_USER_KEY) || "").trim();
  } catch {
    return "";
  }
}

function displayUsername() {
  if (profileUser?.username) return String(profileUser.username).trim();
  if (!authKnown) return hintedUsername();
  return "";
}

function pfpCanEdit() {
  return Boolean(profileUser?.username);
}

function pfpStorageKey(username = displayUsername()) {
  const name = String(username || "").trim().toLowerCase();
  return name ? `${PFP_KEY}:${name}` : "";
}

function readAgentRecord(username = displayUsername()) {
  const key = pfpStorageKey(username);
  if (!key) return null;
  try {
    const raw = (localStorage.getItem(key) || "").trim();
    if (!raw) return null;
    if (raw.charAt(0) === "{") {
      const parsed = JSON.parse(raw);
      const uuid = String(parsed?.uuid || "").trim();
      if (!uuid) return null;
      return {
        uuid,
        src: String(parsed.src || "").trim(),
        name: String(parsed.name || "").trim(),
      };
    }
    return { uuid: raw, src: "", name: "" };
  } catch {
    return null;
  }
}

function writeAgentRecord(uuid, meta = {}, username = displayUsername()) {
  const key = pfpStorageKey(username);
  const cleaned = String(uuid || "").trim();
  if (!key || !cleaned) return;
  const prev = readAgentRecord(username) || {};
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        uuid: cleaned,
        src: String(meta.src || prev.src || "").trim(),
        name: String(meta.name || prev.name || "").trim(),
      })
    );
  } catch {
    /* ignore */
  }
}

function persistAgent(uuid, meta = {}) {
  if (!pfpCanEdit()) return;
  writeAgentRecord(uuid, meta);
  window.clearTimeout(pfpSaveTimer);
  pfpSaveTimer = window.setTimeout(() => {
    const req =
      typeof api === "function"
        ? api("/api/picks", { method: "POST", body: JSON.stringify({ agent: uuid }) })
        : fetch("/api/picks", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent: uuid }),
          });
    Promise.resolve(req).catch(() => {});
  }, 200);
}

function selectedAgent() {
  const saved = readAgentRecord()?.uuid;
  if (!saved) return null;
  return playableAgents.find((agent) => agent.uuid === saved) || null;
}

function paintPfp() {
  const username = displayUsername();
  const record = username ? readAgentRecord(username) : null;
  const agent = selectedAgent();
  const src = agentPortrait(agent) || record?.src || "";
  const label = agent?.displayName || record?.name || "";
  const hasPfp = Boolean(username && src);
  const waiting = Boolean(username && !src && record?.uuid);
  if (agent && src) writeAgentRecord(agent.uuid, { src, name: agent.displayName }, username);
  profileBtn?.classList.toggle("has-pfp", hasPfp);
  profileBtn?.classList.toggle("is-empty", Boolean(username ? !hasPfp && !waiting : authKnown || !hintedUsername()));
  if (profileImg) {
    profileImg.hidden = !src;
    if (src && profileImg.src !== src) profileImg.src = src;
    else if (!src) profileImg.removeAttribute("src");
    profileImg.alt = label;
  }
  if (profileBtn) {
    profileBtn.setAttribute("aria-label", label ? `Profile, ${label}` : "Profile menu");
  }
  if (profileOpen) {
    profileOpen.disabled = !pfpCanEdit();
    profileOpen.setAttribute("aria-disabled", pfpCanEdit() ? "false" : "true");
  }
  for (const button of profileGrid?.querySelectorAll("[data-agent]") || []) {
    button.classList.toggle("is-on", button.dataset.agent === (agent?.uuid || record?.uuid));
    button.disabled = !pfpCanEdit();
  }
}

function applySavedAgent(uuid) {
  const cleaned = String(uuid || "").trim();
  if (cleaned && displayUsername()) writeAgentRecord(cleaned);
  paintPfp();
}

function syncProfileAuth(user) {
  profileUser = user?.username ? { username: user.username } : null;
  authKnown = true;
  if (!profileUser) closeProfilePicker();
  paintPfp();
}

window.syncProfileAuth = syncProfileAuth;
window.applySavedAgent = applySavedAgent;

function profileExpanded() {
  const xhPanel = document.getElementById("crosshair-panel");
  return (
    Boolean(profileMenu && !profileMenu.hidden) ||
    Boolean(profilePicker && !profilePicker.hidden) ||
    Boolean(xhPanel && !xhPanel.hidden)
  );
}

function syncProfileOpen() {
  const open = profileExpanded();
  profileWrap?.classList.toggle("is-open", open);
  profileBtn?.setAttribute("aria-expanded", open ? "true" : "false");
  document.documentElement.classList.toggle("is-profile-open", open);
}

function closeProfilePicker() {
  if (profilePicker) profilePicker.hidden = true;
}

function closeProfileMenu() {
  if (profileMenu) profileMenu.hidden = true;
  closeProfilePicker();
  closeThemeMenu();
  if (typeof closeCrosshairPanel === "function") closeCrosshairPanel();
  syncProfileOpen();
}

function openProfileMenu() {
  if (!profileMenu) return;
  closeProfilePicker();
  closeThemeMenu();
  if (typeof closeCrosshairPanel === "function") closeCrosshairPanel();
  profileMenu.hidden = false;
  syncProfileOpen();
}

function toggleProfileMenu() {
  if (!profileMenu) return;
  if (profileExpanded()) closeProfileMenu();
  else openProfileMenu();
}

function toggleProfilePicker() {
  if (!profilePicker || !pfpCanEdit()) return;
  const open = profilePicker.hidden;
  closeThemeMenu();
  if (typeof closeCrosshairPanel === "function") closeCrosshairPanel();
  if (open) {
    if (profileMenu) profileMenu.hidden = true;
    profilePicker.hidden = false;
  } else {
    closeProfilePicker();
  }
  syncProfileOpen();
}

function renderAgentGrid() {
  if (!profileGrid) return;
  profileGrid.replaceChildren();
  const current = selectedAgent()?.uuid || readAgentRecord()?.uuid;
  for (const agent of playableAgents) {
    const src = agentPortrait(agent);
    if (!src) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-agent";
    button.dataset.agent = agent.uuid;
    button.setAttribute("aria-label", agent.displayName);
    if (agent.uuid === current) button.classList.add("is-on");
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    img.src = src;
    button.append(img);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!pfpCanEdit()) return;
      persistAgent(agent.uuid, { src, name: agent.displayName });
      paintPfp();
      closeProfileMenu();
    });
    profileGrid.append(button);
  }
}

async function loadAgents() {
  try {
    const response = await fetch(AGENT_API);
    if (!response.ok) throw new Error("agents failed");
    const payload = await response.json();
    playableAgents = (payload.data || [])
      .filter((agent) => agent?.isPlayableCharacter && agentPortrait(agent))
      .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));
  } catch {
    playableAgents = [];
  }
  paintPfp();
  renderAgentGrid();
}

async function bootProfileAuth() {
  if (typeof currentUser !== "undefined" && currentUser?.username) {
    syncProfileAuth(currentUser);
    return;
  }
  try {
    const response = await fetch("/api/session", { credentials: "include", cache: "no-store" });
    const data = response.ok ? await response.json() : {};
    syncProfileAuth(data.user || null);
    if (!data.user?.username) return;
    const picks = await fetch("/api/picks", { credentials: "include", cache: "no-store" });
    if (!picks.ok) return;
    const payload = await picks.json();
    if (payload.agent) applySavedAgent(payload.agent);
  } catch {
    if (!hintedUsername()) syncProfileAuth(null);
  }
}

profileBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleProfileMenu();
});
profileOpen?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleProfilePicker();
});
document.getElementById("crosshair-toggle")?.addEventListener("click", () => {
  if (profileMenu) profileMenu.hidden = true;
  closeProfilePicker();
  closeThemeMenu();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-profile")) closeProfileMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProfileMenu();
});

if (profileWrap) {
  paintPfp();
  loadAgents();
  bootProfileAuth();
}
