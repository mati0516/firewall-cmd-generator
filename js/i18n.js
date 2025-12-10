let currentLang = "ja";
let translations = {};

async function loadLang(lang) {
  try {
    const res = await fetch(`lang/${lang}.json`);
    translations = await res.json();
    currentLang = lang;
    localStorage.setItem("lang", lang);
    applyTranslations();

    const select = document.getElementById("langSelect");
    if (select) select.value = lang;
  } catch (e) {
    console.error("Failed to load language:", e);
  }
}

function applyTranslations() {
  // 通常テキスト
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (translations[key]) {
      el.textContent = translations[key];
    }
  });

  // placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (translations[key]) {
      el.placeholder = translations[key];
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("lang");
  const initialLang =
    saved || (navigator.language || "").startsWith("ja") ? "ja" : "en";

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
