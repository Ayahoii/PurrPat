'use strict';

// ------------------------------------------------------------------
// PurrPat � i18n engine
//
// Os arquivos de tradu��o ficam em  renderer/locales/<lang>.js
// Cada arquivo registra suas strings em  window._purrpatLocales['lang']
// ANTES de este script ser carregado.
//
// Uso:
//   t('chave')
//   t('chave', { param: valor })
//
// Atributos HTML suportados:
//   data-i18n              ? element.textContent
//   data-i18n-html         ? element.innerHTML
//   data-i18n-placeholder  ? element.placeholder
//   data-i18n-title        ? element.title
// ------------------------------------------------------------------

// Fallback: garante que o objeto global existe mesmo se algum locale
// n�o carregou (ex: arquivo ausente).
window._purrpatLocales = window._purrpatLocales || {};

// Idioma padr�o � deve coincidir com um arquivo em locales/
const DEFAULT_LANG = 'pt-BR';

// -- Estado --------------------------------------------------------
let _currentLang = localStorage.getItem('purrpat-lang') || DEFAULT_LANG;

// -- Tradu��o com interpola��o {param} ----------------------------
function t(key, params) {
  const dict     = _purrpatLocales[_currentLang];
  const fallback = _purrpatLocales[DEFAULT_LANG];
  let str = (dict && dict[key]) || (fallback && fallback[key]) || key;

  if (params) {
    Object.keys(params).forEach((k) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
  }
  return str;
}

// -- Getters ------------------------------------------------------
function getLang()   { return _currentLang; }

/** Retorna o locale BCP-47 para Intl / toLocaleString */
function getLocale() {
  if (_currentLang === 'pt-BR') return 'pt-BR';
  if (_currentLang === 'en-US') return 'en-US';
  return _currentLang;
}

// -- Aplicar tradu��es ao DOM --------------------------------------
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  _syncLangSelect();
}

function _syncLangSelect() {
  const select = document.getElementById('lang-select');
  if (select) select.value = _currentLang;
}

// -- Trocar idioma ------------------------------------------------
function setLang(lang) {
  if (!_purrpatLocales[lang]) {
    console.warn(`[i18n] Locale "${lang}" n�o encontrado.`);
    return;
  }
  _currentLang = lang;
  localStorage.setItem('purrpat-lang', lang);
  document.documentElement.lang = lang;
  applyTranslations();

  // Re-renderiza conte�do din�mico se o app j� estiver inicializado
  if (typeof App !== 'undefined') {
    if (App._currentStatus) App.dashboard.updateStatus(App._currentStatus);
    if (App._allUsers)       App.users.render(App._allUsers);
  }
}

// -- Inicializa��o ------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = _currentLang;
  applyTranslations();
});

// -- API p�blica --------------------------------------------------
window.i18n = { t, getLang, getLocale, setLang, applyTranslations };

// Atalho global para conveni�ncia (usado em app.js como t(...))
window.t = t;
