/* 덕질노트: HOME · 인물 · 작품 · 공연 관람 · 굿즈 · 음악 · 덕질 일기 · 통계 */
(function () {
  const M = window.MMSD;
  const C = M.coll;
  const BASE = 'fandom';

  const TABS = [['home', '🏠 HOME'], ['persons', '🌟 인물'], ['works', '🎭 작품'], ['shows', '🎫 공연 관람'],
    ['goods', '🛍️ 굿즈'], ['music', '🎵 음악'], ['diary', '💖 덕질 일기'], ['stats', '📊 통계']];
  const FIELDS_OF_WORK = ['뮤지컬', '연극', '영화', '드라마', '음악', '기타'];
  const JOBS = ['뮤지컬 배우', '배우', '가수', '아이돌', '연출가·감독', '작곡가', '기타'];
  const GOODS_CATS = ['포토카드', '티켓', '앨범·OST', '프로그램북', '포스터', '응원봉', '키링·뱃지', '의류', '기타'];
  const GOODS_STATUS = ['소장 중', '위시리스트', '양도·판매함'];

  const themeField = function (label) {
    return { k: 'theme', label: label, t: 'select', opts: C.THEME_NAMES, hint: '이 페이지와 목록 카드가 고른 테마로 보여요. "선택 안 함"이면 덕질노트 테마를 따라가요.' };
  };
  const themeOf = function (r) { return C.themeIdByName(r.data.theme); };
  const has = function (arr, id) { return (arr || []).indexOf(id) >= 0; };
  const stars = function (r) { return r.data.rating ? '<span class="badge soft">' + r.data.rating + '</span>' : ''; };

  /* 재관람 계산: 같은 작품(연결된 작품, 없으면 같은 제목)을 날짜순으로 센 순번 */
  function showKey(p) { return (p.data.work || [])[0] || ('t:' + (p.title || '').replace(/\s+/g, '').toLowerCase()); }
  function rewatchMap(shows) {
    const byKey = {}, nth = {}, total = {};
    shows.slice().sort(function (a, b) { return ((a.date || '') + a.createdAt) < ((b.date || '') + b.createdAt) ? -1 : 1; })
      .forEach(function (p) {
        const k = showKey(p);
        byKey[k] = (byKey[k] || 0) + 1;
        nth[p.id] = byKey[k];
      });
    shows.forEach(function (p) { total[p.id] = byKey[showKey(p)]; });
    return { nth: nth, total: total, byKey: byKey };
  }

  /* ---------------- 각 탭 설정 ---------------- */
  let workCounts = {};
  const CFG = {
    persons: {
      type: 'person', label: '인물', emoji: '🌟', add: '인물 추가', round: true,
      fields: [
        { t: 'section', label: '🌟 인물 정보' },
        { k: 'name', label: '인물 이름', t: 'text', top: 'title' },
        { k: 'job', label: '직업', t: 'select', opts: JOBS },
        { k: 'agency', label: '소속', t: 'text' },
        { k: 'birthday', label: '생일', t: 'date', hint: '생일 카운트다운에 쓰여요.' },
        { k: 'firstLiked', label: '처음 관심을 가진 날짜', t: 'date', hint: '덕질 기념일(N주년)을 알려 줘요.' },
        { k: 'fav', label: '⭐ 최애 · 즐겨찾기', t: 'check' },
        { k: 'reason', label: '좋아하게 된 이유', t: 'textarea', full: true },
        { k: 'intro', label: '인물 소개 및 메모', t: 'textarea', full: true },
        { k: 'photos', label: '프로필 이미지 · 사진 앨범', t: 'media', top: 'mediaIds', full: true, hint: '첫 번째 사진이 프로필 이미지가 돼요.' },
        { k: 'works', label: '연결된 작품', t: 'link', of: 'work', full: true, emptyText: '작품 탭에서 작품을 등록하면 여기서 연결할 수 있어요.' },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true },
        { t: 'section', label: '🎨 이 인물 페이지 꾸미기' },
        themeField('인물 테마')
      ],
      sub: function (r) { return [r.data.job, r.data.agency].filter(Boolean).join(' · '); },
      badges: function (r) {
        const n = r.data.birthday ? M.ui.daysToBirthday(r.data.birthday) : null;
        return (n != null && n <= 30 ? '<span class="badge hot">🎂 ' + (n === 0 ? '오늘' : 'D-' + n) + '</span>' : '') +
          (r.data.theme ? '<span class="badge soft">🎨 ' + M.ui.esc(r.data.theme) + '</span>' : '');
      },
      filters: [{ key: 'job', label: '모든 직업', opts: JOBS }, { label: '전체', opts: ['⭐ 즐겨찾기만'], test: function (r) { return !!r.data.fav; } }],
      sort: function (a, b) { return (b.data.fav ? 1 : 0) - (a.data.fav ? 1 : 0) || (a.title || '').localeCompare(b.title || '', 'ko'); },
      theme: themeOf,
      extra: personExtra
    },
    works: {
      type: 'work', label: '작품', emoji: '🎭', add: '작품 추가',
      fields: [
        { t: 'section', label: '🎭 작품 정보' },
        { k: 'title', label: '작품 제목', t: 'text', top: 'title', full: true },
        { k: 'field', label: '분야', t: 'select', opts: FIELDS_OF_WORK },
        { k: 'year', label: '제작 연도', t: 'number', unit: '년' },
        { k: 'producer', label: '제작사', t: 'text' },
        { k: 'watchedDate', label: '관람 날짜', t: 'date', hint: '여러 번 봤다면 "공연 관람" 탭에 하나씩 기록하면 횟수가 자동으로 세져요.' },
        { k: 'photos', label: '포스터 및 이미지', t: 'media', top: 'mediaIds', full: true },
        { k: 'castText', label: '출연진', t: 'textarea', full: true },
        { k: 'cast', label: '출연 인물 연결', t: 'link', of: 'person', full: true, emptyText: '인물 탭에서 인물을 등록하면 여기서 연결할 수 있어요.' },
        { k: 'favChar', label: '좋아하는 캐릭터', t: 'text', full: true },
        { k: 'rating', label: '평점', t: 'choice', opts: C.STARS, full: true },
        { k: 'review', label: '감상문', t: 'textarea', full: true, rows: 6 },
        { k: 'fav', label: '⭐ 즐겨찾기', t: 'check' },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true },
        { t: 'section', label: '🎨 이 작품 페이지 꾸미기' },
        themeField('작품 테마')
      ],
      sub: function (r) { return [r.data.field, r.data.year ? r.data.year + '년' : '', r.data.producer].filter(Boolean).join(' · '); },
      badges: function (r) {
        return stars(r) + (workCounts[r.id] ? '<span class="badge hot">🎫 ' + workCounts[r.id] + '회 관람</span>' : '');
      },
      before: async function () {
        const rw = rewatchMap(await M.db.list('performance'));
        workCounts = rw.byKey;
        return '';
      },
      filters: [{ key: 'field', label: '모든 분야', opts: FIELDS_OF_WORK }, { label: '전체', opts: ['⭐ 즐겨찾기만'], test: function (r) { return !!r.data.fav; } }],
      sort: function (a, b) { return (a.title || '').localeCompare(b.title || '', 'ko'); },
      theme: themeOf,
      extra: workExtra
    },
    shows: {
      type: 'performance', label: '공연 관람', emoji: '🎫', add: '관람 기록 추가',
      fields: [
        { t: 'section', label: '🎫 관람 정보' },
        { k: 'title', label: '공연 제목', t: 'text', top: 'title', full: true },
        { k: 'work', label: '작품 연결 (재관람 횟수 계산에 쓰여요)', t: 'link', of: 'work', full: true, emptyText: '작품을 연결하지 않으면 같은 제목끼리 재관람 횟수를 세요.' },
        { k: 'date', label: '관람 날짜', t: 'date', top: 'date' },
        { k: 'time', label: '관람 시간', t: 'text', ph: '예: 19:30' },
        { k: 'venue', label: '공연장', t: 'text' },
        { k: 'round', label: '관람 회차', t: 'text', ph: '예: 낮공, 막공' },
        { k: 'seat', label: '좌석 및 구역', t: 'text' },
        { k: 'companions', label: '동행인', t: 'text' },
        { k: 'casting', label: '캐스팅', t: 'textarea', full: true },
        { k: 'castLinks', label: '캐스팅 인물 연결', t: 'link', of: 'person', full: true, emptyText: '인물 탭에서 인물을 등록하면 연결할 수 있어요.' },
        { k: 'photos', label: '티켓 사진 · 사진', t: 'media', top: 'mediaIds', full: true },
        { k: 'rating', label: '평점', t: 'choice', opts: C.STARS, full: true },
        { k: 'scenes', label: '기억에 남는 장면', t: 'textarea', full: true },
        { k: 'review', label: '후기', t: 'textarea', full: true, rows: 6 },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
      ],
      newRec: function () { return { date: M.ui.today() }; },
      sub: function (r) { return [M.ui.fmtDate(r.date), r.data.venue, r.data.round].filter(Boolean).join(' · '); },
      sort: function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; },
      custom: function (list, base) {
        return C.cards(Object.assign({}, CFG.shows, {
          badges: function (r) { return stars(r) + (rw.nth[r.id] > 1 ? '<span class="badge hot">🔁 ' + rw.nth[r.id] + '번째 관람</span>' : '<span class="badge soft">첫 관람</span>'); }
        }), base, list);
      },
      before: async function (all) { rw = rewatchMap(all); return ''; },
      extra: showExtra
    },
    goods: {
      type: 'goods', label: '굿즈', emoji: '🛍️', add: '굿즈 추가',
      fields: [
        { k: 'name', label: '굿즈 이름', t: 'text', top: 'title', full: true },
        { k: 'category', label: '종류', t: 'select', opts: GOODS_CATS },
        { k: 'status', label: '소장 여부', t: 'select', opts: GOODS_STATUS },
        { k: 'date', label: '구매 날짜', t: 'date', top: 'date' },
        { k: 'price', label: '가격', t: 'number', unit: '원' },
        { k: 'shop', label: '구매처', t: 'text' },
        { k: 'fav', label: '⭐ 즐겨찾기', t: 'check' },
        { k: 'photos', label: '사진', t: 'media', top: 'mediaIds', full: true },
        { k: 'persons', label: '관련 인물', t: 'link', of: 'person', full: true, emptyText: '인물을 등록하면 연결할 수 있어요.' },
        { k: 'works', label: '관련 작품', t: 'link', of: 'work', full: true, emptyText: '작품을 등록하면 연결할 수 있어요.' },
        { k: 'memo', label: '메모', t: 'textarea', full: true },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
      ],
      sub: function (r) { return [r.data.category, r.data.price ? C.won(r.data.price) : '', r.data.shop].filter(Boolean).join(' · '); },
      badges: function (r) { return r.data.status ? '<span class="badge ' + (r.data.status === '위시리스트' ? 'hot' : 'soft') + '">' + M.ui.esc(r.data.status) + '</span>' : ''; },
      filters: [{ key: 'category', label: '모든 종류', opts: GOODS_CATS }, { key: 'status', label: '소장·위시 전체', opts: GOODS_STATUS }],
      sort: function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; },
      before: function (all) {
        const owned = all.filter(function (g) { return g.data.status !== '위시리스트' && g.data.status !== '양도·판매함'; });
        const wish = all.filter(function (g) { return g.data.status === '위시리스트'; });
        const spent = all.filter(function (g) { return g.data.status !== '위시리스트'; }).reduce(function (s, g) { return s + (Number(g.data.price) || 0); }, 0);
        const count = function (cat) { return owned.filter(function (g) { return g.data.category === cat; }).length; };
        return '<div class="stat-grid card sum-card">' +
          '<div class="stat"><span class="n">' + owned.length + '</span><span class="l">소장품</span></div>' +
          '<div class="stat"><span class="n">' + wish.length + '</span><span class="l">위시리스트</span></div>' +
          '<div class="stat"><span class="n">' + count('포토카드') + '</span><span class="l">포토카드</span></div>' +
          '<div class="stat"><span class="n">' + count('티켓') + '</span><span class="l">티켓</span></div>' +
          '<div class="stat"><span class="n">' + C.won(spent) + '</span><span class="l">총 지출</span></div></div>';
      }
    },
    music: {
      type: 'music', label: '음악', emoji: '🎵', add: '노래 추가',
      fields: [
        { k: 'title', label: '노래 제목', t: 'text', top: 'title', full: true },
        { k: 'kind', label: '구분', t: 'select', opts: ['뮤지컬 넘버', '일반 음악'] },
        { k: 'artist', label: '가수', t: 'text' },
        { k: 'composer', label: '작곡가', t: 'text' },
        { k: 'album', label: '앨범', t: 'text' },
        { k: 'works', label: '관련 작품', t: 'link', of: 'work', full: true, emptyText: '작품을 등록하면 연결할 수 있어요.' },
        { k: 'playlists', label: '플레이리스트', t: 'tags', full: true, hint: '#등교길 #공부할때 처럼 적으면 같은 이름끼리 플레이리스트로 모여요.' },
        { k: 'rating', label: '평점', t: 'choice', opts: C.STARS, full: true },
        { k: 'reason', label: '좋아하는 이유', t: 'textarea', full: true },
        { k: 'memo', label: '메모', t: 'textarea', full: true },
        { k: 'fav', label: '⭐ 즐겨찾기', t: 'check' },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
      ],
      sub: function (r) { return [r.data.kind, r.data.artist, r.data.album].filter(Boolean).join(' · '); },
      badges: function (r) { return stars(r) + (r.data.playlists || []).map(function (p) { return '<span class="badge soft">🎧 ' + M.ui.esc(p) + '</span>'; }).join(''); },
      filters: [{ key: 'kind', label: '뮤지컬 넘버·일반 음악', opts: ['뮤지컬 넘버', '일반 음악'] }],
      sort: function (a, b) { return (a.title || '').localeCompare(b.title || '', 'ko'); },
      before: function (all) {
        const pl = {};
        all.forEach(function (m) { (m.data.playlists || []).forEach(function (p) { (pl[p] = pl[p] || []).push(m); }); });
        const names = Object.keys(pl).sort();
        if (!names.length) return '';
        return '<section class="card tape playlists"><h2 class="sec-title">🎧 플레이리스트</h2>' + names.map(function (n) {
          return '<details><summary><b>' + M.ui.esc(n) + '</b> <small>' + pl[n].length + '곡</small></summary><ol>' +
            pl[n].map(function (m) { return '<li><a href="#/fandom/music/edit/' + m.id + '">' + M.ui.esc(m.title) + (m.data.artist ? ' - ' + M.ui.esc(m.data.artist) : '') + '</a></li>'; }).join('') +
            '</ol></details>';
        }).join('') + '</section>';
      }
    },
    diary: {
      type: 'fandomDiary', label: '덕질 일기', emoji: '💖', add: '덕질 일기 쓰기',
      fields: [
        { k: 'date', label: '날짜', t: 'date', top: 'date' },
        { k: 'title', label: '제목', t: 'text', top: 'title' },
        { k: 'persons', label: '현재 최애 · 관련 인물', t: 'link', of: 'person', full: true, emptyText: '인물을 등록하면 연결할 수 있어요.' },
        { k: 'works', label: '관련 작품', t: 'link', of: 'work', full: true, emptyText: '작품을 등록하면 연결할 수 있어요.' },
        { k: 'mood', label: '기분', t: 'choice', opts: M.forms.OPTS.mood, full: true },
        { k: 'event', label: '덕질 관련 사건', t: 'textarea', full: true },
        { k: 'review', label: '공연 및 작품 감상', t: 'textarea', full: true, rows: 6 },
        { k: 'photos', label: '사진', t: 'media', top: 'mediaIds', full: true },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
      ],
      newRec: function (rest) { return { date: M.ui.today(), data: { persons: rest[0] ? [rest[0]] : [] } }; },
      titleOf: function (r) { return r.title || M.ui.snippet(r.data.event || r.data.review, 24) || '덕질 일기'; },
      sub: function (r) { return [M.ui.fmtDate(r.date), r.data.mood].filter(Boolean).join(' · '); },
      sort: function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; }
    }
  };
  let rw = { nth: {}, total: {}, byKey: {} };

  /* ---------------- 상세 화면 아래 ---------------- */
  function linkList(items, emptyText) {
    if (!items.length) return '<p class="empty">' + emptyText + '</p>';
    return '<ul class="mini-list">' + items.map(function (i) { return '<li><a href="' + i.href + '">' + i.icon + ' ' + M.ui.esc(i.text) + '</a></li>'; }).join('') + '</ul>';
  }
  function gallery(rec) {
    const ids = rec.mediaIds || [];
    if (!ids.length) return '';
    return '<section class="card tape"><h2 class="sec-title">🖼️ 사진첩 <small>' + ids.length + '장</small></h2><div class="gallery">' +
      ids.map(function (id) { return '<div class="g-item"><img data-media="' + M.ui.esc(id) + '" alt=""></div>'; }).join('') + '</div></section>';
  }

  async function personExtra(p) {
    const U = M.ui;
    const [works, shows, diaries, goods] = await Promise.all([M.db.list('work'), M.db.list('performance'), M.db.list('fandomDiary'), M.db.list('goods')]);
    const myWorks = works.filter(function (w) { return has(p.data.works, w.id) || has(w.data.cast, p.id); });
    const myShows = shows.filter(function (s) { return has(s.data.castLinks, p.id); });
    const myDiaries = diaries.filter(function (d) { return has(d.data.persons, p.id); });
    const myGoods = goods.filter(function (g) { return has(g.data.persons, p.id); });
    const bd = p.data.birthday ? U.daysToBirthday(p.data.birthday) : null;
    const fl = U.parse(p.data.firstLiked);
    let anniv = '';
    if (fl) {
      const days = Math.round((U.parse(U.today()) - fl) / 86400000) + 1;
      anniv = '<div class="stat"><span class="n">' + days + '일</span><span class="l">좋아한 지</span></div>';
    }
    return '<section class="card tape-left"><h2 class="sec-title">💗 ' + U.esc(p.title || '인물') + ' 덕질 현황</h2><div class="stat-grid">' +
        (bd != null ? '<div class="stat"><span class="n">' + (bd === 0 ? '🎉 오늘' : 'D-' + bd) + '</span><span class="l">생일까지</span></div>' : '') +
        anniv +
        '<div class="stat"><span class="n">' + myWorks.length + '</span><span class="l">연결된 작품</span></div>' +
        '<div class="stat"><span class="n">' + myShows.length + '</span><span class="l">관람한 공연</span></div>' +
        '<div class="stat"><span class="n">' + myDiaries.length + '</span><span class="l">덕질 일기</span></div>' +
        '<div class="stat"><span class="n">' + myGoods.length + '</span><span class="l">굿즈</span></div>' +
      '</div></section>' +
      gallery(p) +
      '<section class="card"><h2 class="sec-title">🎭 연결된 작품</h2>' +
        linkList(myWorks.map(function (w) { return { href: '#/fandom/works/edit/' + w.id, icon: '🎭', text: w.title }; }), '연결된 작품이 없어요.') +
        '<h2 class="sec-title">🎫 관람한 공연</h2>' +
        linkList(myShows.map(function (s) { return { href: '#/fandom/shows/edit/' + s.id, icon: '🎫', text: U.fmtDate(s.date, false) + ' ' + s.title }; }), '캐스팅에 이 인물을 연결한 관람 기록이 없어요.') +
      '</section>' +
      '<section class="card"><div class="sec-head"><h2 class="sec-title">💖 ' + U.esc(p.title || '') + ' 덕질 일기</h2>' +
        '<a class="btn primary" href="#/fandom/diary/new/' + p.id + '">+ 덕질 일기 쓰기</a></div>' +
        M.timelineHTML(myDiaries.map(function (d) { return { date: d.date, icon: '💖', kind: '덕질 일기', title: d.title, href: '#/fandom/diary/edit/' + d.id }; }), '이 인물과 연결된 덕질 일기가 없어요.') +
      '</section>';
  }

  async function workExtra(w) {
    const U = M.ui;
    const [shows, persons, music, diaries] = await Promise.all([M.db.list('performance'), M.db.list('person'), M.db.list('music'), M.db.list('fandomDiary')]);
    const map = rewatchMap(shows);
    const myShows = shows.filter(function (s) { return has(s.data.work, w.id); }).sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; });
    const cast = persons.filter(function (p) { return has(w.data.cast, p.id) || has(p.data.works, w.id); });
    const songs = music.filter(function (m) { return has(m.data.works, w.id); });
    const dia = diaries.filter(function (d) { return has(d.data.works, w.id); });
    return '<section class="card tape-left"><h2 class="sec-title">🎫 관람 기록 <small>총 ' + myShows.length + '회</small></h2>' +
        linkList(myShows.map(function (s) { return { href: '#/fandom/shows/edit/' + s.id, icon: '🔁 ' + map.nth[s.id] + '회차', text: U.fmtDate(s.date) + (s.data.round ? ' · ' + s.data.round : '') }; }),
          '"공연 관람" 탭에서 이 작품을 연결해 기록하면 관람 횟수가 자동으로 세져요.') +
      '</section>' + gallery(w) +
      '<section class="card"><h2 class="sec-title">🌟 연결된 인물</h2>' +
        linkList(cast.map(function (p) { return { href: '#/fandom/persons/edit/' + p.id, icon: '🌟', text: p.title }; }), '연결된 인물이 없어요.') +
        '<h2 class="sec-title">🎵 관련 음악</h2>' +
        linkList(songs.map(function (m) { return { href: '#/fandom/music/edit/' + m.id, icon: '🎵', text: m.title }; }), '관련 음악이 없어요.') +
        '<h2 class="sec-title">💖 관련 덕질 일기</h2>' +
        linkList(dia.map(function (d) { return { href: '#/fandom/diary/edit/' + d.id, icon: '💖', text: U.fmtDate(d.date, false) + ' ' + d.title }; }), '관련 덕질 일기가 없어요.') +
      '</section>';
  }

  async function showExtra(s) {
    const map = rewatchMap(await M.db.list('performance'));
    return '<section class="card tape-left"><h2 class="sec-title">🔁 재관람 횟수 (자동 계산)</h2><div class="stat-grid">' +
      '<div class="stat"><span class="n">' + (map.nth[s.id] || 1) + '번째</span><span class="l">이번 관람</span></div>' +
      '<div class="stat"><span class="n">' + (map.total[s.id] || 1) + '회</span><span class="l">이 작품 총 관람</span></div></div>' +
      '<p class="fhint">작품을 연결하면 그 작품끼리, 연결하지 않으면 같은 제목끼리 날짜순으로 세요.</p></section>';
  }

  /* ---------------- HOME ---------------- */
  async function homeView(el, head) {
    const U = M.ui, esc = U.esc;
    const [persons, works, shows, goods, diaries, music] = await Promise.all(
      ['person', 'work', 'performance', 'goods', 'fandomDiary', 'music'].map(function (t) { return M.db.list(t); }));
    if (!persons.length && !works.length && !shows.length && !goods.length && !diaries.length && !music.length) {
      el.innerHTML = head + U.empty('💖', '덕질노트가 비어 있어요. 좋아하는 배우나 작품부터 등록해 볼까요?', '#/fandom/persons/new', '+ 인물 등록하기');
      return;
    }
    const recent = function (list, n) { return list.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).slice(0, n); };
    const pcard = function (p) { return C.card(CFG.persons, 'fandom/persons', p); };

    const events = [];
    persons.forEach(function (p) {
      if (U.parse(p.data.birthday)) events.push({ n: U.daysToBirthday(p.data.birthday), text: '🎂 ' + p.title + ' 생일', href: '#/fandom/persons/edit/' + p.id });
      const fl = U.parse(p.data.firstLiked);
      if (fl) {
        const n = U.daysToBirthday(p.data.firstLiked);
        const next = U.parse(U.today());
        next.setDate(next.getDate() + n);
        const years = next.getFullYear() - fl.getFullYear();
        if (years >= 1) events.push({ n: n, text: '💗 ' + p.title + ' 덕질 ' + years + '주년', href: '#/fandom/persons/edit/' + p.id });
      }
    });
    events.sort(function (a, b) { return a.n - b.n; });

    const ym = U.today().slice(0, 7);
    const monthShows = shows.filter(function (s) { return (s.date || '').slice(0, 7) === ym; }).length;
    const monthSpend = goods.filter(function (g) { return (g.date || '').slice(0, 7) === ym && g.data.status !== '위시리스트'; })
      .reduce(function (s, g) { return s + (Number(g.data.price) || 0); }, 0);
    const monthDiary = diaries.filter(function (d) { return (d.date || '').slice(0, 7) === ym; }).length;

    const favs = [].concat(
      works.filter(function (w) { return w.data.fav; }).map(function (w) { return { href: '#/fandom/works/edit/' + w.id, icon: '🎭', text: w.title }; }),
      music.filter(function (m) { return m.data.fav; }).map(function (m) { return { href: '#/fandom/music/edit/' + m.id, icon: '🎵', text: m.title }; }),
      goods.filter(function (g) { return g.data.fav; }).map(function (g) { return { href: '#/fandom/goods/edit/' + g.id, icon: '🛍️', text: g.title }; })
    );

    el.innerHTML = head +
      '<h2 class="sec-title">⭐ 좋아하는 인물</h2>' +
      (persons.some(function (p) { return p.data.fav; }) ? '<div class="item-list">' + persons.filter(function (p) { return p.data.fav; }).map(pcard).join('') + '</div>'
        : '<p class="empty">인물에서 ⭐ 최애를 켜면 여기에 모여요.</p>') +
      '<div class="fandom-grid">' +
        '<section class="card tape"><h2 class="sec-title">📅 이번 달 덕질</h2><div class="stat-grid">' +
          '<div class="stat"><span class="n">' + monthShows + '</span><span class="l">관람</span></div>' +
          '<div class="stat"><span class="n">' + monthDiary + '</span><span class="l">덕질 일기</span></div>' +
          '<div class="stat"><span class="n">' + C.won(monthSpend) + '</span><span class="l">굿즈 지출</span></div></div></section>' +
        '<section class="card tape-left"><h2 class="sec-title">🎂 다가오는 생일 · 기념일</h2>' +
          (events.length ? '<ul class="mini-list">' + events.slice(0, 6).map(function (e) {
            return '<li><a href="' + e.href + '"><b class="dday">' + (e.n === 0 ? '오늘' : 'D-' + e.n) + '</b> ' + esc(e.text) + '</a></li>';
          }).join('') + '</ul>' : '<p class="empty">인물의 생일이나 처음 관심을 가진 날짜를 적으면 알려 줘요.</p>') + '</section>' +
        '<section class="card tape-corner"><h2 class="sec-title">🎫 최근 관람</h2>' +
          linkList(shows.slice(0, 4).map(function (s) { return { href: '#/fandom/shows/edit/' + s.id, icon: '🎫', text: U.fmtDate(s.date, false) + ' ' + s.title }; }), '관람 기록이 없어요.') + '</section>' +
        '<section class="card tape"><h2 class="sec-title">💖 최근 덕질 일기</h2>' +
          linkList(diaries.slice(0, 4).map(function (d) { return { href: '#/fandom/diary/edit/' + d.id, icon: (d.data.mood || '💖').split(' ')[0], text: U.fmtDate(d.date, false) + ' ' + d.title }; }), '덕질 일기가 없어요.') + '</section>' +
        '<section class="card tape-left"><h2 class="sec-title">🆕 최근 등록한 인물 · 작품</h2>' +
          linkList(recent(persons, 3).map(function (p) { return { href: '#/fandom/persons/edit/' + p.id, icon: '🌟', text: p.title }; })
            .concat(recent(works, 3).map(function (w) { return { href: '#/fandom/works/edit/' + w.id, icon: '🎭', text: w.title }; })), '아직 없어요.') + '</section>' +
        '<section class="card tape-corner"><h2 class="sec-title">⭐ 즐겨찾기</h2>' + linkList(favs.slice(0, 8), '즐겨찾기한 작품·음악·굿즈가 없어요.') + '</section>' +
      '</div>';
  }

  /* ---------------- 통계 ---------------- */
  async function statsView(el, head) {
    const U = M.ui, esc = U.esc;
    const [persons, works, shows, goods, diaries, music] = await Promise.all(
      ['person', 'work', 'performance', 'goods', 'fandomDiary', 'music'].map(function (t) { return M.db.list(t); }));
    const map = rewatchMap(shows);
    const workName = {};
    works.forEach(function (w) { workName[w.id] = w.title; });
    const keyLabel = {};
    shows.forEach(function (s) { const k = showKey(s); keyLabel[k] = workName[k] || s.title || '(제목 없음)'; });
    const perWork = Object.keys(map.byKey).map(function (k) { return { label: keyLabel[k], value: map.byKey[k], display: map.byKey[k] + '회' }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 10);

    const interest = persons.map(function (p) {
      const v = works.filter(function (w) { return has(p.data.works, w.id) || has(w.data.cast, p.id); }).length +
        shows.filter(function (s) { return has(s.data.castLinks, p.id); }).length * 2 +
        diaries.filter(function (d) { return has(d.data.persons, p.id); }).length +
        goods.filter(function (g) { return has(g.data.persons, p.id); }).length;
      return { label: p.title || '(이름 없음)', value: v, display: v + '점' };
    }).sort(function (a, b) { return b.value - a.value; }).slice(0, 10);

    const months = C.last12Months();
    const monthShows = months.map(function (m) {
      const n = shows.filter(function (s) { return (s.date || '').slice(0, 7) === m; }).length;
      return { label: m.slice(2).replace('-', '.'), value: n, display: n + '회' };
    });
    const bought = goods.filter(function (g) { return g.data.status !== '위시리스트'; });
    const monthSpend = months.map(function (m) {
      const v = bought.filter(function (g) { return (g.date || '').slice(0, 7) === m; }).reduce(function (s, g) { return s + (Number(g.data.price) || 0); }, 0);
      return { label: m.slice(2).replace('-', '.'), value: v, display: C.won(v) };
    });
    const totalSpend = bought.reduce(function (s, g) { return s + (Number(g.data.price) || 0); }, 0);

    const yearOf = function (r) { return (r.date || r.createdAt || '').slice(0, 4); };
    const years = Array.from(new Set([].concat(shows, diaries, goods, works, persons).map(yearOf).filter(Boolean))).sort();
    const yearRows = years.map(function (y) {
      const c = function (l) { return l.filter(function (r) { return yearOf(r) === y; }).length; };
      return '<tr><th>' + y + '년</th><td>' + c(shows) + '</td><td>' + c(diaries) + '</td><td>' + c(goods) + '</td><td>' + c(works) + '</td><td>' + c(persons) + '</td></tr>';
    }).join('');

    const photos = [];
    [].concat(persons, works, shows, goods, diaries).forEach(function (r) {
      (r.mediaIds || []).forEach(function (id) { photos.push({ id: id, r: r }); });
    });
    const hrefOf = { person: 'persons', work: 'works', performance: 'shows', goods: 'goods', fandomDiary: 'diary' };

    el.innerHTML = head +
      '<div class="stat-grid card sum-card">' +
        '<div class="stat"><span class="n">' + shows.length + '</span><span class="l">전체 공연 관람</span></div>' +
        '<div class="stat"><span class="n">' + shows.filter(function (s) { return (s.date || '').slice(0, 4) === U.today().slice(0, 4); }).length + '</span><span class="l">올해 관람</span></div>' +
        '<div class="stat"><span class="n">' + persons.length + '</span><span class="l">인물</span></div>' +
        '<div class="stat"><span class="n">' + works.length + '</span><span class="l">작품</span></div>' +
        '<div class="stat"><span class="n">' + C.won(totalSpend) + '</span><span class="l">굿즈 총 지출</span></div>' +
      '</div>' +
      '<div class="fandom-grid">' +
        '<section class="card tape"><h2 class="sec-title">🎭 작품별 관람 횟수</h2>' + C.barList(perWork, '', '관람 기록이 없어요.') + '</section>' +
        '<section class="card tape-left"><h2 class="sec-title">🌟 인물별 관심도</h2>' + C.barList(interest, '', '인물과 연결된 기록이 없어요.') +
          '<p class="fhint">연결된 작품·덕질 일기·굿즈는 1점, 캐스팅으로 본 공연은 2점으로 계산해요.</p></section>' +
        '<section class="card tape-corner"><h2 class="sec-title">📅 월별 관람 (최근 12개월)</h2>' + C.barList(monthShows, '', '최근 12개월 관람 기록이 없어요.') + '</section>' +
        '<section class="card tape"><h2 class="sec-title">💸 월별 굿즈 지출 (최근 12개월)</h2>' + C.barList(monthSpend, '', '최근 12개월 굿즈 구매 기록이 없어요.') + '</section>' +
      '</div>' +
      '<section class="card tape-left table-card"><h2 class="sec-title">🗓️ 연간 덕질 활동</h2>' +
        (yearRows ? '<div class="tbl-wrap"><table class="cmp-table"><thead><tr><th></th><th>관람</th><th>덕질 일기</th><th>굿즈</th><th>작품</th><th>인물</th></tr></thead><tbody>' + yearRows + '</tbody></table></div>'
          : '<p class="empty">아직 기록이 없어요.</p>') + '</section>' +
      '<section class="card tape"><h2 class="sec-title">🖼️ 덕질 사진 갤러리 <small>' + photos.length + '장</small></h2>' +
        (photos.length ? '<div class="gallery">' + photos.map(function (p) {
          return '<a class="g-item" href="#/fandom/' + hrefOf[p.r.type] + '/edit/' + p.r.id + '" title="' + esc(p.r.title || '') + '"><img data-media="' + esc(p.id) + '" alt=""></a>';
        }).join('') + '</div>' : '<p class="empty">사진이 있는 덕질 기록이 없어요.</p>') + '</section>';
  }

  M.mods.fandom = async function (el, sub) {
    const tab = TABS.some(function (t) { return t[0] === sub[0]; }) ? sub[0] : 'home';
    const head = '<div class="sub-bar">' + M.ui.tabs(BASE, TABS, tab) + '</div>';
    if (tab === 'home') return homeView(el, head);
    if (tab === 'stats') return statsView(el, head);
    const cfg = CFG[tab];
    if (sub[1] === 'new' || sub[1] === 'edit') return C.editPage(el, BASE + '/' + tab, cfg, sub.slice(1), 'fandom');
    return C.listPage(el, BASE + '/' + tab, head, cfg);
  };
})();
