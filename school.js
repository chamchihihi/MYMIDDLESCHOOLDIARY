/* 학교생활 수첩: 선생님 · 동아리 · 반 정보 · 시간표 · 학교 행사 · 일정 · 상장 · 편지 */
(function () {
  const M = window.MMSD;

  const SUBJECTS = ['국어', '수학', '영어', '사회', '과학', '역사', '도덕', '기술·가정', '정보', '음악', '미술', '체육', '진로', '기타'];
  const ACT_KINDS = ['정기 활동', '특별 활동', '행사', '발표·공연', '기타'];

  /* 각 탭 설정 */
  const T = {
    teachers: {
      type: 'teacher', label: '👩‍🏫 선생님', emoji: '👩‍🏫', add: '선생님 추가',
      fields: [
        { t: 'section', label: '👩‍🏫 선생님 정보' },
        { k: 'name', label: '이름', t: 'text', top: 'title' },
        { k: 'honorific', label: '호칭', t: 'text', ph: '예: 김쌤, 담임쌤' },
        { k: 'subject', label: '담당 과목', t: 'select', opts: SUBJECTS },
        { k: 'grade', label: '학년', t: 'grade', top: 'grade', hint: '내가 몇 학년일 때 만난 선생님인지' },
        { k: 'classNo', label: '반', t: 'text' },
        { k: 'years', label: '담당 학년도', t: 'text', ph: '예: 2026년' },
        { k: 'homeroom', label: '🏫 담임 선생님', t: 'check' },
        { k: 'fav', label: '⭐ 즐겨찾기', t: 'check' },
        { k: 'photos', label: '사진 (선택)', t: 'media', top: 'mediaIds', full: true },
        { t: 'section', label: '📝 선생님에 대한 기록' },
        { k: 'personality', label: '성격 및 특징', t: 'textarea', full: true },
        { k: 'style', label: '수업 방식', t: 'textarea', full: true },
        { k: 'quotes', label: '기억에 남는 말씀', t: 'textarea', full: true },
        { k: 'funny', label: '재미있었던 일', t: 'textarea' },
        { k: 'thanks', label: '감사했던 순간', t: 'textarea' },
        { k: 'moments', label: '선생님과의 추억', t: 'rows', full: true, addLabel: '추억 추가',
          cols: [{ k: 'date', label: '날짜', t: 'date', w: 1 }, { k: 'text', label: '어떤 일이 있었나요?', w: 3 }] },
        { k: 'memo', label: '자유 메모', t: 'textarea', full: true },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
      ],
      sub: function (r) {
        return [r.data.honorific, r.data.subject, r.grade ? r.grade + '학년' + (r.data.classNo ? ' ' + r.data.classNo + '반' : '') : ''].filter(Boolean).join(' · ');
      },
      badges: function (r) { return (r.data.homeroom ? '<span class="badge hot">담임</span>' : '') + (r.data.fav ? '<span class="star">⭐</span>' : ''); },
      filter: { key: 'subject', label: '모든 과목', opts: SUBJECTS },
      groupByGrade: true,
      extra: teacherExtra
    },
    clubs: {
      type: 'club', label: '🎨 동아리', emoji: '🎨', add: '동아리 추가',
      fields: [
        { t: 'section', label: '🎨 동아리 정보' },
        { k: 'name', label: '동아리 이름', t: 'text', top: 'title' },
        { k: 'field', label: '분야', t: 'select', opts: ['예술', '음악·공연', '체육', '과학·IT', '학술·토론', '봉사', '독서·문학', '기타'] },
        { k: 'teacher', label: '담당 선생님', t: 'text' },
        { k: 'joinDate', label: '가입 날짜', t: 'date' },
        { k: 'leaveDate', label: '탈퇴 날짜', t: 'date', hint: '지금도 활동 중이면 비워 두세요.' },
        { k: 'grades', label: '활동 학년', t: 'multi', opts: ['1학년', '2학년', '3학년'], full: true },
        { k: 'photos', label: '로고 및 사진첩', t: 'media', top: 'mediaIds', full: true, hint: '첫 번째 사진이 로고처럼 목록에 보여요.' },
        { k: 'regular', label: '정기 활동', t: 'textarea' },
        { k: 'special', label: '특별 활동', t: 'textarea' },
        { k: 'activities', label: '활동 기록 (타임라인)', t: 'rows', full: true, addLabel: '활동 추가',
          cols: [{ k: 'date', label: '날짜', t: 'date', w: 1 }, { k: 'kind', label: '종류', t: 'select', opts: ACT_KINDS, w: 1 }, { k: 'text', label: '무엇을 했나요?', w: 3 }] },
        { k: 'friends', label: '동아리 친구', t: 'link', of: 'friend', full: true, emptyText: '친구 수첩에 친구를 등록하면 여기서 고를 수 있어요.' },
        { k: 'memorable', label: '기억에 남는 사건', t: 'textarea', full: true },
        { k: 'fav', label: '⭐ 즐겨찾기', t: 'check' }
      ],
      sub: function (r) {
        const d = r.data;
        return [d.field, (d.joinDate ? M.ui.fmtDate(d.joinDate, false) : '?') + ' ~ ' + (d.leaveDate ? M.ui.fmtDate(d.leaveDate, false) : '활동 중')].filter(Boolean).join(' · ');
      },
      badges: function (r) {
        const n = (r.data.activities || []).length;
        return (n ? '<span class="badge soft">활동 ' + n + '회</span>' : '') + (!r.data.leaveDate ? '<span class="badge hot">활동 중</span>' : '');
      },
      before: clubHistory,
      extra: clubExtra
    },
    class: {
      type: 'classInfo', label: '🏫 반 정보', emoji: '🏫', add: '반 정보 추가',
      fields: [
        { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
        { k: 'classNo', label: '반', t: 'text', ph: '예: 3' },
        { k: 'homeroom', label: '담임 선생님', t: 'link', of: 'teacher', full: true, emptyText: '선생님 탭에서 선생님을 등록하면 여기서 고를 수 있어요.' },
        { k: 'motto', label: '급훈 · 반 목표', t: 'text', full: true },
        { k: 'classmates', label: '같은 반 친구', t: 'link', of: 'friend', full: true, emptyText: '친구 수첩에 친구를 등록하면 여기서 고를 수 있어요.' },
        { k: 'composition', label: '학급 구성 (반장·부반장·자리 등)', t: 'textarea', full: true, rows: 4 },
        { k: 'memo', label: '우리 반 이야기', t: 'textarea', full: true, rows: 4 }
      ],
      titleOf: function (r) { return (r.grade ? r.grade + '학년 ' : '') + (r.data.classNo ? r.data.classNo + '반' : '반 정보'); },
      sub: function (r) { return r.data.motto ? '“' + r.data.motto + '”' : ''; },
      badges: function (r) { return (r.data.classmates || []).length ? '<span class="badge soft">친구 ' + r.data.classmates.length + '명</span>' : ''; },
      noThumb: true
    },
    timetable: {
      type: 'timetable', label: '🗓️ 시간표', emoji: '🗓️', add: '시간표 추가',
      fields: [
        { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
        { k: 'semester', label: '학기', t: 'select', opts: ['1학기', '2학기'] },
        { k: 'table', label: '시간표', t: 'timetable', full: true },
        { k: 'photos', label: '시간표 사진', t: 'media', top: 'mediaIds', full: true },
        { k: 'memo', label: '메모', t: 'textarea', full: true }
      ],
      titleOf: function (r) { return (r.grade ? r.grade + '학년 ' : '') + (r.data.semester || '') + ' 시간표'; }
    },
    events: {
      type: 'schoolEvent', label: '🎉 학교 행사', emoji: '🎉', add: '행사 추가',
      fields: [
        { k: 'title', label: '행사 이름', t: 'text', top: 'title', full: true },
        { k: 'kind', label: '종류', t: 'select', opts: ['입학식', '체육대회', '축제', '현장체험학습', '수학여행', '수련회', '졸업식', '기타'] },
        { k: 'date', label: '날짜', t: 'date', top: 'date' },
        { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
        { k: 'place', label: '장소', t: 'text' },
        { k: 'content', label: '어떤 행사였나요?', t: 'textarea', full: true, rows: 5 },
        { k: 'photos', label: '사진·동영상', t: 'media', top: 'mediaIds', full: true },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
      ],
      sub: function (r) { return [r.data.kind, M.ui.fmtDate(r.date, false), r.data.place].filter(Boolean).join(' · '); }
    },
    schedule: {
      type: 'schedule', label: '📌 시험·수행 일정', emoji: '📌', add: '일정 추가',
      fields: [
        { k: 'title', label: '일정 이름', t: 'text', top: 'title', full: true, ph: '예: 2학기 기말고사, 과학 탐구 보고서' },
        { k: 'kind', label: '종류', t: 'select', opts: ['시험', '수행평가', '학교 행사', '기타'] },
        { k: 'subject', label: '과목', t: 'select', opts: SUBJECTS },
        { k: 'date', label: '날짜 (마감일)', t: 'date', top: 'date' },
        { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
        { k: 'memo', label: '준비할 것 · 메모', t: 'textarea', full: true },
        { k: 'done', label: '✅ 끝났어요', t: 'check', full: true }
      ],
      sub: function (r) { return [r.data.kind, r.data.subject, M.ui.fmtDate(r.date)].filter(Boolean).join(' · '); },
      badges: function (r) {
        if (r.data.done) return '<span class="badge soft">완료</span>';
        const n = M.ui.daysUntil(r.date);
        return n == null ? '' : '<span class="badge ' + (n >= 0 && n <= 7 ? 'hot' : 'soft') + '">' + M.ui.dday(n) + '</span>';
      },
      noThumb: true,
      custom: scheduleList
    },
    awards: {
      type: 'award', label: '🏆 상장', emoji: '🏆', add: '상장 추가',
      fields: [
        { k: 'title', label: '상 이름', t: 'text', top: 'title', full: true },
        { k: 'date', label: '받은 날짜', t: 'date', top: 'date' },
        { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
        { k: 'org', label: '수여 기관', t: 'text' },
        { k: 'rank', label: '등급 · 순위', t: 'text', ph: '예: 금상, 1등' },
        { k: 'photos', label: '상장 사진', t: 'media', top: 'mediaIds', full: true },
        { k: 'memo', label: '받게 된 이야기', t: 'textarea', full: true }
      ],
      sub: function (r) { return [r.data.rank, r.data.org, M.ui.fmtDate(r.date, false)].filter(Boolean).join(' · '); }
    },
    letters: {
      type: 'letter', label: '💌 편지', emoji: '💌', add: '편지 추가',
      fields: [
        { k: 'title', label: '제목', t: 'text', top: 'title', full: true, ph: '예: 스승의 날 답장, 졸업 축하 쪽지' },
        { k: 'fromKind', label: '보낸 사람', t: 'select', opts: ['선생님', '친구', '학교', '가족', '기타'] },
        { k: 'date', label: '받은 날짜', t: 'date', top: 'date' },
        { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
        { k: 'fromTeacher', label: '보낸 선생님', t: 'link', of: 'teacher', full: true, emptyText: '선생님을 등록하면 선생님 페이지에서도 이 편지를 볼 수 있어요.' },
        { k: 'fromFriend', label: '보낸 친구', t: 'link', of: 'friend', full: true, emptyText: '친구 수첩에 친구를 등록하면 여기서 고를 수 있어요.' },
        { k: 'fromText', label: '그 밖의 보낸 사람', t: 'text' },
        { k: 'content', label: '편지 내용', t: 'textarea', full: true, rows: 6 },
        { k: 'photos', label: '편지·쪽지 사진', t: 'media', top: 'mediaIds', full: true },
        { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
      ],
      sub: function (r) { return [r.data.fromKind, M.ui.fmtDate(r.date, false)].filter(Boolean).join(' · '); }
    }
  };
  function plain(label) { return label.replace(/^\S+\s+/, ''); }
  const TAB_LIST = Object.keys(T).map(function (k) { return [k, T[k].label]; });

  /* ---------- 카드 ---------- */
  function card(cfg, key, r) {
    const U = M.ui, esc = U.esc;
    const sub = cfg.sub ? cfg.sub(r) : '';
    return '<a class="item card" href="#/school/' + key + '/edit/' + r.id + '">' +
      (cfg.noThumb ? '<div class="thumb"><span aria-hidden="true">' + cfg.emoji + '</span></div>' : U.thumb(r, cfg.emoji)) +
      '<div class="item-body"><p class="item-title">' + esc(r.title || '(제목 없음)') + '</p>' +
      (sub ? '<p class="item-sub">' + esc(sub) + '</p>' : '') +
      '<div class="badges">' + (cfg.badges ? cfg.badges(r) : '') + (r.grade && !cfg.groupByGrade ? '<span class="badge soft">' + r.grade + '학년</span>' : '') + '</div>' +
      '</div></a>';
  }

  /* ---------- 선생님 페이지 아래: 편지 · 함께한 기록 ---------- */
  async function teacherExtra(t) {
    const [letters, mem, dia] = await Promise.all([M.db.list('letter'), M.db.list('memory'), M.db.list('diary')]);
    const has = function (arr) { return (arr || []).indexOf(t.id) >= 0; };
    const items = [];
    (t.data.moments || []).forEach(function (m) { items.push({ date: m.date, icon: '🍎', kind: '추억', title: m.text }); });
    letters.filter(function (l) { return has(l.data.fromTeacher); }).forEach(function (l) {
      items.push({ date: l.date, icon: '💌', kind: '편지·쪽지', title: l.title, href: '#/school/letters/edit/' + l.id });
    });
    mem.filter(function (m) { return has(m.data.teachers); }).forEach(function (m) {
      items.push({ date: m.date, icon: '📸', kind: '추억 보관함', title: m.title, href: '#/memories/edit/' + m.id });
    });
    dia.filter(function (d) { return has(d.data.teachersMet); }).forEach(function (d) {
      items.push({ date: d.date, icon: '📔', kind: '일기', title: d.title, href: '#/diary/edit/' + d.id });
    });
    return '<section class="card tape-left"><div class="sec-head"><h2 class="sec-title">🕰️ 선생님과의 추억 타임라인</h2>' +
      '<a class="btn" href="#/school/letters/new">+ 받은 편지 보관</a></div>' +
      M.timelineHTML(items, '위의 "선생님과의 추억"에 적거나, 편지·일기·추억 보관함에서 이 선생님을 고르면 여기에 모여요.') + '</section>';
  }

  /* ---------- 동아리: 변경 이력 + 활동 통계 ---------- */
  function clubHistory(list) {
    if (!list.length) return '';
    const U = M.ui, esc = U.esc;
    const sorted = list.slice().sort(function (a, b) { return (a.data.joinDate || '') < (b.data.joinDate || '') ? -1 : 1; });
    return '<section class="card tape"><h2 class="sec-title">🔁 동아리 변경 이력</h2><ol class="timeline asc">' + sorted.map(function (c) {
      return '<li><a href="#/school/clubs/edit/' + c.id + '"><span class="tl-date">' + esc(c.data.joinDate ? U.fmtDate(c.data.joinDate, false) : '가입일 없음') + '</span>' +
        '<span class="tl-kind">' + (c.data.leaveDate ? '🚪 ' + esc(U.fmtDate(c.data.leaveDate, false)) + ' 탈퇴' : '🌱 활동 중') + '</span>' +
        '<span class="tl-title">' + esc(c.title || '(이름 없음)') + '</span></a></li>';
    }).join('') + '</ol></section>';
  }
  async function clubExtra(c) {
    const acts = c.data.activities || [];
    const counts = {};
    acts.forEach(function (a) { const k = a.kind || '기타'; counts[k] = (counts[k] || 0) + 1; });
    return '<section class="card tape-left"><h2 class="sec-title">📊 활동 횟수</h2>' +
      '<div class="stat-grid"><div class="stat"><span class="n">' + acts.length + '</span><span class="l">전체</span></div>' +
      ACT_KINDS.map(function (k) { return '<div class="stat"><span class="n">' + (counts[k] || 0) + '</span><span class="l">' + k + '</span></div>'; }).join('') + '</div>' +
      '<h2 class="sec-title">🕰️ 활동 타임라인</h2>' +
      M.timelineHTML(acts.map(function (a) { return { date: a.date, icon: '🎨', kind: a.kind || '활동', title: a.text }; }), '위의 "활동 기록"에 활동을 추가하면 여기에 쌓여요.') +
      '</section>';
  }

  /* ---------- 일정: 다가오는 일정 / 지난 일정 ---------- */
  function scheduleList(list, cfg, key) {
    const today = M.ui.today();
    const up = list.filter(function (r) { return !r.data.done && (!r.date || r.date >= today); })
      .sort(function (a, b) { return (a.date || '9') < (b.date || '9') ? -1 : 1; });
    const past = list.filter(function (r) { return up.indexOf(r) < 0; });
    return '<h2 class="sec-title">⏰ 다가오는 일정 <small>' + up.length + '개</small></h2>' +
      (up.length ? '<div class="item-list">' + up.map(function (r) { return card(cfg, key, r); }).join('') + '</div>' : '<p class="empty">다가오는 일정이 없어요.</p>') +
      '<h2 class="sec-title">✅ 지난 일정 · 완료 <small>' + past.length + '개</small></h2>' +
      (past.length ? '<div class="item-list dim">' + past.map(function (r) { return card(cfg, key, r); }).join('') + '</div>' : '<p class="empty">아직 없어요.</p>');
  }

  /* ---------- 목록 ---------- */
  async function listView(el, key) {
    const U = M.ui;
    const cfg = T[key];
    const all = await M.db.list(cfg.type);
    const head = '<div class="sub-bar">' + U.tabs('school', TAB_LIST, key) + '</div>' +
      '<div class="toolbar card">' +
        '<input type="search" class="inp" id="sq" placeholder="🔍 ' + plain(cfg.label) + ' 찾기" aria-label="검색">' +
        '<select class="inp" id="sg" aria-label="학년"><option value="">전체 학년</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option></select>' +
        (cfg.filter ? '<select class="inp" id="sf" aria-label="필터"><option value="">' + cfg.filter.label + '</option>' + cfg.filter.opts.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select>' : '') +
        (key === 'teachers' ? '<label class="switch"><input type="checkbox" id="sfav"><span>⭐만</span></label>' : '') +
        '<a class="btn primary" href="#/school/' + key + '/new">+ ' + cfg.add + '</a>' +
      '</div>' +
      (cfg.before ? cfg.before(all) : '') +
      '<div id="sres"></div>';
    el.innerHTML = head;
    const q = el.querySelector('#sq'), g = el.querySelector('#sg'), f = el.querySelector('#sf'), fav = el.querySelector('#sfav'), res = el.querySelector('#sres');
    function draw() {
      const list = all.filter(function (r) {
        return U.match(r, q.value.trim()) && (!g.value || String(r.grade) === g.value) &&
          (!f || !f.value || r.data[cfg.filter.key] === f.value) && (!fav || !fav.checked || r.data.fav);
      });
      if (!all.length) {
        res.innerHTML = U.empty(cfg.emoji, '아직 기록이 없어요.', '#/school/' + key + '/new', '+ ' + cfg.add);
      } else if (!list.length) {
        res.innerHTML = '<p class="empty center">찾는 기록이 없어요.</p>';
      } else if (cfg.custom) {
        res.innerHTML = cfg.custom(list, cfg, key);
      } else if (cfg.groupByGrade) {
        res.innerHTML = U.byGrade(list).map(function (gr) {
          const items = gr[1].sort(function (a, b) { return (b.data.homeroom ? 1 : 0) - (a.data.homeroom ? 1 : 0) || (a.title || '').localeCompare(b.title || '', 'ko'); });
          return '<h2 class="sec-title">' + U.gradeLabel(gr[0]) + ' <small>' + items.length + '</small></h2><div class="item-list">' +
            items.map(function (r) { return card(cfg, key, r); }).join('') + '</div>';
        }).join('');
      } else {
        res.innerHTML = '<div class="item-list">' + list.map(function (r) { return card(cfg, key, r); }).join('') + '</div>';
      }
      U.hydrate(res);
    }
    [q, g, f, fav].forEach(function (x) { if (x) x.addEventListener('input', draw); });
    if (f) f.addEventListener('change', draw);
    draw();
  }

  M.mods.school = async function (el, sub) {
    const key = T[sub[0]] ? sub[0] : 'teachers';
    const cfg = T[key];
    const mode = sub[1];
    if (mode === 'new' || mode === 'edit') {
      let rec = null;
      if (mode === 'edit') {
        rec = await M.db.get(sub[2]);
        if (!rec || rec.trashed || rec.type !== cfg.type) {
          el.innerHTML = M.ui.empty('🔍', '기록을 찾을 수 없어요.', '#/school/' + key, '목록으로');
          return;
        }
      }
      await M.forms.editor(el, {
        type: cfg.type, fields: cfg.fields, rec: rec,
        back: '#/school/' + key, backLabel: plain(cfg.label) + ' 목록',
        titleOf: cfg.titleOf,
        editHref: function (id) { return '#/school/' + key + '/edit/' + id; },
        extra: cfg.extra
      });
      return;
    }
    return listView(el, key);
  };
})();
