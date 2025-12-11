const AVAILABLE_LANGS = [
  "ja",
  "en",
  "zh_CN",
  "es",
  "hi",
  "ar",
  "pt",
  "fr",
  "de",
  "it",
  "pl",
  "nl",
  "sv",
  "cs",
  "el",
  "ko"
];

let currentLang = "ja";
let translations = {};
const RTL_LANGS = ["ar"];

function t(key, fallback = "", vars = {}) {
  let text = translations[key];
  if (text === undefined) text = fallback || key;

  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

async function loadLang(lang) {
  try {
    const safeLang = AVAILABLE_LANGS.includes(lang) ? lang : "en";
    if (safeLang !== lang) {
      console.warn(`Unsupported language "${lang}", falling back to "${safeLang}".`);
    }

    const res = await fetch(`lang/${safeLang}.json`);
    translations = await res.json();
    currentLang = safeLang;
    localStorage.setItem("lang", safeLang);
    document.documentElement.lang = safeLang;
    document.documentElement.dir = RTL_LANGS.includes(safeLang) ? "rtl" : "ltr";
    applyTranslations();

    const select = document.getElementById("langSelect");
    if (select) select.value = safeLang;
  } catch (e) {
    console.error("Failed to load language:", e);
    if (lang !== "en") {
      console.warn("Falling back to English.");
      loadLang("en");
    }
  }
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (translations[key]) {
      el.textContent = translations[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (translations[key]) {
      el.placeholder = translations[key];
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("lang");
  const browserLang = (navigator.language || "").toLowerCase();
  const normalizedBrowser = browserLang.replace("-", "_");
  const matchedLang =
    AVAILABLE_LANGS.find(
      (code) =>
        normalizedBrowser === code.toLowerCase() ||
        normalizedBrowser.startsWith(code.toLowerCase()) ||
        (code.includes("_") && normalizedBrowser.startsWith(code.split("_")[0]))
    ) || "en";

  const initialLang = AVAILABLE_LANGS.includes(saved) ? saved : matchedLang;

  loadLang(initialLang);

  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.addEventListener("change", (e) => {
      loadLang(e.target.value);
    });
  }
});

// 他のスクリプトから呼べるようにしておく
window.loadLang = loadLang;
window.applyTranslations = applyTranslations;
window.t = t;
