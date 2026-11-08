/* 화면 환경 설정 (테마 · 화면 모드 · 글자 크기) — 브라우저 로컬 저장소에만 저장합니다. */
window.MMSD = window.MMSD || {};

MMSD.settings = (function () {
  /* 계정마다 설정 저장 이름이 달라요. 첫 계정(예전 설정)은 'mmsd.settings.v1' */
  let KEY = 'mmsd.settings.v1';
  const MODES = ['system', 'light', 'dark'];
  const SCALES = [90, 100, 112, 125];

  function load() {
    const s = { defaultTheme: 'pink', pageThemes: {}, mode: 'system', fontScale: 100 };
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return s;
      const p = JSON.parse(raw);
      if (typeof p.defaultTheme === 'string') s.defaultTheme = p.defaultTheme;
      if (p.pageThemes && typeof p.pageThemes === 'object') s.pageThemes = p.pageThemes;
      if (MODES.indexOf(p.mode) >= 0) s.mode = p.mode;
      if (SCALES.indexOf(p.fontScale) >= 0) s.fontScale = p.fontScale;
    } catch (e) { /* 기본값 사용 */ }
    return s;
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    MODES: MODES,
    SCALES: SCALES,
    get: function () { return state; },
    /* 로그인한 계정의 설정으로 바꾸기 */
    use: function (key) {
      KEY = key;
      state = load();
    },
    /* 계정 삭제용 */
    destroy: function (key) {
      try { localStorage.removeItem(key); } catch (e) { /* 무시 */ }
    },
    setDefaultTheme: function (id) {
      state.defaultTheme = id;
      return save();
    },
    /* id가 비어 있으면 '기본 테마 따르기'로 되돌립니다. */
    setPageTheme: function (page, id) {
      if (id) state.pageThemes[page] = id;
      else delete state.pageThemes[page];
      return save();
    },
    setMode: function (m) {
      if (MODES.indexOf(m) < 0) return false;
      state.mode = m;
      return save();
    },
    setFontScale: function (n) {
      if (SCALES.indexOf(n) < 0) return false;
      state.fontScale = n;
      return save();
    }
  };
})();

/* 화면 모드(다크 모드) · 글자 크기 적용 */
MMSD.display = (function () {
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function apply() {
    const s = MMSD.settings.get();
    const dark = s.mode === 'dark' || (s.mode === 'system' && mq && mq.matches);
    document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
    document.documentElement.style.fontSize = s.fontScale + '%';
  }
  if (mq) {
    const onChange = function () { if (MMSD.settings.get().mode === 'system') apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
  apply();
  return { apply: apply };
})();
