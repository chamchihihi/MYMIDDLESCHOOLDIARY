/* 추억 보관함: 스크랩북 앨범 · 타임라인 · 즐겨찾기 */
(function () {
  const M = window.MMSD;

  const CATS = ['학교 행사', '친구와의 추억', '선생님과의 추억', '공연 및 문화생활', '특별한 날', '개인적인 순간', '자유 추억'];
  const STYLES = ['🎀 리본', '📌 압정', '🧷 클립', '🌼 꽃', '⭐ 별', '💌 편지'];
  const COLORS = ['핑크', '블루', '민트', '레몬', '라벤더', '크림'];
  const COLOR_CLASS = { '핑크': 'c-pink', '블루': 'c-blue', '민트': 'c-mint', '레몬': 'c-lemon', '라벤더': 'c-lav', '크림': 'c-cream' };

  const FIELDS = [
    { t: 'section', label: '📸 추억 기록' },
    { k: 'title', label: '추억 제목', t: 'text', top: 'title', full: true },
    { k: 'category', label: '카테고리', t: 'select', opts: CATS },
    { k: 'date', label: '날짜', t: 'date', top: 'date' },
    { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
    { k: 'place', label: '장소', t: 'text', hint: '지도에 표시하는 기능은 지도 서비스를 정한 뒤에 추가할 수 있어요.' },
    { k: 'photos', label: '대표 사진 · 사진 갤러리 · 동영상 · 티켓 사진', t: 'media', top: 'mediaIds', full: true, hint: '첫 번째 사진이 대표 사진이 돼요.' },
    { k: 'mood', label: '그때의 기분', t: 'choice', opts: M.forms.OPTS.mood, full: true },
    { k: 'highlight', label: '기억에 남는 사건', t: 'textarea', full: true },
    { k: 'review', label: '상세 후기', t: 'textarea', full: true, rows: 6 },
    { t: 'section', label: '👥 함께한 사람 · 연결' },
    { k: 'friends', label: '함께한 친구', t: 'link', of: 'friend', full: true, emptyText: '친구 수첩에 친구를 등록하면 여기서 고를 수 있어요.' },
    { k: 'teachers', label: '함께한 선생님', t: 'link', of: 'teacher', full: true, emptyText: '학교생활 수첩에 선생님을 등록하면 여기서 고를 수 있어요.' },
    { k: 'others', label: '그 밖에 함께한 사람', t: 'text', full: true },
    { k: 'diaries', label: '관련 일기', t: 'link', of: 'diary', full: true, emptyText: '일기를 쓰면 여기서 연결할 수 있어요.' },
    { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true },
    { t: 'section', label: '🎀 추억 카드 꾸미기' },
    { k: 'cardStyle', label: '카드 장식', t: 'choice', opts: STYLES, full: true },
    { k: 'cardColor', label: '카드 색', t: 'choice', opts: COLORS, full: true },
    { k: 'fav', label: '⭐ 즐겨찾는 추억', t: 'check' },
    { k: 'isCover', label: '📕 이 추억을 앨범 표지로 지정', t: 'check' }
  ];

  const TABS = [['album', '📒 앨범'], ['timeline', '🕰️ 타임라인'], ['fav', '⭐ 즐겨찾기']];

  function memCard(r) {
    const U = M.ui, esc = U.esc, d = r.data;
    const deco = d.cardStyle ? d.cardStyle.split(' ')[0] : '';
    return '<a class="mem card ' + (COLOR_CLASS[d.cardColor] || '') + '" href="#/memories/edit/' + r.id + '">' +
      (deco ? '<span class="mem-deco" aria-hidden="true">' + deco + '</span>' : '') +
      '<div class="mem-photo">' + ((r.mediaIds || [])[0] ? '<img data-media="' + esc(r.mediaIds[0]) + '" alt="">' : '<span aria-hidden="true">📸</span>') + '</div>' +
      '<p class="mem-title">' + (d.fav ? '⭐ ' : '') + esc(r.title || '(제목 없음)') + '</p>' +
      '<p class="mem-meta">' + esc(U.fmtDate(r.date, false)) + (d.category ? ' · ' + esc(d.category) : '') + '</p>' +
      ((r.mediaIds || []).length > 1 ? '<span class="mem-count">🖼️ ' + r.mediaIds.length + '</span>' : '') +
      '</a>';
  }

  function grid(list) { return '<div class="mem-grid">' + list.map(memCard).join('') + '</div>'; }

  async function listView(el, tab) {
    const U = M.ui, esc = U.esc;
    const all = await M.db.list('memory');
    const head = '<div class="sub-bar">' + U.tabs('memories', TABS, tab) + '<a class="btn primary" href="#/memories/new">+ 추억 담기</a></div>';
    if (!all.length) {
      el.innerHTML = head + U.empty('📸', '아직 보관한 추억이 없어요. 오래 간직하고 싶은 특별한 순간을 담아 보세요.', '#/memories/new', '+ 추억 담기');
      return;
    }
    const cover = all.find(function (r) { return r.data.isCover; });
    el.innerHTML = head +
      (tab === 'album' && cover ? '<a class="album-cover card tape" href="#/memories/edit/' + cover.id + '">' +
        '<div class="cover-photo">' + ((cover.mediaIds || [])[0] ? '<img data-media="' + esc(cover.mediaIds[0]) + '" data-variant="full" alt="">' : '<span>📕</span>') + '</div>' +
        '<div class="cover-text"><small>📕 앨범 표지</small><h2>' + esc(cover.title) + '</h2><p>' + esc(U.fmtDate(cover.date)) + '</p></div></a>' : '') +
      '<div class="toolbar card">' +
        '<input type="search" class="inp" id="mq" placeholder="🔍 제목·장소·태그로 찾기" aria-label="추억 검색">' +
        '<select class="inp" id="mc" aria-label="카테고리"><option value="">모든 카테고리</option>' + CATS.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select>' +
        '<select class="inp" id="mg" aria-label="학년"><option value="">전체 학년</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option></select>' +
      '</div><div id="mres"></div>';
    const q = el.querySelector('#mq'), c = el.querySelector('#mc'), g = el.querySelector('#mg'), res = el.querySelector('#mres');
    function draw() {
      let list = all.filter(function (r) {
        return U.match(r, q.value.trim()) && (!c.value || r.data.category === c.value) && (!g.value || String(r.grade) === g.value) &&
          (tab !== 'fav' || r.data.fav);
      });
      /* 기본 정렬: 날짜순 */
      list = list.sort(function (a, b) { return (a.date || '9') < (b.date || '9') ? -1 : 1; });
      if (!list.length) {
        res.innerHTML = '<p class="empty center">' + (tab === 'fav' ? '즐겨찾는 추억이 없어요. 추억에서 ⭐를 켜 보세요.' : '찾는 추억이 없어요.') + '</p>';
      } else if (tab === 'timeline') {
        const years = {};
        list.forEach(function (r) { const y = (r.date || '날짜 없음').slice(0, 4); (years[y] = years[y] || []).push(r); });
        res.innerHTML = Object.keys(years).sort().map(function (y) {
          return '<h2 class="sec-title">' + esc(y) + (y.length === 4 ? '년' : '') + ' <small>' + years[y].length + '개</small></h2>' +
            M.timelineHTML(years[y].map(function (r) {
              return { date: r.date, icon: r.data.cardStyle ? r.data.cardStyle.split(' ')[0] : '📸', kind: r.data.category || '추억', title: r.title, href: '#/memories/edit/' + r.id };
            }).reverse(), '');
        }).join('');
      } else {
        /* 앨범: 학년별 + 날짜순 */
        res.innerHTML = U.byGrade(list).map(function (gr) {
          return '<h2 class="sec-title">' + U.gradeLabel(gr[0]) + ' <small>' + gr[1].length + '개</small></h2>' + grid(gr[1]);
        }).join('');
      }
      U.hydrate(res);
    }
    [q, c, g].forEach(function (x) { x.addEventListener('input', draw); });
    c.addEventListener('change', draw);
    g.addEventListener('change', draw);
    draw();
  }

  M.mods.memories = async function (el, sub) {
    const mode = sub[0] || 'album';
    if (mode === 'new' || mode === 'edit') {
      let rec = null;
      if (mode === 'edit') {
        rec = await M.db.get(sub[1]);
        if (!rec || rec.trashed) { el.innerHTML = M.ui.empty('🔍', '추억을 찾을 수 없어요.', '#/memories', '앨범으로'); return; }
      } else {
        rec = { type: 'memory', date: M.ui.today(), data: {} };
      }
      await M.forms.editor(el, {
        type: 'memory', fields: FIELDS, rec: rec, back: '#/memories', backLabel: '앨범으로',
        titleOf: function (r) { return r.title || '제목 없는 추억'; },
        editHref: function (id) { return '#/memories/edit/' + id; },
        onSaved: async function (saved) {
          /* 표지는 하나만 */
          if (!saved.data.isCover) return;
          const others = (await M.db.list('memory')).filter(function (r) { return r.id !== saved.id && r.data.isCover; });
          for (const o of others) {
            await M.db.save(Object.assign({}, o, { data: Object.assign({}, o.data, { isCover: false }) }));
          }
        }
      });
      return;
    }
    return listView(el, TABS.some(function (t) { return t[0] === mode; }) ? mode : 'album');
  };
})();
