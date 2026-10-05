const THEME_LABELS = { green: "Green", dark: "Dark", light: "Light" };

function closeThemeMenu() {
  const themeMenu = document.getElementById("theme-menu");
  const themeTrigger = document.getElementById("theme-current");
  if (!themeMenu || !themeTrigger) return;
  themeMenu.hidden = true;
  themeTrigger.setAttribute("aria-expanded", "false");
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
  const themeMenu = document.getElementById("theme-menu");
  if (themeTrigger) {
    themeTrigger.className = `theme-swatch theme-current theme-swatch-${theme}`;
    themeTrigger.setAttribute("aria-label", `Color: ${THEME_LABELS[theme]}`);
  }
  for (const swatch of themeMenu?.querySelectorAll(".theme-swatch") || []) {
    swatch.classList.toggle("is-on", swatch.dataset.theme === theme);
  }
  closeThemeMenu();
}

const themeTrigger = document.getElementById("theme-current");
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
  if (!event.target.closest(".theme-switch")) closeThemeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeThemeMenu();
});

try {
  applyTheme(localStorage.getItem("valocker-theme") || "green");
} catch {
  applyTheme("green");
}
