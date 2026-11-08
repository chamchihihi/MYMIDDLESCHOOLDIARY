/* =========================================================
   통합 검색 · 설정 및 데이터 관리 (화면 · 백업 · 인쇄 · 포토북 · 휴지통 · 계정 · 저장 공간)
   ========================================================= */
(function () {
  const M = window.MMSD;

  /* 기록 종류 이름 (검색 카테고리) */
  const TYPE_INFO = {
    diary: ['📔', '일기'], friend: ['👭', '친구'], friendMemory: ['💭', '친구와의 추억'], teacher: ['👩‍🏫', '선생님'], club: ['🎨', '동아리'],
    performance: ['🎫', '공연'], person: ['🌟', '배우·인물'], work: ['🎭', '작품'], goods: ['🛍️', '굿즈'], memory: ['📸', '추억'],
    exam: ['📝', '시험'], assessment: ['📋', '수행평가'], studyLog: ['⏱️', '공부 기록'],
    profile: ['🙋', '프로필'], growth: ['🌱', '성장 기록'], classInfo: ['🏫', '반 정보'], timetable: ['🗓️', '시간표'],
    schoolEvent: ['🎉', '학교 행사'], schedule: ['📌', '일정'], award: ['🏆', '상장'], letter: ['💌', '편지'],
    music: ['🎵', '음악'], fandomDiary: ['💖', '덕질 일기'], book: ['📘', '교재'], subject: ['📚', '과목'],
    page: ['🎀', '꾸민 페이지'], sticker: ['🧸', '나만의 스티커']
  };
  const SEARCH_CATS = ['diary', 'friend', 'friendMemory', 'teacher', 'club', 'performance', 'person', 'work', 'goods', 'memory', 'exam', 'assessment', 'studyLog',
    'profile', 'growth', 'classInfo', 'timetable', 'schoolEvent', 'schedule', 'award', 'letter', 'music', 'fandomDiary', 'book', 'page'];
  function typeLabel(t) { const i = TYPE_INFO[t]; return i ? i[0] + ' ' + i[1] : t; }

  async function allRecords() {
    return M.db._run(['records'], 'readonly', function (t) { return M.db._reqP(t.objectStore('records').getAll()); });
  }

  /* ---------- 검색용 글자 모으기 ---------- */
  const SKIP = { theme: 1, cardStyle: 1, cardColor: 1, avatar: 1, items: 1, target: 1, order: 1, hidden: 1 };
  function flatten(v, names, out, people) {
    if (v == null || v === '' || v === false) return;
    if (Array.isArray(v)) { v.forEach(function (x) { flatten(x, names, out, people); }); return; }
    if (typeof v === 'object') { Object.keys(v).forEach(function (k) { if (!SKIP[k]) flatten(v[k], names, out, people); }); return; }
    const s = String(v);
    if (names[s]) { people.push(names[s]); return; }   /* 연결된 기록 id → 이름 */
    if (v === true) return;
    out.push(s);
  }
  function indexOf(rec, names) {
    const content = [], people = [];
    Object.keys(rec.data || {}).forEach(function (k) { if (!SKIP[k]) flatten(rec.data[k], names, content, people); });
    if (rec.type === 'page') (rec.data.items || []).forEach(function (it) { if (it.text) content.push(it.text); });
    return {
      title: rec.title || '',
      content: content.join(' · '),
      people: people.join(' · '),
      tags: (rec.tags || []).join(' '),
      date: rec.date || ''
    };
  }

  function hl(text, q) {
    const esc = M.ui.esc;
    if (!q) return esc(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function around(text, q, n) {
    if (!text) return '';
    const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) return M.ui.snippet(text, n * 2);
    const s = Math.max(0, i - n);
    return (s > 0 ? '…' : '') + text.slice(s, i + q.length + n) + (i + q.length + n < text.length ? '…' : '');
  }

  /* ---------- 통합 검색 화면 ---------- */
  M.mods.search = async function (el, sub) {
    const U = M.ui, esc = U.esc;
    const all = (await allRecords()).filter(function (r) { return !r.trashed && TYPE_INFO[r.type] && r.type !== 'sticker'; });
    const names = {};
    all.forEach(function (r) { if (r.title) names[r.id] = r.title; });
    const idx = new Map();
    all.forEach(function (r) { idx.set(r.id, indexOf(r, names)); });
    const tags = Array.from(new Set(all.reduce(function (a, r) { return a.concat(r.tags || []); }, []))).sort();
    const q0 = sub[0] ? decodeURIComponent(sub[0]) : '';

    el.innerHTML =
      '<form class="card tape search-form" id="sForm" role="search">' +
        '<div class="search-main"><input class="inp" type="search" id="sQ" value="' + esc(q0) + '" placeholder="찾고 싶은 말을 적어 보세요" aria-label="검색어">' +
        '<select class="inp" id="sIn" aria-label="검색 조건"><option value="all">전체에서</option><option value="title">제목</option><option value="content">내용</option>' +
          '<option value="people">인물 (연결된 친구·선생님·배우)</option><option value="tags">태그</option><option value="date">날짜 (예: 2026-05)</option></select></div>' +
        '<div class="search-filters">' +
          '<select class="inp" id="sCat" aria-label="카테고리"><option value="">모든 카테고리</option>' +
            SEARCH_CATS.map(function (t) { return '<option value="' + t + '">' + typeLabel(t) + '</option>'; }).join('') + '</select>' +
          '<select class="inp" id="sGrade" aria-label="학년"><option value="">모든 학년</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option></select>' +
          '<select class="inp" id="sTag" aria-label="태그"><option value="">모든 태그</option>' + tags.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select>' +
          '<label class="date-range"><span>기간</span><input class="inp" type="date" id="sFrom" aria-label="시작 날짜"> ~ <input class="inp" type="date" id="sTo" aria-label="끝 날짜"></label>' +
        '</div></form>' +
      '<div id="sRes" aria-live="polite"></div>';

    const $ = function (id) { return el.querySelector('#' + id); };
    const qIn = $('sQ'), res = $('sRes');
    let timer = null;

    function run() {
      const q = qIn.value.trim();
      const where = $('sIn').value, cat = $('sCat').value, g = $('sGrade').value, tag = $('sTag').value, from = $('sFrom').value, to = $('sTo').value;
      M.replaceHash('#/search/' + encodeURIComponent(q));
      const anyFilter = cat || g || tag || from || to;
      if (!q && !anyFilter) {
        res.innerHTML = '<p class="empty center">검색어를 적거나 카테고리·학년·태그·기간을 골라 보세요. 일기, 친구, 선생님, 동아리, 공연, 배우, 작품, 굿즈, 추억, 시험, 수행평가, 공부 기록을 한 번에 찾아요.</p>';
        return;
      }
      const ql = q.toLowerCase();
      const hits = all.filter(function (r) {
        if (cat && r.type !== cat) return false;
        if (g && String(r.grade) !== g) return false;
        if (tag && (r.tags || []).indexOf(tag) < 0) return false;
        if ((from || to) && !r.date) return false;
        if (from && r.date < from) return false;
        if (to && r.date > to) return false;
        if (!q) return true;
        const x = idx.get(r.id);
        const fields = where === 'all' ? [x.title, x.content, x.people, x.tags, x.date] : [x[where]];
        return fields.some(function (f) { return f.toLowerCase().indexOf(ql) >= 0; });
      }).sort(function (a, b) { return (b.date || b.updatedAt) < (a.date || a.updatedAt) ? -1 : 1; });

      if (!hits.length) { res.innerHTML = '<p class="empty center">찾는 기록이 없어요. 다른 말로 찾아보거나 조건을 줄여 보세요.</p>'; return; }
      const groups = {};
      hits.forEach(function (r) { (groups[r.type] = groups[r.type] || []).push(r); });
      const order = SEARCH_CATS.filter(function (t) { return groups[t]; });
      res.innerHTML = '<p class="search-count">' + hits.length + '개의 기록을 찾았어요</p>' +
        '<div class="search-jump">' + order.map(function (t) { return '<a href="#" data-jump="' + t + '">' + typeLabel(t) + ' ' + groups[t].length + '</a>'; }).join('') + '</div>' +
        order.map(function (t) {
          return '<section class="search-group" id="sg-' + t + '"><h2 class="sec-title">' + typeLabel(t) + ' <small>' + groups[t].length + '개</small></h2>' +
            groups[t].map(function (r) {
              const x = idx.get(r.id);
              const href = U.hrefOf(r) || '#';
              const showText = (where === 'people' ? x.people : where === 'tags' ? x.tags : x.content) || x.people;
              return '<a class="search-hit card" href="' + href + '">' +
                '<span class="sh-title">' + hl(r.title || '(제목 없음)', q) + '</span>' +
                '<span class="sh-meta">' + [r.date ? U.fmtDate(r.date) : '', r.grade ? r.grade + '학년' : ''].filter(Boolean).join(' · ') +
                  (x.people ? ' · 👥 ' + hl(M.ui.snippet(x.people, 40), q) : '') + '</span>' +
                (showText ? '<span class="sh-text">' + hl(around(showText, q, 50), q) + '</span>' : '') +
                (r.tags && r.tags.length ? '<span class="sh-tags">' + r.tags.map(function (tg) { return hl('#' + tg, q); }).join(' ') + '</span>' : '') +
              '</a>';
            }).join('') + '</section>';
        }).join('');
    }
    function later() { clearTimeout(timer); timer = setTimeout(run, 200); }
    qIn.addEventListener('input', later);
    el.querySelector('#sForm').addEventListener('change', run);
    el.querySelector('#sForm').addEventListener('submit', function (e) { e.preventDefault(); run(); });
    res.addEventListener('click', function (e) {
      const j = e.target.closest('[data-jump]');
      if (!j) return;
      e.preventDefault();
      const s = el.querySelector('#sg-' + j.dataset.jump);
      if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    run();
    qIn.focus();
  };

  /* =========================================================
     설정 및 데이터 관리
     ========================================================= */
  const TABS = [['display', '🎨 화면'], ['backup', '📦 백업·복원'], ['print', '🖨️ 인쇄·PDF'], ['photobook', '📚 졸업 포토북'],
    ['trash', '🗑️ 휴지통'], ['account', '👤 계정'], ['storage', '💾 저장 공간']];

  /* ---------- 백업 · 복원 ---------- */
  async function backupView(el, head) {
    const U = M.ui, esc = U.esc, B = M.backup;
    const [last, size, stats] = await Promise.all([B.lastBackup(), B.estimate(), M.db.stats()]);
    const days = last ? Math.floor((Date.now() - new Date(last.at).getTime()) / 86400000) : null;
    el.innerHTML = head + '<div class="settings-stack">' +
      '<section class="card tape"><h2>📦 백업 파일 만들기</h2>' +
        '<p class="desc">기록은 이 브라우저 안에만 있어서, 브라우저 데이터를 지우거나 기기를 바꾸면 사라질 수 있어요. 백업 파일을 만들어 USB나 다른 곳에 직접 보관해 주세요. 백업 파일은 인터넷으로 보내지지 않아요.</p>' +
        '<p class="backup-last ' + (days == null || days > 30 ? 'warn' : '') + '">' +
          (last ? '마지막 백업: <b>' + esc(U.fmtStamp(last.at)) + '</b> (' + (days === 0 ? '오늘' : days + '일 전') + ', ' + (last.kind === 'full' ? '전체' : '기록만') + ')' : '⚠️ 아직 백업한 적이 없어요.') +
          (days != null && days > 30 ? ' · 백업한 지 한 달이 넘었어요!' : '') + '</p>' +
        '<div class="backup-btns">' +
          '<button type="button" class="btn primary" id="bkFull">📦 전체 백업 (사진·동영상 포함)<small>ZIP 파일 · 약 ' + M.media.fmtSize(size + 200 * 1024) + '</small></button>' +
          '<button type="button" class="btn" id="bkJson">📝 기록만 백업 (사진 제외)<small>JSON 파일 · 작고 빨라요</small></button>' +
        '</div><p class="fhint" id="bkProg"></p>' +
        '<ul class="todo-list"><li>기록 ' + stats.records + '개, 휴지통 ' + stats.trashed + '개, 사진 ' + stats.images + '장, 동영상 ' + stats.videos + '개가 들어가요.</li>' +
          '<li>한 백업 파일은 4GB까지 만들 수 있어요.</li><li>🔒 계정 아이디·비밀번호는 백업에 들어가지 않아요. 이 계정의 기록만 담겨요.</li></ul>' +
      '</section>' +
      '<section class="card tape-left"><h2>♻️ 백업 파일로 복원하기</h2>' +
        '<p class="desc">이 다이어리에서 만든 백업 파일(.zip 또는 .json)을 고르면, 복원하기 전에 내용을 먼저 보여 줘요.</p>' +
        '<label class="btn">📂 백업 파일 고르기<input type="file" accept=".zip,.json,application/zip,application/json" hidden id="rsFile"></label>' +
        '<div id="rsPreview"></div></section></div>';

    const prog = el.querySelector('#bkProg');
    async function make(full) {
      const btns = el.querySelectorAll('.backup-btns .btn');
      btns.forEach(function (b) { b.disabled = true; });
      prog.textContent = '⏳ 백업 파일을 만드는 중…';
      try {
        await M.autosave.flushAll();
        const r = await B.create(full, function (i, n) { prog.textContent = '⏳ 사진·동영상 담는 중… ' + i + ' / ' + n; });
        await B.download(r.blob, r.name);
        await B.markBackup(full ? 'full' : 'json');
        prog.textContent = '✅ "' + r.name + '" (' + M.media.fmtSize(r.blob.size) + ')을 만들었어요. ' + M.savedWhere();
        M.toast('백업 파일을 만들었어요 📦');
      } catch (err) {
        prog.textContent = '';
        M.toast('백업하지 못했어요: ' + M.db.friendly(err).message, true);
      }
      btns.forEach(function (b) { b.disabled = false; });
    }
    el.querySelector('#bkFull').addEventListener('click', function () { make(true); });
    el.querySelector('#bkJson').addEventListener('click', function () { make(false); });

    const pv = el.querySelector('#rsPreview');
    el.querySelector('#rsFile').addEventListener('change', async function (e) {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      pv.innerHTML = '<p class="empty">⏳ 백업 파일을 읽는 중…</p>';
      let opened;
      try { opened = await B.open(file); } catch (err) {
        pv.innerHTML = '<p class="bot-err">⚠️ ' + esc(M.db.friendly(err).message) + '</p>';
        return;
      }
      const s = opened.summary;
      const rows = Object.keys(s.byType).sort(function (a, b) { return s.byType[b] - s.byType[a]; })
        .map(function (t) { return '<li>' + M.typeLabel(t) + ' <b>' + s.byType[t] + '</b></li>'; }).join('');
      pv.innerHTML = '<div class="restore-box">' +
        '<h3>📄 ' + esc(opened.fileName) + '</h3>' +
        '<p>만든 날: <b>' + esc(U.fmtStamp(s.exportedAt)) + '</b> · 기록 <b>' + s.records + '</b>개' + (s.trashed ? ' (휴지통 ' + s.trashed + '개)' : '') +
          ' · 사진·동영상 <b>' + (s.withMedia ? s.media - s.missing : 0) + '</b>개</p>' +
        (rows ? '<ul class="type-chips">' + rows + '</ul>' : '') +
        (!s.withMedia && s.media ? '<p class="fhint">⚠️ "기록만 백업" 파일이라 사진·동영상은 들어 있지 않아요. 지금 기기에 있는 사진은 그대로 남아요.</p>' : '') +
        (s.withMedia && s.missing ? '<p class="bot-err">⚠️ 사진·동영상 ' + s.missing + '개가 백업 파일에서 빠져 있어요.</p>' : '') +
        (s.invalid ? '<p class="fhint">알 수 없는 기록 ' + s.invalid + '개는 건너뛰어요.</p>' : '') +
        '<fieldset class="restore-mode"><legend>복원 방법</legend>' +
          '<label class="switch"><input type="radio" name="rsMode" value="merge" checked><span><b>합치기</b> — 지금 기록은 그대로 두고 백업의 기록을 더해요. 같은 기록이 양쪽에 있으면 <b>더 최근에 수정한 쪽</b>을 남기고, 같은 사진은 하나만 남겨요.</span></label>' +
          '<label class="switch"><input type="radio" name="rsMode" value="replace"><span><b>전부 교체</b> — 지금 기록을 모두 지우고 백업 내용으로 바꿔요. 화면 설정도 백업 때로 돌아가요.</span></label>' +
        '</fieldset>' +
        '<div class="toolbar-in"><button type="button" class="btn" id="rsSafe">📦 지금 기록 먼저 백업하기</button><button type="button" class="btn primary" id="rsGo">♻️ 복원하기</button></div>' +
        '<p class="fhint" id="rsProg"></p></div>';
      pv.querySelector('#rsSafe').addEventListener('click', function () { make(true); });
      pv.querySelector('#rsGo').addEventListener('click', async function () {
        const mode = pv.querySelector('[name="rsMode"]:checked').value;
        const cur = await M.db.stats();
        const msg = mode === 'replace'
          ? '정말 전부 교체할까요?\n지금 있는 기록 ' + (cur.records + cur.trashed) + '개' + (s.withMedia ? '와 사진·동영상 ' + (cur.images + cur.videos) + '개' : '') + '가 모두 지워지고 백업 내용으로 바뀌어요.\n되돌릴 수 없으니, 먼저 지금 기록을 백업해 두는 걸 추천해요.'
          : '백업의 기록 ' + s.records + '개를 지금 기록에 합칠까요?';
        if (!window.confirm(msg)) return;
        const go = pv.querySelector('#rsGo'), p = pv.querySelector('#rsProg');
        go.disabled = true;
        p.textContent = '⏳ 복원하는 중…';
        try {
          await M.autosave.flushAll();
          const r = await B.restore(opened, mode, function (i, n) { p.textContent = '⏳ 사진·동영상 꺼내는 중… ' + i + ' / ' + n; });
          p.innerHTML = '✅ 복원을 마쳤어요. 새로 넣은 기록 ' + r.added + '개' + (mode === 'merge' ? ', 더 최근 것으로 바꾼 기록 ' + r.updated + '개, 그대로 둔 기록 ' + r.skipped + '개' : '') +
            ', 사진·동영상 ' + r.mediaAdded + '개' + (r.mediaSkipped ? ' (이미 있던 사진 ' + r.mediaSkipped + '개는 건너뜀)' : '') + '.' +
            (r.mediaBroken ? '<br>⚠️ 제대로 저장되지 않은 사진이 ' + r.mediaBroken + '개 있어요.' : '');
          M.toast('복원을 마쳤어요 ♻️');
          await B.markBackup(last ? last.kind : 'json').catch(function () {});
        } catch (err) {
          p.textContent = '';
          M.toast('복원하지 못했어요. 지금 기록은 바뀌지 않았어요. (' + M.db.friendly(err).message + ')', true);
        }
        go.disabled = false;
      });
    });
  }

  /* ---------- 화면: 다크 모드 · 글자 크기 · 테마 ---------- */
  function displayView(el, head) {
    const s = M.settings.get();
    el.innerHTML = head +
      '<div class="settings-stack"><section class="card tape-left"><h2>🌙 화면 모드</h2>' +
        '<p class="desc">어두운 곳에서는 다크 모드가 눈이 편해요. "기기 설정 따라가기"는 휴대폰·컴퓨터의 설정에 맞춰 바뀌어요.</p>' +
        '<div class="choice">' + [['system', '🖥️ 기기 설정 따라가기'], ['light', '☀️ 밝게'], ['dark', '🌙 어둡게 (다크 모드)']].map(function (m) {
          return '<button type="button" class="chip-btn" data-mode="' + m[0] + '" aria-pressed="' + (s.mode === m[0]) + '">' + m[1] + '</button>';
        }).join('') + '</div>' +
        '<h2 class="mt">🔤 글자 크기</h2><div class="choice">' + [[90, '작게'], [100, '보통'], [112, '크게'], [125, '아주 크게']].map(function (f) {
          return '<button type="button" class="chip-btn" data-font="' + f[0] + '" aria-pressed="' + (s.fontScale === f[0]) + '" style="font-size:' + (f[0] / 100 * 0.9) + 'rem">' + f[1] + '</button>';
        }).join('') + '</div></section></div>' +
      M.pages.settings(true);
    M.bindSettings();
    el.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!M.settings.setMode(b.dataset.mode)) return M.toast('저장하지 못했어요.', true);
        M.display.apply();
        M.toast('화면 모드를 바꿨어요.');
        M.rerender();
      });
    });
    el.querySelectorAll('[data-font]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!M.settings.setFontScale(Number(b.dataset.font))) return M.toast('저장하지 못했어요.', true);
        M.display.apply();
        M.toast('글자 크기를 바꿨어요.');
        M.rerender();
      });
    });
  }

  /* ---------- 휴지통 ---------- */
  async function trashView(el, head) {
    const U = M.ui, esc = U.esc;
    const list = await M.db.listTrash();
    el.innerHTML = head +
      '<section class="card tape trash-head"><h2 class="sec-title">🗑️ 휴지통 <small>' + list.length + '개</small></h2>' +
        '<p class="desc">지운 기록은 여기에 보관돼요. <b>직접 비울 때까지 자동으로 지워지지 않아요.</b> "완전히 삭제"하면 그 기록에만 쓰인 사진·동영상도 함께 지워지고 되돌릴 수 없어요.</p>' +
        (list.length ? '<div class="toolbar-in"><input type="search" class="inp" id="tq" placeholder="🔍 휴지통에서 찾기" aria-label="휴지통 검색">' +
          '<button type="button" class="btn danger" id="tEmpty">휴지통 비우기</button></div>' : '') +
      '</section><div id="tRes"></div>';
    const res = el.querySelector('#tRes'), q = el.querySelector('#tq');
    function draw() {
      const s = q ? q.value.trim() : '';
      const rows = list.filter(function (r) { return U.match(r, s) || typeLabel(r.type).indexOf(s) >= 0; });
      if (!list.length) { res.innerHTML = U.empty('🗑️', '휴지통이 비어 있어요.', null); return; }
      res.innerHTML = rows.length ? '<ul class="trash-list">' + rows.map(function (r) {
        return '<li class="card"><span class="tr-type">' + typeLabel(r.type) + '</span>' +
          '<span class="tr-title">' + esc(r.title || '(제목 없음)') + (r.date ? ' <small>' + esc(U.fmtDate(r.date, false)) + '</small>' : '') + '</span>' +
          '<span class="tr-when">' + esc(U.fmtStamp(r.trashedAt)) + ' 삭제</span>' +
          '<span class="tr-btns"><button type="button" class="btn small" data-restore="' + r.id + '">↩️ 복구</button>' +
          '<button type="button" class="btn small danger" data-purge="' + r.id + '">완전히 삭제</button></span></li>';
      }).join('') + '</ul>' : '<p class="empty center">찾는 기록이 없어요.</p>';
    }
    if (q) q.addEventListener('input', draw);
    draw();
    res.addEventListener('click', async function (e) {
      const rb = e.target.closest('[data-restore]'), pb = e.target.closest('[data-purge]');
      try {
        if (rb) {
          const r = await M.db.restore(rb.dataset.restore);
          const href = U.hrefOf(r);
          M.toast('"' + (r.title || '기록') + '"을(를) 복구했어요.', false, href ? { label: '보러 가기', fn: function () { location.hash = href; } } : null);
          M.rerender();
        }
        if (pb) {
          const r = list.find(function (x) { return x.id === pb.dataset.purge; });
          if (!window.confirm('"' + (r.title || '기록') + '"을(를) 완전히 삭제할까요?\n이 기록에만 쓰인 사진·동영상도 함께 지워지고, 되돌릴 수 없어요.')) return;
          await M.db.purge(r.id);
          M.toast('완전히 삭제했어요.');
          M.rerender();
        }
      } catch (err) { M.toast(M.db.friendly(err).message, true); }
    });
    const emp = el.querySelector('#tEmpty');
    if (emp) emp.addEventListener('click', async function () {
      if (!window.confirm('휴지통에 있는 기록 ' + list.length + '개를 모두 완전히 삭제할까요?\n함께 쓰인 사진·동영상도 지워지고, 되돌릴 수 없어요.')) return;
      try {
        for (const r of list) await M.db.purge(r.id);
        M.toast('휴지통을 비웠어요.');
      } catch (err) { M.toast(M.db.friendly(err).message, true); }
      M.rerender();
    });
  }

  /* ---------- 계정 ---------- */
  function accountView(el, head) {
    const A = M.accounts, esc = M.ui.esc;
    const me = A.current();
    const others = A.list().filter(function (a) { return a.id !== me.id; });
    const qPicker = function (id) {
      return '<label class="flabel" for="' + id + '">복구 질문</label><select class="inp" id="' + id + '">' +
        A.QUESTIONS.map(function (q) { return '<option>' + q + '</option>'; }).join('') + '</select>' +
        '<input class="inp" id="' + id + 'Own" placeholder="나만의 질문을 적어 주세요" hidden>';
    };
    el.innerHTML = head + '<div class="settings-stack">' +
      '<section class="card tape"><h2>👤 내 계정</h2>' +
        '<p class="desc">🔒 계정마다 기록·사진·테마가 완전히 따로 저장돼요. 다른 사람은 내 기록을 볼 수 없어요. 계정 정보와 기록은 이 기기 안에만 있고 인터넷으로 보내지 않아요. 다만 기기를 잘 아는 사람이 마음먹고 열어 보는 것까지 완벽하게 막지는 못해요.</p>' +
        '<p>아이디: <b>' + esc(me.username) + '</b> · 만든 날: ' + esc(M.ui.fmtStamp(me.createdAt)) + '</p>' +
        '<p>복구 질문: <b>' + esc(me.q) + '</b></p>' +
        '<form id="acName" class="form-grid lock-form">' +
          '<div class="field"><label class="flabel" for="acNm">이름 · 별명</label><input class="inp" id="acNm" value="' + esc(me.name) + '"></div>' +
          '<div class="field full"><span class="flabel">캐릭터</span><div class="choice">' + A.AVATARS.map(function (a) {
            return '<button type="button" class="chip-btn big" data-av="' + a + '" aria-pressed="' + (me.avatar === a) + '">' + a + '</button>';
          }).join('') + '</div></div>' +
          '<div class="field full"><button class="btn" type="submit">이름 · 캐릭터 저장</button></div></form>' +
        '<button type="button" class="btn primary" id="acOut">👋 로그아웃</button>' +
      '</section>' +
      '<section class="card tape-left"><h2>🔑 비밀번호 바꾸기</h2><form id="acPw" class="form-grid lock-form">' +
        '<div class="field full"><label class="flabel" for="acCur">지금 비밀번호</label><input class="inp" type="password" id="acCur" autocomplete="current-password" required></div>' +
        '<div class="field"><label class="flabel" for="acNew">새 비밀번호</label><input class="inp" type="password" id="acNew" autocomplete="new-password" minlength="4" required></div>' +
        '<div class="field"><label class="flabel" for="acNew2">새 비밀번호 확인</label><input class="inp" type="password" id="acNew2" autocomplete="new-password" minlength="4" required></div>' +
        '<div class="field full"><button class="btn primary" type="submit">비밀번호 바꾸기</button></div></form></section>' +
      '<section class="card tape-corner"><h2>❓ 복구 질문 바꾸기</h2><form id="acQ" class="form-grid lock-form">' +
        '<div class="field full"><label class="flabel" for="acCur2">지금 비밀번호</label><input class="inp" type="password" id="acCur2" autocomplete="current-password" required></div>' +
        '<div class="field full">' + qPicker('acQs') + '</div>' +
        '<div class="field full"><label class="flabel" for="acA">새 복구 답</label><input class="inp" type="text" id="acA" autocomplete="off" required></div>' +
        '<div class="field full"><button class="btn" type="submit">복구 질문 바꾸기</button></div></form></section>' +
      '<section class="card"><h2>👨‍👩‍👧 이 기기의 다른 계정</h2>' +
        (others.length ? '<ul class="todo-list">' + others.map(function (a) { return '<li>' + esc(a.avatar) + ' ' + esc(a.name) + '</li>'; }).join('') + '</ul>' : '<p class="empty">아직 다른 계정이 없어요.</p>') +
        '<p class="desc">새 계정은 로그아웃한 뒤 로그인 화면의 "+ 새 계정 만들기"에서 만들 수 있어요.</p></section>' +
      '<section class="card"><h2>🗑️ 내 계정 삭제</h2>' +
        '<p class="desc">계정을 지우면 <b>이 계정의 모든 기록·사진·동영상·설정이 이 기기에서 완전히 지워지고 되돌릴 수 없어요.</b> 지우기 전에 <a href="#/settings/backup">📦 전체 백업</a>을 꼭 만들어 두세요.</p>' +
        '<form id="acDel" class="form-grid lock-form">' +
          '<div class="field full"><label class="flabel" for="acCur3">지금 비밀번호</label><input class="inp" type="password" id="acCur3" autocomplete="current-password" required></div>' +
          '<div class="field full"><label class="flabel" for="acConf">확인을 위해 아이디 "' + esc(me.username) + '"를 적어 주세요</label><input class="inp" id="acConf" autocomplete="off" required></div>' +
          '<div class="field full"><button class="btn danger" type="submit">계정 완전히 삭제</button></div></form></section>' +
      '</div>';

    const v = function (id) { return el.querySelector('#' + id).value; };
    let avatar = me.avatar;
    el.querySelectorAll('[data-av]').forEach(function (b) {
      b.addEventListener('click', function () {
        avatar = b.dataset.av;
        el.querySelectorAll('[data-av]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
    el.querySelector('#acQs').addEventListener('change', function (e) { el.querySelector('#acQsOwn').hidden = e.target.value !== '직접 입력할게요'; });
    el.querySelector('#acOut').addEventListener('click', function () { A.logout(); });
    function guard(id, fn) {
      el.querySelector('#' + id).addEventListener('submit', async function (e) {
        e.preventDefault();
        const b = e.target.querySelector('button[type="submit"]');
        b.disabled = true;
        try { await fn(); } catch (err) { M.toast(err.message || '다시 시도해 주세요.', true); }
        b.disabled = false;
      });
    }
    guard('acName', async function () {
      A.rename(me, v('acNm'), avatar);
      A.refreshUI();
      M.toast('이름과 캐릭터를 저장했어요.');
    });
    guard('acPw', async function () {
      await A.check(me, 'pw', v('acCur'));
      if (v('acNew').length < 4) throw MMSD.AppError('PW', '비밀번호는 4자 이상으로 정해 주세요.');
      if (v('acNew') !== v('acNew2')) throw MMSD.AppError('PW', '두 비밀번호가 서로 달라요.');
      await A.changePassword(me, v('acNew'));
      M.toast('비밀번호를 바꿨어요 🔑');
      M.rerender();
    });
    guard('acQ', async function () {
      await A.check(me, 'pw', v('acCur2'));
      const q = v('acQs') === '직접 입력할게요' ? v('acQsOwn') : v('acQs');
      await A.changeQuestion(me, q, v('acA'));
      M.toast('복구 질문을 바꿨어요.');
      M.rerender();
    });
    guard('acDel', async function () {
      await A.check(me, 'pw', v('acCur3'));
      if (v('acConf').trim().toLowerCase() !== me.username) throw MMSD.AppError('CONF', '아이디가 맞지 않아요. 확인을 위해 아이디를 그대로 적어 주세요.');
      if (!window.confirm('정말 "' + me.name + '" 계정을 지울까요?\n이 계정의 모든 기록·사진·설정이 완전히 지워지고 되돌릴 수 없어요.')) return;
      await M.autosave.flushAll();
      await A.remove(me);
      M.toast('계정을 지웠어요.');
      A.logout();
    });
  }

  /* ---------- 저장 공간 ---------- */
  function storageView(el, head) {
    el.innerHTML = head + '<div class="settings-stack">' +
      '<section class="card tape"><h2>💾 저장 공간</h2>' +
        '<p class="desc">글 기록과 사진·동영상을 따로 나눠서 이 기기 안에 저장해요.</p>' +
        '<div id="storageInfo"><p class="empty">확인하는 중…</p></div></section>' +
      '<section class="card tape-corner"><h2>🔒 개인정보 보호</h2>' +
        '<p class="desc">이 다이어리는 인터넷 서버를 쓰지 않아요. 모든 기록은 이 기기의 브라우저 안에만 저장되고, 외부로 보내지 않아요.</p>' +
        '<ul class="todo-list"><li>브라우저의 "사이트 데이터 삭제"를 하거나 기기를 바꾸면 기록이 사라질 수 있어요. <a href="#/settings/backup">📦 백업·복원</a>에서 백업 파일을 자주 만들어 두세요.</li></ul></section></div>';
    M.pages.fillStorage(el.querySelector('#storageInfo'));
  }

  M.mods.settings = async function (el, sub) {
    const tab = TABS.some(function (t) { return t[0] === sub[0]; }) ? sub[0] : 'display';
    const head = '<div class="sub-bar">' + M.ui.tabs('settings', TABS, tab) + '</div>';
    if (tab === 'backup') return backupView(el, head);
    if (tab === 'print') return M.printer.printView(el, head);
    if (tab === 'photobook') return M.printer.photobookView(el, head);
    if (tab === 'trash') return trashView(el, head);
    if (tab === 'account') return accountView(el, head);
    if (tab === 'storage') return storageView(el, head);
    return displayView(el, head);
  };

  M.typeLabel = typeLabel;
})();
