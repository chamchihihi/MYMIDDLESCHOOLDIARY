/* 일상 다이어리: 달력 · 날짜별 보기 · 모아보기 · 일기 쓰기 */
(function () {
  const M = window.MMSD;
  const O = M.forms.OPTS;

  const FIELDS = [
    { t: 'section', label: '📅 오늘의 기본' },
    { k: 'date', label: '날짜', t: 'date', top: 'date' },
    { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
    { k: 'weather', label: '날씨', t: 'choice', opts: O.weather, full: true },
    { k: 'mood', label: '오늘의 기분', t: 'choice', opts: O.mood, full: true },
    { k: 'oneLine', label: '오늘의 한마디', t: 'text', full: true },
    { k: 'moment', label: '기억에 남는 순간', t: 'textarea', full: true, rows: 4 },
    { k: 'photos', label: '오늘의 사진', t: 'media', top: 'mediaIds', full: true },
    { t: 'section', label: '👥 오늘 만난 사람' },
    { k: 'friendsMet', label: '오늘 만난 친구', t: 'link', of: 'friend', full: true, emptyText: '친구 수첩에 친구를 등록하면 여기서 고를 수 있어요.' },
    { k: 'teachersMet', label: '오늘 만난 선생님', t: 'link', of: 'teacher', full: true, emptyText: '학교생활 수첩에 선생님을 등록하면 여기서 고를 수 있어요.' },
    { t: 'section', label: '🍀 오늘의 이것저것' },
    { k: 'food', label: '오늘 먹은 음식', t: 'text' },
    { k: 'song', label: '오늘 들은 노래', t: 'text' },
    { k: 'school', label: '오늘의 학교생활', t: 'textarea', full: true },
    { k: 'fandom', label: '오늘의 덕질', t: 'textarea', full: true },
    { k: 'achievement', label: '오늘의 성취', t: 'textarea' },
    { k: 'regret', label: '아쉬웠던 일', t: 'textarea' },
    { k: 'memo', label: '자유 메모', t: 'textarea', full: true },
    { k: 'secret', label: '비공개 메모', t: 'secret', full: true },
    { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
  ];

  function titleOf(r) {
    return r.data.oneLine || M.ui.snippet(r.data.moment, 30) || '일기';
  }
  function moodEmoji(r) { return (r.data.mood || '📝').split(' ')[0]; }

  function entryCard(r) {
    const U = M.ui, esc = U.esc;
    return '<a class="entry card" href="#/diary/edit/' + r.id + '">' + U.thumb(r, moodEmoji(r)) +
      '<div class="entry-body">' +
        '<div class="entry-top"><span class="entry-mood" aria-hidden="true">' + moodEmoji(r) + '</span>' +
        '<span class="entry-date">' + esc(U.fmtDate(r.date)) + '</span>' +
        (r.data.weather ? '<span class="entry-weather">' + esc(r.data.weather.split(' ')[0]) + '</span>' : '') +
        (r.grade ? '<span class="badge">' + r.grade + '학년</span>' : '') + '</div>' +
        '<p class="entry-title">' + esc(r.title) + '</p>' +
        (r.data.moment ? '<p class="entry-snip">' + esc(U.snippet(r.data.moment, 70)) + '</p>' : '') +
        (r.tags && r.tags.length ? '<ul class="tag-list">' + r.tags.map(function (t) { return '<li>#' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      '</div></a>';
  }

  function topBar(active) {
    return '<div class="sub-bar">' + M.ui.tabs('diary', [['cal', '📅 달력'], ['list', '🗂️ 모아보기']], active) +
      '<a class="btn primary" href="#/diary/new/' + M.ui.today() + '">+ 오늘 일기 쓰기</a></div>';
  }

  function pastSameDay(all, date) {
    const md = date.slice(5);
    const list = all.filter(function (d) { return d.date && d.date.slice(5) === md && d.date < date; });
    if (!list.length) return '';
    return '<section class="past-day"><h2 class="sec-title">⏳ 지난 해 이 날의 일기</h2><div class="entry-list">' +
      list.map(entryCard).join('') + '</div></section>';
  }

  /* ---------- 달력 ---------- */
  function calendar(el, all, ym) {
    const U = M.ui;
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth() + 1;
    if (/^\d{4}-\d{2}$/.test(ym || '')) { y = Number(ym.slice(0, 4)); m = Number(ym.slice(5)); }
    const first = new Date(y, m - 1, 1);
    const days = new Date(y, m, 0).getDate();
    const prev = new Date(y, m - 2, 1), next = new Date(y, m, 1);
    const key = function (d) { return d.getFullYear() + '-' + U.pad(d.getMonth() + 1); };
    const byDate = {};
    all.forEach(function (d) { if (d.date) (byDate[d.date] = byDate[d.date] || []).push(d); });
    const today = U.today();

    let cells = '';
    for (let i = 0; i < first.getDay(); i++) cells += '<span class="cal-day blank" aria-hidden="true"></span>';
    let monthCount = 0;
    for (let d = 1; d <= days; d++) {
      const ds = y + '-' + U.pad(m) + '-' + U.pad(d);
      const list = byDate[ds] || [];
      monthCount += list.length;
      const wd = new Date(y, m - 1, d).getDay();
      cells += '<a class="cal-day' + (ds === today ? ' today' : '') + (list.length ? ' has' : '') + (wd === 0 ? ' sun' : wd === 6 ? ' sat' : '') +
        '" href="#/diary/day/' + ds + '" aria-label="' + m + '월 ' + d + '일' + (list.length ? ', 일기 ' + list.length + '개' : '') + '">' +
        '<span class="cal-n">' + d + '</span>' +
        (list.length ? '<span class="cal-mood" aria-hidden="true">' + moodEmoji(list[0]) + '</span>' : '') +
        (list.length > 1 ? '<span class="cal-count">' + list.length + '</span>' : '') + '</a>';
    }

    el.innerHTML = topBar('cal') +
      '<section class="card tape calendar">' +
        '<div class="cal-head">' +
          '<a class="btn small" href="#/diary/cal/' + key(prev) + '" aria-label="이전 달">◀</a>' +
          '<h2>' + y + '년 ' + m + '월 <small>일기 ' + monthCount + '개</small></h2>' +
          '<a class="btn small" href="#/diary/cal/' + key(next) + '" aria-label="다음 달">▶</a>' +
        '</div>' +
        '<div class="cal-grid">' + U.WEEK.map(function (w, i) {
          return '<span class="cal-w' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '') + '">' + w + '</span>';
        }).join('') + cells + '</div>' +
        '<p class="fhint">날짜를 누르면 그날의 일기를 보고 새로 쓸 수 있어요.</p>' +
      '</section>' +
      pastSameDay(all, today);
  }

  /* ---------- 날짜별 ---------- */
  function dayView(el, all, date) {
    const U = M.ui;
    const d = U.parse(date);
    if (!d) { location.hash = '#/diary'; return; }
    const list = all.filter(function (r) { return r.date === date; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
    const prev = new Date(d); prev.setDate(d.getDate() - 1);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    el.innerHTML = topBar('') +
      '<div class="day-head">' +
        '<a class="btn small" href="#/diary/day/' + U.ymd(prev) + '" aria-label="전날">◀</a>' +
        '<h2>' + U.fmtDate(date) + '</h2>' +
        '<a class="btn small" href="#/diary/day/' + U.ymd(next) + '" aria-label="다음 날">▶</a>' +
        '<a class="btn" href="#/diary/cal/' + date.slice(0, 7) + '">📅 달력으로</a>' +
      '</div>' +
      (list.length ? '<div class="entry-list">' + list.map(entryCard).join('') + '</div>'
        : U.empty('📝', '이 날의 일기가 아직 없어요.', null)) +
      '<p class="center"><a class="btn primary" href="#/diary/new/' + date + '">+ 이 날 일기 쓰기</a></p>' +
      pastSameDay(all, date);
  }

  /* ---------- 모아보기 ---------- */
  function listView(el, all) {
    const U = M.ui, esc = U.esc;
    const months = Array.from(new Set(all.map(function (d) { return (d.date || '').slice(0, 7); }).filter(Boolean))).sort().reverse();
    el.innerHTML = topBar('list') +
      '<div class="toolbar card">' +
        '<input type="search" class="inp" id="dq" placeholder="🔍 내용·태그로 찾기" aria-label="일기 검색">' +
        '<select class="inp" id="dg" aria-label="학년"><option value="">전체 학년</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option></select>' +
        '<select class="inp" id="dm" aria-label="월"><option value="">전체 기간</option>' +
          months.map(function (m) { return '<option value="' + m + '">' + m.slice(0, 4) + '년 ' + Number(m.slice(5)) + '월</option>'; }).join('') +
        '</select>' +
      '</div><div id="dres"></div>';

    const q = el.querySelector('#dq'), g = el.querySelector('#dg'), mo = el.querySelector('#dm'), res = el.querySelector('#dres');
    function draw() {
      const list = all.filter(function (d) {
        return U.match(d, q.value.trim()) && (!g.value || String(d.grade) === g.value) && (!mo.value || (d.date || '').slice(0, 7) === mo.value);
      });
      if (!list.length) {
        res.innerHTML = all.length ? '<p class="empty center">찾는 일기가 없어요.</p>'
          : U.empty('📔', '아직 쓴 일기가 없어요. 오늘 하루를 기록해 볼까요?', '#/diary/new/' + U.today(), '+ 일기 쓰기');
        return;
      }
      const groups = {};
      list.forEach(function (d) { const k = (d.date || '날짜 없음').slice(0, 7); (groups[k] = groups[k] || []).push(d); });
      res.innerHTML = Object.keys(groups).sort().reverse().map(function (k) {
        const label = /^\d{4}-\d{2}$/.test(k) ? k.slice(0, 4) + '년 ' + Number(k.slice(5)) + '월' : k;
        return '<h2 class="sec-title">' + esc(label) + ' <small>' + groups[k].length + '개</small></h2><div class="entry-list">' + groups[k].map(entryCard).join('') + '</div>';
      }).join('');
      U.hydrate(res);
    }
    [q, g, mo].forEach(function (x) { x.addEventListener('input', draw); });
    draw();
  }

  M.mods.diary = async function (el, sub) {
    const mode = sub[0] || 'cal';
    if (mode === 'new' || mode === 'edit') {
      let rec = null;
      if (mode === 'edit') {
        rec = await M.db.get(sub[1]);
        if (!rec || rec.trashed) { el.innerHTML = M.ui.empty('🔍', '일기를 찾을 수 없어요. 휴지통으로 옮겨졌을 수 있어요.', '#/diary', '달력으로'); return; }
      } else {
        rec = { type: 'diary', date: M.ui.parse(sub[1]) ? sub[1] : M.ui.today(), data: {} };
      }
      const backDate = rec.date || M.ui.today();
      await M.forms.editor(el, {
        type: 'diary', fields: FIELDS, rec: rec, titleOf: titleOf,
        back: '#/diary/day/' + backDate, backLabel: '이 날의 일기',
        editHref: function (id) { return '#/diary/edit/' + id; }
      });
      return;
    }
    const all = await M.db.list('diary');
    if (mode === 'day') return dayView(el, all, sub[1]);
    if (mode === 'list') return listView(el, all);
    return calendar(el, all, sub[1]);
  };

  M.diaryCard = entryCard;
})();
