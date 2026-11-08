/* 친구 수첩 */
(function () {
  const M = window.MMSD;

  const RELATIONS = ['단짝·베프', '친한 친구', '친구', '아는 사이', '멀어진 친구', '기타'];

  const FIELDS = [
    { t: 'section', label: '🙂 친구 프로필' },
    { k: 'name', label: '이름', t: 'text', top: 'title' },
    { k: 'nickname', label: '별명', t: 'text' },
    { k: 'birthday', label: '생일', t: 'date', hint: '생일 달력과 홈 화면 알림에 쓰여요.' },
    { k: 'relation', label: '현재 관계', t: 'select', opts: RELATIONS },
    { k: 'firstMet', label: '처음 만난 날짜', t: 'date' },
    { k: 'closeDate', label: '친해진 날짜', t: 'date' },
    { k: 'class1', label: '1학년 때 반', t: 'text', ph: '예: 3 (같은 학교가 아니면 비워 두기)' },
    { k: 'class2', label: '2학년 때 반', t: 'text' },
    { k: 'class3', label: '3학년 때 반', t: 'text' },
    { k: 'photos', label: '사진첩', t: 'media', top: 'mediaIds', full: true },
    { k: 'keywords', label: '친구를 표현하는 키워드 · 태그', t: 'tags', top: 'tags', full: true },
    { k: 'relationLog', label: '관계 변화 기록', t: 'rows', full: true, addLabel: '변화 추가',
      cols: [{ k: 'date', label: '날짜', t: 'date', w: 1 }, { k: 'text', label: '어떤 변화가 있었나요?', w: 3 }] },
    { k: 'memo', label: '자유 메모', t: 'textarea', full: true },
    { k: 'fav', label: '⭐ 즐겨찾는 친구', t: 'check', full: true }
  ];

  const MEM_KINDS = ['함께한 사건', '방문한 장소', '주고받은 편지', '재미있었던 대화', '생일·기념일', '기타'];
  const MEM_FIELDS = [
    { k: 'title', label: '제목', t: 'text', top: 'title', full: true },
    { k: 'kind', label: '종류', t: 'select', opts: MEM_KINDS },
    { k: 'date', label: '날짜', t: 'date', top: 'date' },
    { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
    { k: 'place', label: '장소', t: 'text' },
    { k: 'friends', label: '함께한 친구', t: 'link', of: 'friend', full: true },
    { k: 'content', label: '내용', t: 'textarea', full: true, rows: 5 },
    { k: 'photos', label: '사진 · 편지 사진', t: 'media', top: 'mediaIds', full: true },
    { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
  ];

  const TABS = [['all', '👭 전체'], ['grade', '🎒 학년별'], ['class', '🏫 같은 반'], ['fav', '⭐ 즐겨찾기'], ['birthday', '🎂 생일 달력'], ['memories', '💭 추억 찾기']];

  function grades(f) {
    return [1, 2, 3].filter(function (g) { return f.data['class' + g]; });
  }

  function friendCard(f) {
    const U = M.ui, esc = U.esc, d = f.data;
    const n = d.birthday ? U.daysToBirthday(d.birthday) : null;
    return '<a class="person card" href="#/friends/edit/' + f.id + '">' + U.thumb(f, '🙂', 'round') +
      '<div class="person-body">' +
        '<p class="person-name">' + (d.fav ? '<span class="star" aria-label="즐겨찾기">⭐</span>' : '') + esc(f.title || '(이름 없음)') +
          (d.nickname ? ' <small>' + esc(d.nickname) + '</small>' : '') + '</p>' +
        '<div class="badges">' + (d.relation ? '<span class="badge">' + esc(d.relation) + '</span>' : '') +
          grades(f).map(function (g) { return '<span class="badge soft">' + g + '-' + esc(d['class' + g]) + '</span>'; }).join('') +
          (n != null && n <= 30 ? '<span class="badge hot">🎂 ' + (n === 0 ? '오늘' : 'D-' + n) + '</span>' : '') +
        '</div>' +
        (f.tags && f.tags.length ? '<ul class="tag-list">' + f.tags.slice(0, 4).map(function (t) { return '<li>#' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      '</div></a>';
  }

  function cards(list, emptyText) {
    if (!list.length) return '<p class="empty center">' + emptyText + '</p>';
    return '<div class="person-list">' + list.map(friendCard).join('') + '</div>';
  }

  /* 타임라인 공통 (선생님 수첩에서도 사용) */
  M.timelineHTML = function (items, emptyText) {
    const U = M.ui, esc = U.esc;
    if (!items.length) return '<p class="empty">' + emptyText + '</p>';
    items.sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; });
    return '<ol class="timeline">' + items.map(function (it) {
      const inner = '<span class="tl-date">' + esc(it.date ? U.fmtDate(it.date, false) : '날짜 없음') + '</span>' +
        '<span class="tl-kind">' + it.icon + ' ' + esc(it.kind) + '</span>' +
        '<span class="tl-title">' + esc(it.title || '') + '</span>';
      return '<li>' + (it.href ? '<a href="' + it.href + '">' + inner + '</a>' : '<div>' + inner + '</div>') + '</li>';
    }).join('') + '</ol>';
  };

  async function friendTimeline(f) {
    const [fm, mem, dia] = await Promise.all([M.db.list('friendMemory'), M.db.list('memory'), M.db.list('diary')]);
    const has = function (arr) { return (arr || []).indexOf(f.id) >= 0; };
    const items = [];
    fm.filter(function (r) { return has(r.data.friends); }).forEach(function (r) {
      items.push({ date: r.date, icon: '💭', kind: r.data.kind || '추억', title: r.title, href: '#/friends/memory/edit/' + r.id });
    });
    mem.filter(function (r) { return has(r.data.friends); }).forEach(function (r) {
      items.push({ date: r.date, icon: '📸', kind: '추억 보관함', title: r.title, href: '#/memories/edit/' + r.id });
    });
    dia.filter(function (r) { return has(r.data.friendsMet); }).forEach(function (r) {
      items.push({ date: r.date, icon: '📔', kind: '일기', title: r.title, href: '#/diary/edit/' + r.id });
    });
    (f.data.relationLog || []).forEach(function (r) {
      items.push({ date: r.date, icon: '🔁', kind: '관계 변화', title: r.text });
    });
    return '<section class="card tape-left"><div class="sec-head"><h2 class="sec-title">🕰️ ' + M.ui.esc(f.title || '친구') + '와(과)의 추억 타임라인</h2>' +
      '<a class="btn primary" href="#/friends/memory/new/' + f.id + '">+ 추억 추가</a></div>' +
      M.timelineHTML(items, '아직 함께한 추억이 없어요. 추억을 추가하거나, 일기·추억 보관함에서 이 친구를 고르면 여기에 모여요.') + '</section>';
  }

  async function listView(el, tab) {
    const U = M.ui, esc = U.esc;
    const all = (await M.db.list('friend')).sort(function (a, b) { return (a.title || '').localeCompare(b.title || '', 'ko'); });
    const head = '<div class="sub-bar">' + U.tabs('friends', TABS, tab) + '<a class="btn primary" href="#/friends/new">+ 친구 추가</a></div>';

    if (tab === 'memories') {
      const mems = await M.db.list('friendMemory');
      const names = await U.nameMap('friend');
      el.innerHTML = head + '<div class="toolbar card"><input type="search" class="inp" id="fq" placeholder="🔍 친구 이름·장소·내용으로 추억 찾기" aria-label="추억 검색"></div><div id="fres"></div>';
      const q = el.querySelector('#fq'), res = el.querySelector('#fres');
      const draw = function () {
        const s = q.value.trim().toLowerCase();
        const list = mems.filter(function (m) {
          const who = (m.data.friends || []).map(function (id) { return names[id] || ''; }).join(' ');
          return !s || (who.toLowerCase().indexOf(s) >= 0) || U.match(m, s);
        });
        res.innerHTML = M.timelineHTML(list.map(function (m) {
          const who = (m.data.friends || []).map(function (id) { return names[id]; }).filter(Boolean).join(', ');
          return { date: m.date, icon: '💭', kind: (m.data.kind || '추억') + (who ? ' · ' + who : ''), title: m.title, href: '#/friends/memory/edit/' + m.id };
        }), mems.length ? '찾는 추억이 없어요.' : '아직 친구와의 추억이 없어요. 친구 페이지에서 추억을 추가해 보세요.');
      };
      q.addEventListener('input', draw);
      draw();
      return;
    }

    if (!all.length) {
      el.innerHTML = head + U.empty('👭', '아직 등록된 친구가 없어요. 중학교에서 만난 친구를 추가해 보세요.', '#/friends/new', '+ 친구 추가');
      return;
    }

    if (tab === 'grade') {
      el.innerHTML = head + [1, 2, 3].map(function (g) {
        const list = all.filter(function (f) { return f.data['class' + g]; });
        return '<h2 class="sec-title">' + g + '학년 <small>' + list.length + '명</small></h2>' + cards(list, g + '학년 반이 입력된 친구가 없어요.');
      }).join('') + '<p class="fhint">친구 정보의 "N학년 때 반"을 입력하면 학년별로 모여요.</p>';
      return;
    }
    if (tab === 'class') {
      const p = M.profile;
      const groups = {};
      all.forEach(function (f) {
        [1, 2, 3].forEach(function (g) {
          const c = f.data['class' + g];
          if (c) (groups[g + '-' + c] = groups[g + '-' + c] || []).push(f);
        });
      });
      const keys = Object.keys(groups).sort();
      const mine = p && p.grade && p.data.classNo ? p.grade + '-' + p.data.classNo : null;
      el.innerHTML = head + (keys.length ? keys.map(function (k) {
        const gc = k.split('-');
        return '<h2 class="sec-title">' + gc[0] + '학년 ' + esc(gc[1]) + '반' + (k === mine ? ' <span class="badge hot">지금 우리 반</span>' : '') +
          ' <small>' + groups[k].length + '명</small></h2>' + cards(groups[k], '');
      }).join('') : '<p class="empty center">반 정보가 입력된 친구가 없어요.</p>');
      return;
    }
    if (tab === 'fav') {
      el.innerHTML = head + cards(all.filter(function (f) { return f.data.fav; }), '즐겨찾는 친구가 없어요. 친구 정보에서 ⭐를 켜 보세요.');
      return;
    }
    if (tab === 'birthday') {
      const withB = all.filter(function (f) { return U.parse(f.data.birthday); });
      const soon = withB.map(function (f) { return { f: f, n: U.daysToBirthday(f.data.birthday) }; })
        .sort(function (a, b) { return a.n - b.n; }).slice(0, 5);
      el.innerHTML = head +
        (soon.length ? '<section class="card tape soon"><h2 class="sec-title">🎉 다가오는 생일</h2><ul class="mini-list">' + soon.map(function (x) {
          return '<li><a href="#/friends/edit/' + x.f.id + '"><b class="dday">' + (x.n === 0 ? '🎉 오늘' : 'D-' + x.n) + '</b> ' + esc(x.f.title) +
            ' <small>' + (U.parse(x.f.data.birthday).getMonth() + 1) + '월 ' + U.parse(x.f.data.birthday).getDate() + '일</small></a></li>';
        }).join('') + '</ul></section>' : '') +
        '<div class="month-grid">' + Array.from({ length: 12 }, function (_, i) {
          const list = withB.filter(function (f) { return U.parse(f.data.birthday).getMonth() === i; })
            .sort(function (a, b) { return U.parse(a.data.birthday).getDate() - U.parse(b.data.birthday).getDate(); });
          return '<section class="card month' + (new Date().getMonth() === i ? ' now' : '') + '"><h3>' + (i + 1) + '월</h3>' +
            (list.length ? '<ul>' + list.map(function (f) {
              return '<li><a href="#/friends/edit/' + f.id + '"><b>' + U.parse(f.data.birthday).getDate() + '일</b> ' + esc(f.title) + '</a></li>';
            }).join('') + '</ul>' : '<p class="empty">-</p>') + '</section>';
        }).join('') + '</div>';
      return;
    }

    /* 전체 + 검색 */
    el.innerHTML = head + '<div class="toolbar card">' +
      '<input type="search" class="inp" id="fq" placeholder="🔍 이름·별명·태그로 찾기" aria-label="친구 검색">' +
      '<select class="inp" id="fr" aria-label="관계"><option value="">모든 관계</option>' + RELATIONS.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select>' +
      '</div><div id="fres"></div>';
    const q = el.querySelector('#fq'), r = el.querySelector('#fr'), res = el.querySelector('#fres');
    const draw = function () {
      const list = all.filter(function (f) { return U.match(f, q.value.trim()) && (!r.value || f.data.relation === r.value); });
      res.innerHTML = cards(list, '찾는 친구가 없어요.');
      U.hydrate(res);
    };
    q.addEventListener('input', draw);
    r.addEventListener('change', draw);
    draw();
  }

  M.mods.friends = async function (el, sub) {
    const mode = sub[0] || 'all';
    if (mode === 'new' || mode === 'edit') {
      let rec = null;
      if (mode === 'edit') {
        rec = await M.db.get(sub[1]);
        if (!rec || rec.trashed) { el.innerHTML = M.ui.empty('🔍', '친구 정보를 찾을 수 없어요.', '#/friends', '친구 목록으로'); return; }
      }
      await M.forms.editor(el, {
        type: 'friend', fields: FIELDS, rec: rec, back: '#/friends', backLabel: '친구 목록',
        editHref: function (id) { return '#/friends/edit/' + id; },
        extra: friendTimeline
      });
      return;
    }
    if (mode === 'memory') {
      /* #/friends/memory/new/<friendId>  ·  #/friends/memory/edit/<id> */
      let rec = null, back = '#/friends/memories';
      if (sub[1] === 'edit') {
        rec = await M.db.get(sub[2]);
        if (!rec || rec.trashed) { el.innerHTML = M.ui.empty('🔍', '추억을 찾을 수 없어요.', '#/friends/memories', '추억 찾기로'); return; }
        if ((rec.data.friends || [])[0]) back = '#/friends/edit/' + rec.data.friends[0];
      } else {
        rec = { type: 'friendMemory', date: M.ui.today(), data: { friends: sub[2] ? [sub[2]] : [] } };
        if (sub[2]) back = '#/friends/edit/' + sub[2];
      }
      await M.forms.editor(el, {
        type: 'friendMemory', fields: MEM_FIELDS, rec: rec, back: back, backLabel: '돌아가기',
        titleOf: function (r) { return r.title || M.ui.snippet(r.data.content, 20) || '친구와의 추억'; },
        editHref: function (id) { return '#/friends/memory/edit/' + id; }
      });
      return;
    }
    return listView(el, TABS.some(function (t) { return t[0] === mode; }) ? mode : 'all');
  };
})();
