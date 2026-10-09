const THEME_LABELS = { green: "Green", dark: "Dark", light: "Light" };

function closeThemeMenu() {
  const themeMenu = document.getElementById("theme-menu");
  const themeTrigger = document.getElementById("theme-open") || document.getElementById("theme-current");
  if (!themeMenu) return;
  themeMenu.hidden = true;
  themeTrigger?.setAttribute("aria-expanded", "false");
}

function applyTheme(theme) {
  if (theme !== "dark" && theme !== "light") theme = "green";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("valocker-theme", theme);
  } catch {
    /* ignore */
  }
  const themeTrigger = document.getElementById("theme-current");
  const themeOpen = document.getElementById("theme-open");
  const themeMenu = document.getElementById("theme-menu");
  if (themeTrigger) {
    themeTrigger.className = `theme-swatch theme-current theme-swatch-${theme}`;
    themeTrigger.setAttribute("aria-label", `Color: ${THEME_LABELS[theme]}`);
  }
  if (themeOpen) themeOpen.setAttribute("aria-label", `Theme: ${THEME_LABELS[theme]}`);
  for (const swatch of themeMenu?.querySelectorAll(".theme-swatch") || []) {
    swatch.classList.toggle("is-on", swatch.dataset.theme === theme);
  }
  closeThemeMenu();
}

const themeTrigger = document.getElementById("theme-open") || document.getElementById("theme-current");
const themeMenu = document.getElementById("theme-menu");

themeTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!themeMenu) return;
  const open = themeMenu.hidden;
  themeMenu.hidden = !open;
  themeTrigger.setAttribute("aria-expanded", open ? "true" : "false");
});
themeMenu?.addEventListener("click", (event) => {
  const swatch = event.target.closest(".theme-swatch");
  if (swatch?.dataset.theme) applyTheme(swatch.dataset.theme);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-profile")) closeThemeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeThemeMenu();
});

try {
  applyTheme(localStorage.getItem("valocker-theme") || "green");
} catch {
  applyTheme("green");
}

function isGreenTheme() {
  const theme = document.documentElement.dataset.theme;
  return theme !== "dark" && theme !== "light";
}

const greenSpot = {
  targetX: 22,
  targetY: 12,
  x: 22,
  y: 12,
  last: 0,
  raf: 0,
};

function paintGreenSpot(x, y) {
  const root = document.documentElement;
  root.style.setProperty("--spot-x", `${x}%`);
  root.style.setProperty("--spot-y", `${y}%`);
}

function tickGreenSpot(now) {
  greenSpot.raf = window.requestAnimationFrame(tickGreenSpot);
  if (!isGreenTheme()) {
    greenSpot.last = now;
    return;
  }
  const dt = Math.min(0.05, (now - (greenSpot.last || now)) / 1000);
  greenSpot.last = now;
  const catchUp = 1 - Math.exp(-0.95 * dt);
  greenSpot.x += (greenSpot.targetX - greenSpot.x) * catchUp;
  greenSpot.y += (greenSpot.targetY - greenSpot.y) * catchUp;
  const t = now / 1000;
  const windX = Math.sin(t * 0.62) * 1.7 + Math.sin(t * 1.18 + 1.1) * 0.65;
  const windY = Math.cos(t * 0.48) * 1.35 + Math.sin(t * 0.92 + 0.4) * 0.55;
  paintGreenSpot(greenSpot.x + windX, greenSpot.y + windY);
}

function followGreenSpot(event) {
  if (!isGreenTheme()) return;
  greenSpot.targetX = (event.clientX / window.innerWidth) * 100;
  greenSpot.targetY = (event.clientY / window.innerHeight) * 100;
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener("pointermove", followGreenSpot, { passive: true });
  greenSpot.raf = window.requestAnimationFrame(tickGreenSpot);
}
