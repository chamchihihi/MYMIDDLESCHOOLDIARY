/* 테마 시스템: 전체 기본 테마 + 페이지별 개별 테마 */
MMSD.themes = (function () {
  const LIST = [
    { id: 'pink',     name: '파스텔 핑크',      emoji: '🌸' },
    { id: 'blue',     name: '파스텔 블루',      emoji: '🫧' },
    { id: 'vintage',  name: '빈티지',           emoji: '📜' },
    { id: 'colorful', name: '알록달록 캐릭터',  emoji: '🧸' },
    { id: 'minimal',  name: '심플 미니멀',      emoji: '🤍' },
    { id: 'season',   name: '계절별 테마',      emoji: '🍀' }
  ];

  const SEASONS = {
    spring: { name: '봄', emoji: '🌸' },
    summer: { name: '여름', emoji: '🍉' },
    autumn: { name: '가을', emoji: '🍁' },
    winter: { name: '겨울', emoji: '⛄' }
  };

  /* 테마별 홈 장식 스티커 */
  const DECOR = {
    pink: ['🎀', '🌷', '💗'],
    blue: ['🫧', '🐳', '⭐'],
    vintage: ['📮', '🕰️', '🌾'],
    colorful: ['🧸', '🐥', '🍭'],
    minimal: ['✦', '·', '✧'],
    'season-spring': ['🌸', '🐝', '🌱'],
    'season-summer': ['🍉', '🐚', '☀️'],
    'season-autumn': ['🍁', '🌰', '🍂'],
    'season-winter': ['⛄', '❄️', '🧣']
  };

  function currentSeason(date) {
    const m = (date || new Date()).getMonth() + 1;
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    if (m >= 9 && m <= 11) return 'autumn';
    return 'winter';
  }

  function exists(id) { return LIST.some(function (t) { return t.id === id; }); }

  function resolve(id) {
    if (!exists(id)) id = 'pink';
    return id === 'season' ? 'season-' + currentSeason() : id;
  }

  function byId(id) {
    return LIST.find(function (t) { return t.id === id; }) || LIST[0];
  }

  function effectiveFor(page) {
    const s = MMSD.settings.get();
    const own = s.pageThemes[page];
    return exists(own) ? own : (exists(s.defaultTheme) ? s.defaultTheme : 'pink');
  }

  function apply(id) {
    document.documentElement.setAttribute('data-theme', resolve(id));
  }

  function decor(id) { return DECOR[resolve(id)] || DECOR.pink; }

  return {
    list: LIST,
    seasons: SEASONS,
    currentSeason: currentSeason,
    resolve: resolve,
    byId: byId,
    effectiveFor: effectiveFor,
    apply: apply,
    decor: decor
  };
})();
