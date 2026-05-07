const THEME_STORAGE_KEY = "activeSegments-theme";
const DARK_THEME = "dark";
const LIGHT_THEME = "light";

const body = document.body;
const toggleButton = document.querySelector("[data-theme-toggle]");
const toggleIcon = toggleButton?.querySelector(".theme-switcher__icon");

const setToggleState = (theme) => {
  if (!toggleButton || !toggleIcon) {
    return;
  }

  const nextTheme = theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
  const nextThemeLabel = nextTheme === LIGHT_THEME ? "light" : "dark";

  toggleButton.dataset.themeTarget = nextTheme;
  toggleButton.setAttribute("aria-label", `Switch to ${nextThemeLabel} mode`);
  toggleButton.setAttribute("aria-pressed", String(theme === DARK_THEME));

  toggleIcon.classList.toggle("i-lucide-sun", nextTheme === LIGHT_THEME);
  toggleIcon.classList.toggle("i-lucide-moon", nextTheme === DARK_THEME);
};

const applyTheme = (theme) => {
  body.dataset.theme = theme;
  body.classList.toggle("theme--dark", theme === DARK_THEME);
  body.classList.toggle("theme--light", theme === LIGHT_THEME);
  setToggleState(theme);
};

const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
const initialTheme = storedTheme === LIGHT_THEME ? LIGHT_THEME : DARK_THEME;
applyTheme(initialTheme);

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    const theme = toggleButton.dataset.themeTarget === LIGHT_THEME ? LIGHT_THEME : DARK_THEME;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  });
}

