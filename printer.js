/* =========================================================
   다이어리 인쇄 · PDF · 졸업 포토북
   PDF는 브라우저 인쇄 창에서 "PDF로 저장"을 골라 만들어요. (외부로 보내지 않음)
   ========================================================= */
MMSD.printer = (function () {
  const M = window.MMSD;

  /* 기록 항목 이름 */
  const LABELS = {
    nickname: '별명', birth: '생년월일', classNo: '반', number: '번호', entryDate: '입학일', gradDate: '졸업 예정일', mbti: 'MBTI', blood: '혈액형',
    height: '키', weight: '몸무게', shoe: '신발 사이즈', foot: '발 크기', clothes: '옷 사이즈', bodyEtc: '기타 신체 변화',
    hobby: '취미', talent: '특기', likeFood: '좋아하는 음식', dislikeFood: '싫어하는 음식', color: '좋아하는 색깔', season: '좋아하는 계절',
    interests: '관심사', dream: '장래희망', motto: '좌우명 · 급훈', tmi: 'TMI', intro: '소개',
    face: '얼굴 변화', hair: '헤어스타일', skin: '피부 변화', fashion: '패션 스타일', voice: '목소리 변화', range: '음역대 · 공부 범위',
    singing: '노래 실력', sports: '운동 능력', newSkill: '새롭게 배운 기술', personality: '성격', confidence: '자신감 변화', values: '가치관 변화',
    birthday: '생일', relation: '관계', firstMet: '처음 만난 날', closeDate: '친해진 날', class1: '1학년 반', class2: '2학년 반', class3: '3학년 반',
    relationLog: '관계 변화', kind: '종류', place: '장소', content: '내용', friends: '함께한 친구', teachers: '함께한 선생님', others: '함께한 사람',
    weather: '날씨', mood: '기분', oneLine: '한마디', moment: '기억에 남는 순간', friendsMet: '만난 친구', teachersMet: '만난 선생님',
    food: '먹은 음식', song: '들은 노래', school: '학교생활', fandom: '덕질', achievement: '성취', regret: '아쉬웠던 일', memo: '메모',
    category: '카테고리', highlight: '기억에 남는 사건', review: '후기 · 감상', diaries: '관련 일기',
    honorific: '호칭', subject: '과목', years: '담당 학년도', homeroom: '담임', style: '수업 방식', quotes: '기억에 남는 말씀',
    funny: '재미있었던 일', thanks: '감사했던 순간', moments: '추억', field: '분야', teacher: '담당 선생님', joinDate: '가입', leaveDate: '탈퇴',
    grades: '활동 학년', regular: '정기 활동', special: '특별 활동', activities: '활동 기록', memorable: '기억에 남는 사건',
    classmates: '같은 반 친구', composition: '학급 구성', semester: '학기', done: '완료', org: '수여 기관', rank: '등급 · 순위',
    fromKind: '보낸 사람', fromTeacher: '보낸 선생님', fromFriend: '보낸 친구', fromText: '보낸 사람',
    job: '직업', agency: '소속', firstLiked: '처음 관심을 가진 날', reason: '좋아하는 이유', works: '연결된 작품', year: '제작 연도',
    producer: '제작사', watchedDate: '관람 날짜', castText: '출연진', cast: '출연 인물', favChar: '좋아하는 캐릭터', rating: '평점',
    work: '작품', time: '시간', venue: '공연장', round: '회차', seat: '좌석', companions: '동행인', casting: '캐스팅', castLinks: '캐스팅 인물',
    scenes: '기억에 남는 장면', status: '상태', price: '가격', shop: '구매처', persons: '인물', artist: '가수', composer: '작곡가', album: '앨범',
    playlists: '플레이리스트', event: '덕질 사건', scores: '과목별 점수', nextGoal: '다음 목표', submitDate: '제출 날짜', method: '평가 방식',
    prep: '준비 내용', score: '점수', feedback: '후기', minutes: '공부 시간', goal: '목표', goalDone: '목표 달성', books: '교재', publisher: '출판사', progress: '진도'
  };
  const UNITS = { height: 'cm', weight: 'kg', shoe: 'mm', foot: 'mm', minutes: '분', price: '원', year: '년' };
  const SKIP = { fav: 1, theme: 1, avatar: 1, cardStyle: 1, cardColor: 1, isCover: 1, secret: 1, items: 1, target: 1, order: 1, hidden: 1, table: 1, bg: 1, border: 1, themeId: 1 };
  const YES = { homeroom: '담임 선생님', done: '완료', goalDone: '달성' };

  function fmtVal(k, v, names) {
    const U = M.ui;
    if (v == null || v === '' || v === false || (Array.isArray(v) && !v.length)) return null;
    if (v === true) return YES[k] || '예';
    if (Array.isArray(v)) {
      if (typeof v[0] === 'object') {
        return v.map(function (o) {
          return Object.keys(o).map(function (kk) { const x = o[kk]; return /^\d{4}-\d{2}-\d{2}$/.test(x) ? U.fmtDate(x, false) : x; }).filter(Boolean).join(' · ');
        }).join('\n');
      }
      return v.map(function (x) { return names[x] || x; }).join(', ');
    }
    if (typeof v === 'object') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return U.fmtDate(v, false);
    if (typeof v === 'number' && k === 'price') return v.toLocaleString('ko-KR') + '원';
    return String(v) + (UNITS[k] && typeof v === 'number' ? UNITS[k] : '');
  }

  async function loadAll() {
    const [records, media] = await Promise.all([
      M.db._run(['records'], 'readonly', function (t) { return M.db._reqP(t.objectStore('records').getAll()); }),
      M.db._run(['media'], 'readonly', function (t) { return M.db._reqP(t.objectStore('media').getAll()); })
    ]);
    const live = records.filter(function (r) { return !r.trashed; });
    const names = {};
    live.forEach(function (r) { if (r.title) names[r.id] = r.title; });
    const kinds = {};
    media.forEach(function (m) { kinds[m.id] = m.kind; });
    return { records: live, names: names, kinds: kinds };
  }
  function imagesOf(rec, kinds, max) {
    return (rec.mediaIds || []).filter(function (id) { return kinds[id] === 'image'; }).slice(0, max || 6);
  }

  function recordBlock(rec, ctx, withPhotos) {
    const esc = M.ui.esc, U = M.ui;
    const rows = Object.keys(rec.data || {}).filter(function (k) { return !SKIP[k] && LABELS[k]; }).map(function (k) {
      const v = fmtVal(k, rec.data[k], ctx.names);
      return v ? '<div><dt>' + LABELS[k] + '</dt><dd>' + esc(v).replace(/\n/g, '<br>') + '</dd></div>' : '';
    }).join('');
    const imgs = withPhotos ? imagesOf(rec, ctx.kinds, 6) : [];
    return '<article class="pr-rec"><h3>' + esc(rec.title || '(제목 없음)') + '</h3>' +
      '<p class="pr-meta">' + [M.typeLabel(rec.type), rec.date ? U.fmtDate(rec.date) : '', rec.grade ? rec.grade + '학년' : ''].filter(Boolean).join(' · ') +
      (rec.tags && rec.tags.length ? ' · ' + rec.tags.map(function (t) { return '#' + esc(t); }).join(' ') : '') + '</p>' +
      (rows ? '<dl class="pr-dl">' + rows + '</dl>' : '') +
      (imgs.length ? '<div class="pr-photos">' + imgs.map(function (id) { return '<img data-media="' + esc(id) + '" data-variant="full" alt="">'; }).join('') + '</div>' : '') +
      '</article>';
  }

  /* 인쇄 전에 사진이 다 불러와질 때까지 기다림 */
  function waitImages(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    return Promise.all(imgs.map(function (img) {
      if (img.complete && img.naturalWidth) return true;
      return new Promise(function (res) {
        const t = setTimeout(res, 8000);
        img.addEventListener('load', function () { clearTimeout(t); res(); }, { once: true });
        img.addEventListener('error', function () { clearTimeout(t); res(); }, { once: true });
      });
    }));
  }
  async function print(root) {
    M.ui.hydrate(root);
    await new Promise(function (r) { setTimeout(r, 300); });
    await waitImages(root);
    /* 안드로이드 앱 안에서는 휴대폰의 인쇄 화면(PDF로 저장 가능)을 열어요 */
    if (window.AndroidDiary) window.AndroidDiary.print(document.title || '중학생활 다이어리');
    else window.print();
  }

  /* =========================================================
     다이어리 전체 인쇄
     ========================================================= */
  const GROUPS = [
    { id: 'profile', name: '🙋 프로필', types: ['profile'] },
    { id: 'growth', name: '🌱 성장 기록', types: ['growth'] },
    { id: 'diary', name: '📔 일상 다이어리', types: ['diary'] },
    { id: 'memory', name: '📸 추억 보관함', types: ['memory'] },
    { id: 'friends', name: '👭 친구 수첩', types: ['friend', 'friendMemory'] },
    { id: 'school', name: '🏫 학교생활 수첩', types: ['teacher', 'club', 'classInfo', 'timetable', 'schoolEvent', 'schedule', 'award', 'letter'] },
    { id: 'fandom', name: '💖 덕질노트', types: ['person', 'work', 'performance', 'goods', 'music', 'fandomDiary'] },
    { id: 'study', name: '📚 학업 기록', types: ['exam', 'assessment', 'studyLog', 'book'] }
  ];

  async function printView(el, head) {
    const esc = M.ui.esc;
    el.innerHTML = head +
      '<section class="card tape no-print"><h2 class="sec-title">🖨️ 다이어리 인쇄 · PDF</h2>' +
        '<p class="desc">인쇄할 메뉴를 고르고 "미리보기 만들기"를 누른 뒤 "인쇄 / PDF로 저장"을 눌러요. 인쇄 창에서 대상(프린터)을 <b>"PDF로 저장"</b>으로 바꾸면 PDF 파일이 돼요. 비공개 메모는 인쇄되지 않아요.</p>' +
        '<div class="choice" id="pGroups">' + GROUPS.map(function (g) {
          return '<label class="chk"><input type="checkbox" value="' + g.id + '" checked><span>' + g.name + '</span></label>';
        }).join('') + '</div>' +
        '<div class="toolbar-in mt8"><select class="inp" id="pGrade" aria-label="학년"><option value="">모든 학년</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option></select>' +
        '<label class="switch"><input type="checkbox" id="pPhotos" checked><span>사진 넣기</span></label>' +
        '<button type="button" class="btn" id="pMake">👀 미리보기 만들기</button>' +
        '<button type="button" class="btn primary" id="pPrint" disabled>🖨️ 인쇄 / PDF로 저장</button></div>' +
      '</section><div id="pDoc"></div>';
    const doc = el.querySelector('#pDoc');
    el.querySelector('#pMake').addEventListener('click', async function () {
      const groups = Array.from(el.querySelectorAll('#pGroups input:checked')).map(function (i) { return i.value; });
      const g = el.querySelector('#pGrade').value;
      const photos = el.querySelector('#pPhotos').checked;
      const ctx = await loadAll();
      const prof = ctx.records.find(function (r) { return r.type === 'profile'; });
      let html = '<div class="print-doc"><section class="pb-page pr-cover"><h1>📒 나의 중학생활 다이어리</h1><p>' +
        esc(prof && prof.title ? prof.title : '') + (g ? ' · ' + g + '학년' : '') + '</p><p class="pr-date">' + esc(M.ui.fmtDate(M.ui.today())) + ' 인쇄</p></section>';
      let total = 0;
      GROUPS.filter(function (x) { return groups.indexOf(x.id) >= 0; }).forEach(function (grp) {
        const list = ctx.records.filter(function (r) { return grp.types.indexOf(r.type) >= 0 && (!g || String(r.grade) === g || r.type === 'profile'); })
          .sort(function (a, b) { return grp.types.indexOf(a.type) - grp.types.indexOf(b.type) || ((a.date || '') < (b.date || '') ? -1 : 1); });
        if (!list.length) return;
        total += list.length;
        html += '<section class="pb-page"><h2 class="pr-h">' + grp.name + ' <small>' + list.length + '개</small></h2>' +
          list.map(function (r) { return recordBlock(r, ctx, photos); }).join('') + '</section>';
      });
      html += '</div>';
      doc.innerHTML = total ? html : M.ui.empty('🖨️', '고른 조건에 맞는 기록이 없어요.', null);
      M.ui.hydrate(doc);
      el.querySelector('#pPrint').disabled = !total;
      if (total) M.toast('미리보기를 만들었어요. 기록 ' + total + '개');
    });
    el.querySelector('#pPrint').addEventListener('click', function () { print(doc); });
  }

  /* =========================================================
     졸업 포토북
     ========================================================= */
  const SECTIONS = [
    ['cover', '📕 표지'], ['toc', '📑 목차'], ['grades', '🎒 학년별 기록'], ['friends', '👭 친구와의 추억'], ['school', '🏫 학교생활'],
    ['fandom', '💖 공연 및 덕질 기록'], ['growth', '🌱 성장 기록'], ['pages', '🎀 꾸민 페이지'], ['last', '💌 마지막 페이지']
  ];
  const DEFAULT = {
    title: '나의 중학교 3년', subtitle: '20XX ~ 20XX', grades: [1, 2, 3],
    sections: { cover: true, toc: true, grades: true, friends: true, school: true, fandom: true, growth: true, pages: false, last: true },
    coverId: '', lastMessage: '3년 동안 정말 고마웠어, 나의 중학교!\n앞으로도 반짝반짝 빛나길 ✨'
  };

  function photo(id, cls) { return id ? '<div class="pb-ph ' + (cls || '') + '"><img data-media="' + M.ui.esc(id) + '" data-variant="full" alt=""></div>' : ''; }
  function firstImg(r, ctx) { return imagesOf(r, ctx.kinds, 1)[0]; }
  function card(r, ctx, sub, text) {
    const esc = M.ui.esc;
    const img = firstImg(r, ctx);
    return '<div class="pb-card">' + (img ? photo(img) : '') + '<b>' + esc(r.title || '') + '</b>' +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + (text ? '<p>' + esc(M.ui.snippet(text, 120)) + '</p>' : '') + '</div>';
  }

  async function buildBook(cfg) {
    const U = M.ui, esc = U.esc;
    const ctx = await loadAll();
    const R = ctx.records;
    const of = function (t) { return R.filter(function (r) { return r.type === t; }); };
    const inG = function (r) { return !r.grade || cfg.grades.indexOf(Number(r.grade)) >= 0; };
    const byDate = function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; };
    const prof = of('profile')[0];
    const on = cfg.sections;
    const pages = [];
    const titles = [];

    if (on.cover) {
      const cover = R.find(function (r) { return r.id === cfg.coverId; });
      const img = cover ? firstImg(cover, ctx) : (prof ? firstImg(prof, ctx) : null);
      pages.push('<section class="pb-page pb-cover"><span class="pb-tape t1"></span><span class="pb-tape t2"></span>' +
        '<p class="pb-small">GRADUATION PHOTOBOOK</p><h1>' + esc(cfg.title) + '</h1><p class="pb-sub">' + esc(cfg.subtitle) + '</p>' +
        (img ? photo(img, 'pb-cover-ph') : '<div class="pb-cover-emoji">🎓</div>') +
        '<p class="pb-name">' + esc(prof && prof.title ? prof.title : '') + (prof && prof.data.nickname ? ' (' + esc(prof.data.nickname) + ')' : '') + '</p>' +
        '<span class="pb-stk s1">🌸</span><span class="pb-stk s2">⭐</span><span class="pb-stk s3">🎀</span></section>');
    }

    const body = [];
    if (on.grades) {
      cfg.grades.slice().sort().forEach(function (g) {
        const cls = of('classInfo').filter(function (r) { return Number(r.grade) === g; })[0];
        const mems = of('memory').filter(function (r) { return Number(r.grade) === g; }).sort(byDate);
        const dias = of('diary').filter(function (r) { return Number(r.grade) === g && (firstImg(r, ctx) || r.data.oneLine); }).sort(byDate).slice(0, 12);
        const evs = of('schoolEvent').filter(function (r) { return Number(r.grade) === g; }).sort(byDate);
        if (!cls && !mems.length && !dias.length && !evs.length) return;
        titles.push(g + '학년');
        body.push('<section class="pb-page"><h2 class="pb-h">🎒 ' + g + '학년</h2>' +
          (cls ? '<p class="pb-lead">' + esc(cls.title) + (cls.data.motto ? ' · “' + esc(cls.data.motto) + '”' : '') +
            ((cls.data.homeroom || []).length ? ' · 담임 ' + esc((cls.data.homeroom || []).map(function (i) { return ctx.names[i] || ''; }).join(', ')) : '') + '</p>' : '') +
          (mems.length ? '<h3 class="pb-h3">📸 추억</h3><div class="pb-grid">' + mems.map(function (m) { return card(m, ctx, U.fmtDate(m.date, false) + (m.data.category ? ' · ' + m.data.category : ''), m.data.highlight || m.data.review); }).join('') + '</div>' : '') +
          (evs.length ? '<h3 class="pb-h3">🎉 학교 행사</h3><div class="pb-grid">' + evs.map(function (m) { return card(m, ctx, U.fmtDate(m.date, false), m.data.content); }).join('') + '</div>' : '') +
          (dias.length ? '<h3 class="pb-h3">📔 그날의 일기</h3><div class="pb-grid">' + dias.map(function (d) {
            return card(d, ctx, U.fmtDate(d.date, false) + ' ' + (d.data.mood || '') + ' ' + (d.data.weather || '').split(' ')[0], d.data.moment);
          }).join('') + '</div>' : '') + '</section>');
      });
    }
    if (on.friends) {
      const fr = of('friend').filter(function (f) {
        const gs = [1, 2, 3].filter(function (g) { return f.data['class' + g]; });
        return !gs.length || gs.some(function (g) { return cfg.grades.indexOf(g) >= 0; });
      });
      const fm = of('friendMemory').filter(inG).sort(byDate);
      if (fr.length || fm.length) {
        titles.push('친구와의 추억');
        body.push('<section class="pb-page"><h2 class="pb-h">👭 친구와의 추억</h2>' +
          (fr.length ? '<div class="pb-grid">' + fr.map(function (f) { return card(f, ctx, [f.data.nickname, f.data.relation].filter(Boolean).join(' · '), (f.tags || []).map(function (t) { return '#' + t; }).join(' ') + ' ' + (f.data.memo || '')); }).join('') + '</div>' : '') +
          (fm.length ? '<h3 class="pb-h3">💭 함께한 순간</h3><div class="pb-grid">' + fm.map(function (m) { return card(m, ctx, U.fmtDate(m.date, false) + (m.data.kind ? ' · ' + m.data.kind : ''), m.data.content); }).join('') + '</div>' : '') +
          '</section>');
      }
    }
    if (on.school) {
      const te = of('teacher').filter(inG), cl = of('club'), aw = of('award').filter(inG).sort(byDate), le = of('letter').filter(inG).sort(byDate);
      if (te.length || cl.length || aw.length || le.length) {
        titles.push('학교생활');
        body.push('<section class="pb-page"><h2 class="pb-h">🏫 학교생활</h2>' +
          (te.length ? '<h3 class="pb-h3">👩‍🏫 선생님</h3><div class="pb-grid">' + te.map(function (t) { return card(t, ctx, [t.data.subject, t.grade ? t.grade + '학년' : '', t.data.homeroom ? '담임' : ''].filter(Boolean).join(' · '), t.data.quotes ? '“' + t.data.quotes + '”' : t.data.thanks); }).join('') + '</div>' : '') +
          (cl.length ? '<h3 class="pb-h3">🎨 동아리</h3><div class="pb-grid">' + cl.map(function (c) { return card(c, ctx, c.data.field || '', c.data.memorable || c.data.regular); }).join('') + '</div>' : '') +
          (aw.length ? '<h3 class="pb-h3">🏆 상장</h3><ul class="pb-list">' + aw.map(function (a) { return '<li><b>' + esc(a.title) + '</b> ' + esc([a.data.rank, U.fmtDate(a.date, false)].filter(Boolean).join(' · ')) + '</li>'; }).join('') + '</ul>' : '') +
          (le.length ? '<h3 class="pb-h3">💌 받은 편지</h3><div class="pb-grid">' + le.map(function (l) { return card(l, ctx, [l.data.fromKind, U.fmtDate(l.date, false)].filter(Boolean).join(' · '), l.data.content); }).join('') + '</div>' : '') +
          '</section>');
      }
    }
    if (on.fandom) {
      const ps = of('person'), sh = of('performance').sort(byDate), wk = of('work');
      if (ps.length || sh.length || wk.length) {
        titles.push('공연 및 덕질 기록');
        body.push('<section class="pb-page"><h2 class="pb-h">💖 공연 및 덕질 기록</h2>' +
          (ps.length ? '<h3 class="pb-h3">🌟 좋아한 사람들</h3><div class="pb-grid">' + ps.map(function (p) { return card(p, ctx, p.data.job || '', p.data.reason); }).join('') + '</div>' : '') +
          (wk.length ? '<h3 class="pb-h3">🎭 작품</h3><div class="pb-grid">' + wk.map(function (w) { return card(w, ctx, [w.data.field, w.data.rating].filter(Boolean).join(' · '), w.data.review); }).join('') + '</div>' : '') +
          (sh.length ? '<h3 class="pb-h3">🎫 관람 기록 · 총 ' + sh.length + '회</h3><ul class="pb-list">' + sh.map(function (s) { return '<li>' + esc(U.fmtDate(s.date, false)) + ' <b>' + esc(s.title) + '</b> ' + esc(s.data.venue || '') + '</li>'; }).join('') + '</ul>' : '') +
          '</section>');
      }
    }
    if (on.growth) {
      const gr = of('growth').sort(byDate);
      if (gr.length) {
        titles.push('성장 기록');
        const last = function (g, k) {
          const l = gr.filter(function (r) { return Number(r.grade) === g && r.data[k] != null && r.data[k] !== ''; });
          return l.length ? l[l.length - 1].data[k] : null;
        };
        const ph = function (g) { const l = gr.filter(function (r) { return Number(r.grade) === g && firstImg(r, ctx); }); return l.length ? firstImg(l[l.length - 1], ctx) : null; };
        const gs = cfg.grades.slice().sort();
        const rows = [['height', '키', 'cm'], ['weight', '몸무게', 'kg'], ['shoe', '신발', 'mm'], ['dream', '장래희망', ''], ['interests', '관심사', ''], ['voice', '목소리', '']];
        body.push('<section class="pb-page"><h2 class="pb-h">🌱 성장 기록</h2><div class="pb-grow">' +
          gs.map(function (g) { return '<div class="pb-gcol"><h3 class="pb-h3">' + g + '학년</h3>' + (photo(ph(g)) || '<div class="pb-ph empty">🌱</div>') + '</div>'; }).join('') + '</div>' +
          '<table class="pb-table"><thead><tr><th></th>' + gs.map(function (g) { return '<th>' + g + '학년</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><th>' + r[1] + '</th>' + gs.map(function (g) { const v = last(g, r[0]); return '<td>' + (v == null ? '-' : esc(v) + r[2]) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></section>');
      }
    }
    if (on.pages) {
      const ps = of('page');
      if (ps.length) {
        titles.push('꾸민 페이지');
        const host = document.querySelector('.d-stage') || document.documentElement;
        for (const p of ps) {
          try {
            const c = await M.deco.toCanvas(p, host);
            body.push('<section class="pb-page pb-deco"><img src="' + c.toDataURL('image/jpeg', 0.9) + '" alt="' + esc(p.title) + '"></section>');
          } catch (e) { /* 그리지 못한 페이지는 건너뜀 */ }
        }
      }
    }
    if (on.toc && titles.length) {
      pages.push('<section class="pb-page pb-toc"><h2 class="pb-h">📑 목차</h2><ol>' + titles.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></section>');
    }
    pages.push.apply(pages, body);
    if (on.last) {
      pages.push('<section class="pb-page pb-last"><span class="pb-tape t1"></span><div class="pb-last-emoji">🎓</div><h2>졸업을 축하해!</h2>' +
        '<p class="pb-msg">' + esc(cfg.lastMessage).replace(/\n/g, '<br>') + '</p><p class="pb-small">' + esc(U.fmtDate(U.today())) + '</p>' +
        '<span class="pb-stk s1">💐</span><span class="pb-stk s3">✨</span></section>');
    }
    return '<div class="print-doc pb-book">' + pages.join('') + '</div>';
  }

  async function photobookView(el, head) {
    const esc = M.ui.esc;
    const saved = await M.db.getMeta('photobook');
    const cfg = Object.assign({}, DEFAULT, saved || {});
    cfg.sections = Object.assign({}, DEFAULT.sections, (saved && saved.sections) || {});
    const prof = await M.ui.loadProfile();
    if (!saved && prof && prof.data.entryDate) {
      const y = Number(prof.data.entryDate.slice(0, 4));
      cfg.subtitle = y + ' ~ ' + (prof.data.gradDate ? prof.data.gradDate.slice(0, 4) : y + 3);
    }
    const mems = (await M.db.list('memory')).concat(await M.db.list('schoolEvent')).filter(function (r) { return (r.mediaIds || []).length; });

    el.innerHTML = head +
      '<section class="card tape no-print pb-controls"><h2 class="sec-title">📚 졸업 기념 포토북 만들기</h2>' +
        '<p class="desc">넣고 싶은 학년과 내용을 고르면 아래에 포토북이 만들어져요. "인쇄 / PDF로 저장"을 누르고 대상을 <b>"PDF로 저장"</b>으로 고르면 PDF 포토북이 돼요. 설정은 자동으로 저장돼요.</p>' +
        '<div class="form-grid pb-form">' +
          '<div class="field"><label class="flabel" for="bTitle">포토북 제목</label><input class="inp" id="bTitle" value="' + esc(cfg.title) + '"></div>' +
          '<div class="field"><label class="flabel" for="bSub">부제목 · 기간</label><input class="inp" id="bSub" value="' + esc(cfg.subtitle) + '"></div>' +
          '<div class="field full"><span class="flabel">넣을 학년</span><div class="choice">' + [1, 2, 3].map(function (g) {
            return '<label class="chk"><input type="checkbox" data-bg="' + g + '"' + (cfg.grades.indexOf(g) >= 0 ? ' checked' : '') + '><span>' + g + '학년</span></label>';
          }).join('') + '</div></div>' +
          '<div class="field full"><span class="flabel">넣을 내용</span><div class="choice">' + SECTIONS.map(function (s) {
            return '<label class="chk"><input type="checkbox" data-bs="' + s[0] + '"' + (cfg.sections[s[0]] ? ' checked' : '') + '><span>' + s[1] + '</span></label>';
          }).join('') + '</div></div>' +
          '<div class="field full"><label class="flabel" for="bCover">표지 사진</label><select class="inp" id="bCover"><option value="">프로필 사진 (없으면 🎓)</option>' +
            mems.map(function (m) { return '<option value="' + m.id + '"' + (cfg.coverId === m.id ? ' selected' : '') + '>' + esc(m.title) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field full"><label class="flabel" for="bLast">마지막 페이지에 남길 말</label><textarea class="inp" id="bLast" rows="3">' + esc(cfg.lastMessage) + '</textarea></div>' +
        '</div>' +
        '<div class="toolbar-in"><button type="button" class="btn" id="bMake">👀 포토북 미리보기</button><button type="button" class="btn primary" id="bPrint" disabled>🖨️ 인쇄 / PDF로 저장</button></div>' +
      '</section><div id="bDoc"></div>';

    const $ = function (s) { return el.querySelector(s); };
    function read() {
      return {
        title: $('#bTitle').value.trim() || DEFAULT.title, subtitle: $('#bSub').value.trim(),
        grades: Array.from(el.querySelectorAll('[data-bg]:checked')).map(function (i) { return Number(i.dataset.bg); }),
        sections: SECTIONS.reduce(function (o, s) { o[s[0]] = !!el.querySelector('[data-bs="' + s[0] + '"]').checked; return o; }, {}),
        coverId: $('#bCover').value, lastMessage: $('#bLast').value
      };
    }
    const saver = M.autosave.create(function (v) { return M.db.setMeta('photobook', v); }, 600);
    el.querySelector('.pb-controls').addEventListener('input', function () { saver.schedule(read); });
    el.querySelector('.pb-controls').addEventListener('change', function () { saver.schedule(read); });
    const doc = $('#bDoc');
    $('#bMake').addEventListener('click', async function (e) {
      const b = e.currentTarget;
      const c = read();
      if (!c.grades.length) { M.toast('학년을 하나 이상 골라 주세요.', true); return; }
      b.disabled = true; b.textContent = '⏳ 만드는 중…';
      try {
        doc.innerHTML = await buildBook(c);
        M.ui.hydrate(doc);
        const n = doc.querySelectorAll('.pb-page').length;
        $('#bPrint').disabled = !n;
        M.toast('포토북 ' + n + '장(섹션)을 만들었어요 📚');
      } catch (err) { M.toast('포토북을 만들지 못했어요: ' + M.db.friendly(err).message, true); }
      b.disabled = false; b.textContent = '👀 포토북 미리보기';
    });
    $('#bPrint').addEventListener('click', function () { print(doc); });
  }

  return { printView: printView, photobookView: photobookView, buildBook: buildBook, recordBlock: recordBlock, loadAll: loadAll };
})();
