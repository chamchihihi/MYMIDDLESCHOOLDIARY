/* 화면 공통 도우미: 날짜, 학년 계산, 사진 표시, 목록 카드 등 */
(function () {
  const M = window.MMSD;
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function parse(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
    const p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function fmtDate(s, withWeek) {
    const d = parse(s);
    if (!d) return '';
    return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + (withWeek === false ? '' : ' (' + WEEK[d.getDay()] + ')');
  }
  function fmtStamp(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* 프로필의 입학일을 기준으로 날짜의 학년 계산 (학년은 3월 1일에 바뀜) */
  function gradeFor(dateStr) {
    const p = M.profile;
    const entry = p && p.data && p.data.entryDate;
    const e = parse(entry), d = parse(dateStr);
    if (!e || !d) return null;
    const sy = function (x) { return x.getMonth() >= 2 ? x.getFullYear() : x.getFullYear() - 1; };
    const g = sy(d) - sy(e) + 1;
    return g >= 1 && g <= 3 ? g : null;
  }

  async function loadProfile() {
    try {
      const l = await M.db.list('profile');
      M.profile = l[0] || null;
    } catch (e) { M.profile = null; }
    return M.profile;
  }

  /* <img data-media="id"> 에 저장된 사진을 채움 */
  function hydrate(root) {
    root.querySelectorAll('img[data-media]').forEach(function (img) {
      M.media.url(img.dataset.media, img.dataset.variant || 'thumb').then(function (u) {
        if (u) img.src = u;
        else img.replaceWith(Object.assign(document.createElement('span'), { textContent: '🖼️' }));
      }).catch(function () {});
    });
  }

  function thumb(rec, emoji, cls) {
    const id = (rec.mediaIds || [])[0];
    return '<div class="thumb ' + (cls || '') + '">' +
      (id ? '<img data-media="' + esc(id) + '" alt="">' : '<span aria-hidden="true">' + emoji + '</span>') + '</div>';
  }

  function empty(emoji, text, href, label) {
    return '<div class="empty-state card"><div class="es-emoji" aria-hidden="true">' + emoji + '</div><p>' + text + '</p>' +
      (href ? '<a class="btn primary" href="' + href + '">' + label + '</a>' : '') + '</div>';
  }

  function tabs(base, items, active) {
    return '<nav class="tabs" aria-label="하위 메뉴">' + items.map(function (it) {
      return '<a href="#/' + base + '/' + it[0] + '"' + (it[0] === active ? ' aria-current="page"' : '') + '>' + it[1] + '</a>';
    }).join('') + '</nav>';
  }

  function match(rec, q) {
    if (!q) return true;
    return JSON.stringify([rec.title, rec.tags, rec.data, rec.date]).toLowerCase().indexOf(q.toLowerCase()) >= 0;
  }

  function daysToBirthday(dateStr) {
    const b = parse(dateStr);
    if (!b) return null;
    const t = parse(today());
    let n = new Date(t.getFullYear(), b.getMonth(), b.getDate());
    if (n < t) n = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
    return Math.round((n - t) / 86400000);
  }
  function daysUntil(dateStr) {
    const d = parse(dateStr);
    if (!d) return null;
    return Math.round((d - parse(today())) / 86400000);
  }
  function dday(n) { return n === 0 ? 'D-DAY' : (n > 0 ? 'D-' + n : 'D+' + (-n)); }

  function gradeLabel(g) { return g ? g + '학년' : '학년 미정'; }

  /* 학년별 묶기: [[1, [...]], [2, [...]], [3, [...]], [null, [...]]] */
  function byGrade(list, getGrade) {
    const groups = { 1: [], 2: [], 3: [], x: [] };
    list.forEach(function (r) {
      const g = getGrade ? getGrade(r) : r.grade;
      (groups[g] || groups.x).push(r);
    });
    return [[1, groups[1]], [2, groups[2]], [3, groups[3]], [null, groups.x]].filter(function (g) { return g[1].length; });
  }

  async function nameMap(type) {
    const m = {};
    (await M.db.list(type)).forEach(function (r) { m[r.id] = r.title || '(이름 없음)'; });
    return m;
  }

  function snippet(s, n) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  /* 기록 종류별 화면 주소 */
  const ROUTES = {
    profile: '#/profile', growth: '#/growth/edit/', friend: '#/friends/edit/', friendMemory: '#/friends/memory/edit/',
    diary: '#/diary/edit/', memory: '#/memories/edit/',
    teacher: '#/school/teachers/edit/', club: '#/school/clubs/edit/', classInfo: '#/school/class/edit/', timetable: '#/school/timetable/edit/',
    schoolEvent: '#/school/events/edit/', schedule: '#/school/schedule/edit/', award: '#/school/awards/edit/', letter: '#/school/letters/edit/',
    person: '#/fandom/persons/edit/', work: '#/fandom/works/edit/', performance: '#/fandom/shows/edit/', goods: '#/fandom/goods/edit/',
    music: '#/fandom/music/edit/', fandomDiary: '#/fandom/diary/edit/',
    exam: '#/study/exams/edit/', assessment: '#/study/assess/edit/', studyLog: '#/study/study/edit/', book: '#/study/books/edit/', subject: '#/study/subjects/edit/',
    page: '#/decorate/edit/'
  };
  function hrefOf(rec) {
    const r = ROUTES[rec.type];
    if (!r) return null;
    return rec.type === 'profile' ? r : r + rec.id;
  }

  /* ---------- 파일 저장 (브라우저 · 안드로이드 앱 공용) ----------
     앱 안에서는 window.AndroidDiary 연결 장치로 휴대폰의 Download 폴더에 저장해요. */
  M.savedWhere = function () {
    return window.AndroidDiary ? '휴대폰의 Download/중학생활다이어리 폴더에 저장했어요.' : '다운로드 폴더를 확인해 주세요.';
  };
  M.saveFile = async function (blob, name) {
    if (window.AndroidDiary) {
      const A = window.AndroidDiary;
      const id = A.begin(name, blob.type || 'application/octet-stream');
      if (!id || id.indexOf('ERR:') === 0) throw MMSD.AppError('SAVE', '파일을 저장하지 못했어요. ' + String(id || '').slice(4));
      const CH = 3 * 131072; /* 3의 배수로 잘라야 조각마다 따로 바꿀 수 있어요 */
      for (let o = 0; o < blob.size; o += CH) {
        const buf = new Uint8Array(await blob.slice(o, o + CH).arrayBuffer());
        let s = '';
        for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        const r = A.write(id, btoa(s));
        if (r !== 'OK') throw MMSD.AppError('SAVE', '파일을 저장하는 중 문제가 생겼어요. ' + String(r).slice(4));
      }
      const f = A.finish(id);
      if (f !== 'OK') throw MMSD.AppError('SAVE', '파일을 저장하지 못했어요. ' + String(f).slice(4));
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };

  M.ui = {
    hrefOf: hrefOf,
    esc: esc, pad: pad, ymd: ymd, today: today, parse: parse, WEEK: WEEK,
    fmtDate: fmtDate, fmtStamp: fmtStamp, gradeFor: gradeFor, gradeLabel: gradeLabel,
    loadProfile: loadProfile, hydrate: hydrate, thumb: thumb, empty: empty, tabs: tabs,
    match: match, daysToBirthday: daysToBirthday, daysUntil: daysUntil, dday: dday,
    byGrade: byGrade, nameMap: nameMap, snippet: snippet
  };
})();
