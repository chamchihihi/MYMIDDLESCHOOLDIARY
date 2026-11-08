/* 학업 기록: 시험 · 수행평가 · 공부 기록 · 교재 · 과목 관리 · 통계 */
(function () {
  const M = window.MMSD;
  const C = M.coll;
  const BASE = 'study';

  const DEFAULT_SUBJECTS = ['국어', '수학', '영어', '사회', '과학', '역사', '도덕', '기술·가정', '정보', '음악', '미술', '체육', '기타'];
  const TABS = [['exams', '📝 시험'], ['assess', '📋 수행평가'], ['study', '⏱️ 공부 기록'], ['books', '📘 교재'], ['subjects', '📚 과목 관리'], ['stats', '📊 통계']];

  /* ---------- 과목 ---------- */
  async function ensureSubjects() {
    const list = await M.db.list('subject');
    if (list.length) return list;
    /* 처음 열었을 때 기본 과목 13개를 만들어 둠 */
    for (let i = 0; i < DEFAULT_SUBJECTS.length; i++) {
      await M.db.save({ type: 'subject', title: DEFAULT_SUBJECTS[i], data: { order: i + 1, hidden: false } });
    }
    return M.db.list('subject');
  }
  function sortSubjects(list) {
    return list.slice().sort(function (a, b) { return (Number(a.data.order) || 99) - (Number(b.data.order) || 99) || (a.title || '').localeCompare(b.title || '', 'ko'); });
  }
  async function subjectNames() {
    return sortSubjects(await ensureSubjects()).filter(function (s) { return !s.data.hidden && s.title; }).map(function (s) { return s.title; });
  }

  function fmtMin(m) {
    m = Math.round(Number(m) || 0);
    const h = Math.floor(m / 60), r = m % 60;
    return h ? h + '시간' + (r ? ' ' + r + '분' : '') : r + '분';
  }

  /* 시험 평균 (만점이 비어 있으면 100점 기준) */
  function scoresOf(exam) {
    return (exam.data.scores || []).filter(function (s) { return s.subject && s.score !== '' && !isNaN(Number(s.score)); })
      .map(function (s) {
        const max = Number(s.max) || 100;
        return { subject: s.subject, score: Number(s.score), max: max, pct: Number(s.score) / max * 100, rank: s.rank, ach: s.ach, diff: s.diff };
      });
  }
  function avgOf(exam) {
    const s = scoresOf(exam);
    if (!s.length) return null;
    return Math.round(s.reduce(function (a, b) { return a + b.pct; }, 0) / s.length * 10) / 10;
  }

  /* ---------- 탭 설정 ---------- */
  const CFG = {
    exams: {
      type: 'exam', label: '시험', emoji: '📝', add: '시험 기록 추가', noThumb: true,
      fields: async function () {
        const subs = await subjectNames();
        return [
          { k: 'title', label: '시험 이름', t: 'text', top: 'title', full: true, ph: '예: 2학년 1학기 중간고사' },
          { k: 'kind', label: '종류', t: 'select', opts: ['중간고사', '기말고사', '단원평가', '모의고사', '기타'] },
          { k: 'date', label: '시험 날짜', t: 'date', top: 'date' },
          { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
          { k: 'semester', label: '학기', t: 'select', opts: ['1학기', '2학기'] },
          { k: 'scores', label: '과목별 점수 (평균은 자동으로 계산돼요)', t: 'rows', full: true, addLabel: '과목 추가',
            cols: [
              { k: 'subject', label: '과목', t: 'select', opts: subs, w: 2 },
              { k: 'score', label: '점수', t: 'number', w: 1 },
              { k: 'max', label: '만점(100)', t: 'number', w: 1 },
              { k: 'rank', label: '등급', w: 1 },
              { k: 'ach', label: '성취도', t: 'select', opts: ['A', 'B', 'C', 'D', 'E', 'P'], w: 1 },
              { k: 'diff', label: '난이도', t: 'select', opts: ['쉬움', '보통', '어려움'], w: 1 }
            ] },
          { k: 'review', label: '시험 후기', t: 'textarea', full: true, rows: 4 },
          { k: 'nextGoal', label: '다음 시험 목표', t: 'textarea', full: true },
          { k: 'photos', label: '시험지 및 성적표 사진', t: 'media', top: 'mediaIds', full: true }
        ];
      },
      newRec: function () { return { date: M.ui.today() }; },
      sub: function (r) { return [r.grade ? r.grade + '학년' : '', r.data.semester, r.data.kind, M.ui.fmtDate(r.date, false)].filter(Boolean).join(' · '); },
      badges: function (r) {
        const a = avgOf(r);
        return a == null ? '<span class="badge soft">점수 없음</span>' : '<span class="badge hot">평균 ' + a + '점</span><span class="badge soft">' + scoresOf(r).length + '과목</span>';
      },
      filters: [
        { label: '전체 학년', opts: ['1학년', '2학년', '3학년'], test: function (r, v) { return r.grade + '학년' === v; } },
        { key: 'semester', label: '전체 학기', opts: ['1학기', '2학기'] }
      ],
      sort: function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; },
      extra: examExtra
    },
    assess: {
      type: 'assessment', label: '수행평가', emoji: '📋', add: '수행평가 추가', noThumb: true,
      fields: async function () {
        const subs = await subjectNames();
        return [
          { k: 'title', label: '수행평가 이름', t: 'text', top: 'title', full: true },
          { k: 'subject', label: '과목', t: 'select', opts: subs },
          { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
          { k: 'date', label: '마감일', t: 'date', top: 'date' },
          { k: 'submitDate', label: '제출 날짜', t: 'date' },
          { k: 'method', label: '평가 방식', t: 'text', ph: '예: 보고서, 발표, 실기' },
          { k: 'status', label: '진행 상태', t: 'select', opts: ['준비 전', '진행 중', '제출 완료'] },
          { k: 'prep', label: '준비 내용', t: 'textarea', full: true },
          { k: 'score', label: '점수 및 평가', t: 'text', full: true },
          { k: 'files', label: '첨부 파일', t: 'media', top: 'mediaIds', full: true, files: true },
          { k: 'feedback', label: '수행평가 후기', t: 'textarea', full: true },
          { k: 'done', label: '✅ 완료', t: 'check' }
        ];
      },
      sub: function (r) { return [r.data.subject, r.data.method, '마감 ' + (M.ui.fmtDate(r.date, false) || '미정')].filter(Boolean).join(' · '); },
      badges: function (r) {
        if (r.data.done) return '<span class="badge soft">✅ 완료</span>';
        const n = M.ui.daysUntil(r.date);
        return (r.data.status ? '<span class="badge soft">' + M.ui.esc(r.data.status) + '</span>' : '') +
          (n == null ? '' : '<span class="badge ' + (n <= 7 ? 'hot' : 'soft') + '">' + M.ui.dday(n) + '</span>');
      },
      custom: function (list, base) {
        const todo = list.filter(function (r) { return !r.data.done; }).sort(function (a, b) { return (a.date || '9') < (b.date || '9') ? -1 : 1; });
        const done = list.filter(function (r) { return r.data.done; });
        return '<h2 class="sec-title">⏰ 해야 할 수행평가 <small>' + todo.length + '개</small></h2>' +
          (todo.length ? C.cards(CFG.assess, base, todo) : '<p class="empty">남은 수행평가가 없어요. 👏</p>') +
          '<h2 class="sec-title">✅ 완료 <small>' + done.length + '개</small></h2>' +
          (done.length ? '<div class="dim">' + C.cards(CFG.assess, base, done) + '</div>' : '<p class="empty">아직 없어요.</p>');
      }
    },
    study: {
      type: 'studyLog', label: '공부 기록', emoji: '⏱️', add: '공부 기록 추가', noThumb: true,
      fields: async function () {
        const subs = await subjectNames();
        return [
          { k: 'date', label: '날짜', t: 'date', top: 'date' },
          { k: 'subject', label: '과목', t: 'select', opts: subs },
          { k: 'minutes', label: '공부 시간', t: 'number', unit: '분' },
          { k: 'range', label: '공부한 범위', t: 'text' },
          { k: 'goal', label: '오늘의 학습 목표', t: 'text', full: true },
          { k: 'goalDone', label: '🎯 목표 달성', t: 'check' },
          { k: 'books', label: '사용한 교재', t: 'link', of: 'book', full: true, emptyText: '교재 탭에서 문제집·교재를 등록하면 여기서 고를 수 있어요.' },
          { k: 'memo', label: '메모', t: 'textarea', full: true }
        ];
      },
      newRec: function () { return { date: M.ui.today() }; },
      titleOf: function (r) { return (r.data.subject || '공부') + ' ' + fmtMin(r.data.minutes); },
      sub: function (r) { return [M.ui.fmtDate(r.date), r.data.range].filter(Boolean).join(' · '); },
      badges: function (r) { return r.data.goal ? '<span class="badge ' + (r.data.goalDone ? 'soft' : 'hot') + '">🎯 ' + (r.data.goalDone ? '목표 달성' : '목표 진행 중') + '</span>' : ''; },
      sort: function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; },
      before: function (all) {
        const U = M.ui;
        const t = U.parse(U.today());
        const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
        const days = Array.from({ length: 7 }, function (_, i) { const d = new Date(mon); d.setDate(mon.getDate() + i); return U.ymd(d); });
        const week = all.filter(function (r) { return days.indexOf(r.date) >= 0; });
        const total = week.reduce(function (s, r) { return s + (Number(r.data.minutes) || 0); }, 0);
        const ym = U.today().slice(0, 7);
        const monthTotal = all.filter(function (r) { return (r.date || '').slice(0, 7) === ym; }).reduce(function (s, r) { return s + (Number(r.data.minutes) || 0); }, 0);
        return '<section class="card tape week-card"><h2 class="sec-title">📅 이번 주 공부 <small>총 ' + fmtMin(total) + ' · 이번 달 ' + fmtMin(monthTotal) + '</small></h2>' +
          C.barList(days.map(function (d, i) {
            const m = week.filter(function (r) { return r.date === d; }).reduce(function (s, r) { return s + (Number(r.data.minutes) || 0); }, 0);
            return { label: ['월', '화', '수', '목', '금', '토', '일'][i] + (d === U.today() ? ' (오늘)' : ''), value: m, display: fmtMin(m) };
          }), '', '이번 주 공부 기록이 아직 없어요.') + '</section>';
      }
    },
    books: {
      type: 'book', label: '교재', emoji: '📘', add: '교재 추가',
      fields: async function () {
        const subs = await subjectNames();
        return [
          { k: 'title', label: '교재 · 문제집 이름', t: 'text', top: 'title', full: true },
          { k: 'subject', label: '과목', t: 'select', opts: subs },
          { k: 'publisher', label: '출판사', t: 'text' },
          { k: 'status', label: '상태', t: 'select', opts: ['공부 중', '다 풀었어요', '쉬는 중'] },
          { k: 'progress', label: '진도', t: 'text', ph: '예: 3단원까지, 120/300쪽' },
          { k: 'photos', label: '표지 사진', t: 'media', top: 'mediaIds', full: true },
          { k: 'memo', label: '메모', t: 'textarea', full: true }
        ];
      },
      sub: function (r) { return [r.data.subject, r.data.publisher, r.data.progress].filter(Boolean).join(' · '); },
      badges: function (r) { return r.data.status ? '<span class="badge ' + (r.data.status === '공부 중' ? 'hot' : 'soft') + '">' + M.ui.esc(r.data.status) + '</span>' : ''; },
      filters: [{ key: 'status', label: '모든 상태', opts: ['공부 중', '다 풀었어요', '쉬는 중'] }]
    },
    subjects: {
      type: 'subject', label: '과목', emoji: '📚', add: '과목 추가', noThumb: true,
      fields: [
        { k: 'title', label: '과목 이름', t: 'text', top: 'title' },
        { k: 'order', label: '보여줄 순서', t: 'number', hint: '숫자가 작을수록 앞에 나와요.' },
        { k: 'hidden', label: '🙈 과목 고르는 목록에서 숨기기', t: 'check', full: true, hint: '이미 쓴 기록은 그대로 남아요.' },
        { k: 'memo', label: '메모 (선생님, 교과서 등)', t: 'textarea', full: true }
      ],
      newRec: function () { return { data: { order: 50 } }; },
      sort: function (a, b) { return (Number(a.data.order) || 99) - (Number(b.data.order) || 99); },
      sub: function (r) { return r.data.memo ? M.ui.snippet(r.data.memo, 30) : ''; },
      badges: function (r) { return r.data.hidden ? '<span class="badge soft">숨김</span>' : ''; }
    }
  };

  /* ---------- 시험 상세 아래: 평균 · 지난 시험과 비교 ---------- */
  async function examExtra(exam) {
    const U = M.ui, esc = U.esc;
    const s = scoresOf(exam);
    if (!s.length) return '<section class="card tape-left"><h2 class="sec-title">📊 시험 결과</h2><p class="empty">과목별 점수를 적으면 평균이 자동으로 계산돼요.</p></section>';
    const all = (await M.db.list('exam')).filter(function (e) { return e.id !== exam.id && (e.date || '') < (exam.date || ''); })
      .sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; });
    const prev = all[0];
    const prevMap = {};
    if (prev) scoresOf(prev).forEach(function (x) { prevMap[x.subject] = x; });
    const avg = avgOf(exam), pavg = prev ? avgOf(prev) : null;
    const diffBadge = function (d) {
      if (d == null || isNaN(d)) return '';
      d = Math.round(d * 10) / 10;
      return '<span class="badge ' + (d > 0 ? 'hot' : 'soft') + '">' + (d > 0 ? '▲ ' + d : d < 0 ? '▼ ' + (-d) : '±0') + '</span>';
    };
    return '<section class="card tape-left"><h2 class="sec-title">📊 시험 결과</h2><div class="stat-grid">' +
        '<div class="stat"><span class="n">' + avg + '점</span><span class="l">평균 (100점 기준)</span></div>' +
        '<div class="stat"><span class="n">' + Math.round(s.reduce(function (a, b) { return a + b.score; }, 0) * 10) / 10 + '</span><span class="l">총점</span></div>' +
        '<div class="stat"><span class="n">' + s.length + '</span><span class="l">과목 수</span></div>' +
        (pavg != null ? '<div class="stat"><span class="n">' + diffBadge(avg - pavg) + '</span><span class="l">지난 시험 대비</span></div>' : '') +
      '</div>' +
      '<div class="tbl-wrap"><table class="cmp-table"><thead><tr><th>과목</th><th>점수</th><th>등급</th><th>성취도</th><th>난이도</th>' + (prev ? '<th>지난 시험</th>' : '') + '</tr></thead><tbody>' +
        s.map(function (x) {
          const p = prevMap[x.subject];
          return '<tr><th>' + esc(x.subject) + '</th><td>' + x.score + (x.max !== 100 ? ' / ' + x.max : '') + '</td><td>' + esc(x.rank || '-') + '</td><td>' + esc(x.ach || '-') + '</td><td>' + esc(x.diff || '-') + '</td>' +
            (prev ? '<td>' + (p ? p.score + ' ' + diffBadge(x.pct - p.pct) : '-') + '</td>' : '') + '</tr>';
        }).join('') +
      '</tbody></table></div>' +
      (prev ? '<p class="fhint">지난 시험: ' + esc(prev.title || '') + ' (' + esc(U.fmtDate(prev.date, false)) + ')</p>' : '') +
    '</section>';
  }

  /* ---------- 통계 ---------- */
  async function statsView(el, head) {
    const U = M.ui, esc = U.esc;
    const [exams, logs] = await Promise.all([M.db.list('exam'), M.db.list('studyLog')]);
    const bySub = {};
    exams.forEach(function (e) { scoresOf(e).forEach(function (x) { (bySub[x.subject] = bySub[x.subject] || []).push(x.pct); }); });
    const mean = function (a) { return a.length ? Math.round(a.reduce(function (s, v) { return s + v; }, 0) / a.length * 10) / 10 : null; };
    const subjectAvg = Object.keys(bySub).map(function (k) { const v = mean(bySub[k]); return { label: k, value: v, display: v + '점' }; })
      .sort(function (a, b) { return b.value - a.value; });

    const trend = exams.filter(function (e) { return e.date && avgOf(e) != null; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; })
      .map(function (e) { return { date: e.date, v: avgOf(e) }; });

    /* 학년별 비교 */
    const subs = Object.keys(bySub);
    const gradeAvg = function (g, sub) {
      const v = [];
      exams.filter(function (e) { return e.grade === g; }).forEach(function (e) { scoresOf(e).forEach(function (x) { if (x.subject === sub) v.push(x.pct); }); });
      return mean(v);
    };
    const gradeRows = subs.map(function (sub) {
      return '<tr><th>' + esc(sub) + '</th>' + [1, 2, 3].map(function (g) { const v = gradeAvg(g, sub); return '<td>' + (v == null ? '<span class="dim-text">-</span>' : v) + '</td>'; }).join('') + '</tr>';
    }).join('');

    /* 학기별 평균 */
    const semKey = function (e) { return e.grade && e.data.semester ? e.grade + '학년 ' + e.data.semester : null; };
    const sems = {};
    exams.forEach(function (e) { const k = semKey(e), a = avgOf(e); if (k && a != null) (sems[k] = sems[k] || []).push(a); });
    const semList = Object.keys(sems).sort().map(function (k) { const v = mean(sems[k]); return { label: k, value: v, display: v + '점' }; });

    const minBySub = {};
    logs.forEach(function (l) { const k = l.data.subject || '기타'; minBySub[k] = (minBySub[k] || 0) + (Number(l.data.minutes) || 0); });
    const subTime = Object.keys(minBySub).map(function (k) { return { label: k, value: minBySub[k], display: fmtMin(minBySub[k]) }; })
      .sort(function (a, b) { return b.value - a.value; });
    const monthTime = C.last12Months().map(function (m) {
      const v = logs.filter(function (l) { return (l.date || '').slice(0, 7) === m; }).reduce(function (s, l) { return s + (Number(l.data.minutes) || 0); }, 0);
      return { label: m.slice(2).replace('-', '.'), value: v, display: fmtMin(v) };
    });
    const goals = logs.filter(function (l) { return l.data.goal; });
    const done = goals.filter(function (l) { return l.data.goalDone; }).length;
    const rate = goals.length ? Math.round(done / goals.length * 100) : null;
    const total = logs.reduce(function (s, l) { return s + (Number(l.data.minutes) || 0); }, 0);

    el.innerHTML = head +
      '<div class="stat-grid card sum-card">' +
        '<div class="stat"><span class="n">' + exams.length + '</span><span class="l">시험 기록</span></div>' +
        '<div class="stat"><span class="n">' + (mean(trend.map(function (t) { return t.v; })) == null ? '-' : mean(trend.map(function (t) { return t.v; })) + '점') + '</span><span class="l">전체 평균</span></div>' +
        '<div class="stat"><span class="n">' + fmtMin(total) + '</span><span class="l">총 공부 시간</span></div>' +
        '<div class="stat"><span class="n">' + (rate == null ? '-' : rate + '%') + '</span><span class="l">목표 달성률 (' + done + '/' + goals.length + ')</span></div>' +
      '</div>' +
      M.ui.lineChart(trend, '📈 시험 평균 변화', '점') +
      '<div class="fandom-grid">' +
        '<section class="card tape"><h2 class="sec-title">📚 과목별 평균 점수</h2>' + C.barList(subjectAvg, '', '시험 점수를 기록하면 보여요.') + '</section>' +
        '<section class="card tape-left"><h2 class="sec-title">🗓️ 학기별 평균</h2>' + C.barList(semList, '', '학년과 학기를 적은 시험이 있으면 보여요.') + '</section>' +
        '<section class="card tape-corner"><h2 class="sec-title">⏱️ 과목별 공부 시간</h2>' + C.barList(subTime, '', '공부 기록을 남기면 보여요.') + '</section>' +
        '<section class="card tape"><h2 class="sec-title">📅 월별 공부 시간 (최근 12개월)</h2>' + C.barList(monthTime, '', '최근 12개월 공부 기록이 없어요.') + '</section>' +
      '</div>' +
      '<section class="card tape-left table-card"><h2 class="sec-title">🎒 학년별 과목 평균 비교</h2>' +
        (gradeRows ? '<div class="tbl-wrap"><table class="cmp-table"><thead><tr><th>과목</th><th>1학년</th><th>2학년</th><th>3학년</th></tr></thead><tbody>' + gradeRows + '</tbody></table></div>'
          : '<p class="empty">학년을 적은 시험 기록이 있으면 보여요.</p>') +
        '<p class="fhint">점수는 모두 100점 기준으로 바꿔서 평균을 내요.</p></section>';
  }

  M.mods.study = async function (el, sub) {
    const tab = TABS.some(function (t) { return t[0] === sub[0]; }) ? sub[0] : 'exams';
    const head = '<div class="sub-bar">' + M.ui.tabs(BASE, TABS, tab) + '</div>';
    await ensureSubjects();
    if (tab === 'stats') return statsView(el, head);
    const cfg = CFG[tab];
    if (sub[1] === 'new' || sub[1] === 'edit') return C.editPage(el, BASE + '/' + tab, cfg, sub.slice(1), 'study');
    return C.listPage(el, BASE + '/' + tab, head, cfg);
  };

  M.study = { avgOf: avgOf, fmtMin: fmtMin };
})();
