/* =========================================================
   다이어리 꾸미기: 내 페이지 · 페이지 편집기 · 나만의 스티커 · 테마
   ========================================================= */
(function () {
  const M = window.MMSD;
  const D = M.deco;
  const TABS = [['pages', '📄 내 페이지'], ['stickers', '🧸 나만의 스티커'], ['themes', '🎨 테마']];

  const clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  const uid = function () { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* ---------- 새 페이지 틀 ---------- */
  const TEMPLATES = {
    blank: { name: '빈 페이지', emoji: '📄', data: { bg: 'theme', border: 'none', items: [] } },
    diary: { name: '오늘의 일기', emoji: '📔', data: { bg: 'mintline', border: 'stitch', items: [
      { kind: 'text', text: '오늘의 일기', fs: 54, bold: true, color: '#3f6b5c', x: 70, y: 70, w: 460, h: 80, rot: 0, z: 1 },
      { kind: 'tape', style: 'pink', x: 300, y: 196, w: 200, h: 40, rot: -4, z: 3 },
      { kind: 'memo', style: 'lined', text: '', fs: 26, x: 90, y: 220, w: 620, h: 560, rot: 0, z: 2 },
      { kind: 'sticker', emoji: '⭐', x: 620, y: 60, w: 110, h: 110, rot: 12, z: 4 },
      { kind: 'sticker', emoji: '🌷', x: 70, y: 820, w: 130, h: 130, rot: -8, z: 4 }
    ] } },
    photo: { name: '사진 페이지', emoji: '📸', data: { bg: 'cream', border: 'round', items: [
      { kind: 'memo', style: 'yellow', text: '📷 왼쪽 "사진" 탭에서\n사진이나 콜라주를 넣어 보세요!', fs: 26, x: 200, y: 400, w: 400, h: 200, rot: -3, z: 2 },
      { kind: 'tape', style: 'mint', x: 320, y: 384, w: 160, h: 38, rot: 3, z: 3 },
      { kind: 'sticker', emoji: '✨', x: 600, y: 120, w: 100, h: 100, rot: 0, z: 4 },
      { kind: 'sticker', emoji: '🎀', x: 90, y: 860, w: 120, h: 120, rot: -10, z: 4 }
    ] } },
    fan: { name: '덕질 페이지', emoji: '💖', data: { bg: 'pinkdot', border: 'dashed', items: [
      { kind: 'text', text: 'MY FAVORITE ♡', fs: 60, bold: true, color: '#d6457a', x: 140, y: 80, w: 560, h: 90, rot: -2, z: 2 },
      { kind: 'memo', style: 'pink', text: '최애 이야기', fs: 28, x: 420, y: 640, w: 320, h: 300, rot: 4, z: 2 },
      { kind: 'sticker', emoji: '💖', x: 80, y: 220, w: 120, h: 120, rot: -12, z: 3 },
      { kind: 'sticker', emoji: '🌟', x: 640, y: 210, w: 100, h: 100, rot: 10, z: 3 },
      { kind: 'tape', style: 'rainbow', x: 500, y: 622, w: 180, h: 40, rot: 6, z: 3 }
    ] } }
  };

  function withIds(items) { return (items || []).map(function (it) { return Object.assign(clone(it), { id: uid() }); }); }
  function mediaOf(data) {
    const s = new Set();
    (data.items || []).forEach(function (it) {
      if (it.mediaId) s.add(it.mediaId);
      (it.mediaIds || []).forEach(function (m) { s.add(m); });
    });
    return Array.from(s);
  }

  async function createPage(title, data) {
    const d = Object.assign({ bg: 'theme', border: 'none', items: [] }, clone(data));
    d.items = withIds(d.items);
    return M.db.save({ type: 'page', title: title, date: M.ui.today(), data: d, mediaIds: mediaOf(d) });
  }
  async function copyPage(p) {
    const d = clone(p.data);
    delete d.target;
    d.items = withIds(d.items);
    return M.db.save({ type: 'page', title: (p.title || '꾸민 페이지') + ' (복사)', date: M.ui.today(), data: d, mediaIds: mediaOf(d) });
  }

  /* ---------- 내 페이지 목록 ---------- */
  async function pagesView(el, head) {
    const U = M.ui, esc = U.esc;
    const pages = (await M.db.list('page')).sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
    el.innerHTML = head +
      '<section class="card tape new-page"><h2 class="sec-title">✨ 새 페이지 만들기</h2><div class="tpl-row">' +
        Object.keys(TEMPLATES).map(function (k) {
          return '<a class="tpl" href="#/decorate/new/' + k + '"><span aria-hidden="true">' + TEMPLATES[k].emoji + '</span>' + TEMPLATES[k].name + '</a>';
        }).join('') +
      '</div><p class="fhint">인물·작품·추억·일기 같은 기록 화면 위쪽의 "🎀 꾸미기" 버튼을 누르면 그 기록만의 페이지를 꾸밀 수 있어요.</p></section>' +
      (pages.length ? '<div class="page-grid">' + pages.map(function (p) {
        return '<article class="page-card card">' +
          '<a href="#/decorate/edit/' + p.id + '" class="pc-link" aria-label="' + esc(p.title) + ' 열기">' + D.previewHTML(p, 200) + '</a>' +
          '<p class="pc-title">' + esc(p.title || '꾸민 페이지') + '</p>' +
          '<p class="pc-meta">' + esc(U.fmtStamp(p.updatedAt)) + (p.data.target ? ' · 🔗 기록 연결' : '') + '</p>' +
          '<div class="pc-actions"><button type="button" class="btn small" data-copy="' + p.id + '">📄 복사</button>' +
          '<button type="button" class="btn small danger" data-trash="' + p.id + '">🗑️</button></div></article>';
      }).join('') + '</div>' : U.empty('🎀', '아직 꾸민 페이지가 없어요. 위에서 틀을 골라 첫 페이지를 만들어 보세요.', null));
    D.hydratePreviews(el, pages);
    el.addEventListener('click', async function (e) {
      const c = e.target.closest('[data-copy]'), t = e.target.closest('[data-trash]');
      try {
        if (c) {
          const p = pages.find(function (x) { return x.id === c.dataset.copy; });
          await copyPage(p);
          M.toast('페이지를 복사했어요. 복사본을 꾸며 보세요!');
          M.rerender();
        }
        if (t) {
          const id = t.dataset.trash;
          await M.db.trash(id);
          M.toast('휴지통으로 옮겼어요.', false, { label: '되돌리기', fn: async function () { await M.db.restore(id); M.rerender(); } });
          M.rerender();
        }
      } catch (err) { M.toast(M.db.friendly(err).message, true); }
    });
  }

  /* ---------- 나만의 스티커 ---------- */
  async function addMySticker(file) {
    const r = await M.media.addMany([file]);
    if (!r[0].ok) throw r[0].error;
    if (r[0].media.kind !== 'image') throw MMSD.AppError('TYPE', '스티커는 사진(이미지) 파일만 쓸 수 있어요.');
    return M.db.save({ type: 'sticker', title: file.name.replace(/\.[^.]+$/, ''), mediaIds: [r[0].media.id], data: {} });
  }
  async function stickersView(el, head) {
    const esc = M.ui.esc;
    const list = await M.db.list('sticker');
    el.innerHTML = head +
      '<section class="card tape"><h2 class="sec-title">🧸 나만의 스티커</h2>' +
      '<p class="desc">직접 그린 그림이나 사진을 스티커로 등록해요. 배경이 투명한 PNG 파일이면 진짜 스티커처럼 붙어요.</p>' +
      '<label class="btn primary">+ 스티커 등록<input type="file" accept="image/png,image/webp,image/gif,image/jpeg" multiple hidden id="stkIn"></label>' +
      (list.length ? '<div class="my-stickers">' + list.map(function (s) {
        return '<div class="ms-item"><img data-media="' + esc(s.mediaIds[0]) + '" data-variant="full" alt="' + esc(s.title) + '">' +
          '<span>' + esc(s.title) + '</span><button type="button" class="mp-del" data-del="' + s.id + '" aria-label="스티커 삭제">✕</button></div>';
      }).join('') + '</div>' : '<p class="empty">아직 등록한 스티커가 없어요.</p>') + '</section>';
    el.querySelector('#stkIn').addEventListener('change', async function (e) {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        try { await addMySticker(f); } catch (err) { M.toast(M.db.friendly(err).message, true); }
      }
      M.toast('스티커를 등록했어요 🧸');
      M.rerender();
    });
    el.addEventListener('click', async function (e) {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      const id = b.dataset.del;
      await M.db.trash(id);
      M.toast('스티커를 휴지통으로 옮겼어요.', false, { label: '되돌리기', fn: async function () { await M.db.restore(id); M.rerender(); } });
      M.rerender();
    });
  }

  /* =========================================================
     페이지 편집기
     ========================================================= */
  async function editor(el, id) {
    const U = M.ui, esc = U.esc;
    const rec = await M.db.get(id);
    if (!rec || rec.trashed || rec.type !== 'page') {
      el.innerHTML = U.empty('🔍', '페이지를 찾을 수 없어요. 휴지통으로 옮겨졌을 수 있어요.', '#/decorate', '내 페이지로');
      return;
    }
    const page = rec;
    const data = page.data;
    data.items = data.items || [];
    let sel = null;
    let scale = 1;
    const myStickers = await M.db.list('sticker');
    let target = null;
    if (data.target) {
      target = await M.db.get(data.target.id);
      if (target && target.trashed) target = null;
    }

    el.innerHTML =
      '<div class="deco-bar card">' +
        '<a class="btn small" href="#/decorate">← 내 페이지</a>' +
        '<input class="inp deco-title" id="dTitle" value="' + esc(page.title || '') + '" aria-label="페이지 제목" placeholder="페이지 제목">' +
        (target ? '<a class="btn small" href="' + U.hrefOf(target) + '">🔗 ' + esc(U.snippet(target.title || '연결된 기록', 12)) + '</a>' : '') +
        '<button type="button" class="btn small" id="dPng">🖼️ 이미지로 저장</button>' +
        '<button type="button" class="btn small" id="dCopy">📄 복사</button>' +
        '<button type="button" class="btn small danger" id="dDel">🗑️</button>' +
      '</div>' +
      '<div class="deco-wrap">' +
        '<aside class="deco-panel card" aria-label="꾸미기 재료">' +
          '<div class="dp-tabs" role="tablist">' +
            [['stk', '🐰 스티커'], ['tape', '🎞️ 테이프'], ['memo', '📝 메모지'], ['photo', '📷 사진'], ['text', '🔤 글자'], ['page', '🎨 배경'], ['mine', '🧸 내 스티커']]
              .map(function (t, i) { return '<button type="button" role="tab" data-ptab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + t[1] + '</button>'; }).join('') +
          '</div><div class="dp-body" id="dPanel"></div>' +
        '</aside>' +
        '<div class="deco-main">' +
          '<div class="deco-tools card" id="dTools"></div>' +
          '<div class="deco-outer" id="dOuter"><div class="d-stage-holder" id="dHolder"><div id="dStage" tabindex="0" aria-label="꾸미는 페이지"></div></div></div>' +
        '</div>' +
      '</div>';

    const stage = el.querySelector('#dStage'), holder = el.querySelector('#dHolder'), outer = el.querySelector('#dOuter');
    const tools = el.querySelector('#dTools'), panel = el.querySelector('#dPanel'), titleIn = el.querySelector('#dTitle');
    const els = new Map();

    /* ---- 저장 ---- */
    const saver = M.autosave.create(async function (r) {
      const saved = await M.db.save(r);
      page.updatedAt = saved.updatedAt;
    }, 600);
    function save() {
      saver.schedule(function () {
        return { id: page.id, type: 'page', title: titleIn.value.trim() || '꾸민 페이지', date: page.date, data: clone(data), mediaIds: mediaOf(data) };
      });
    }
    titleIn.addEventListener('input', save);

    /* ---- 크기 맞추기 ---- */
    function fit() {
      scale = Math.min(1, outer.clientWidth / D.W);
      holder.style.transform = 'scale(' + scale + ')';
      outer.style.height = Math.round(D.H * scale) + 'px';
      stage.style.setProperty('--hs', (30 / scale) + 'px');
    }

    /* ---- 그리기 ---- */
    function drawAll() {
      D.renderStage(stage, page);
      stage.id = 'dStage';
      stage.tabIndex = 0;
      els.clear();
      stage.querySelectorAll('.d-item').forEach(function (n) { els.set(n.dataset.id, n); });
      fit();
      if (sel && !getItem(sel)) sel = null;
      markSel();
    }
    function getItem(i) { return data.items.find(function (x) { return x.id === i; }); }
    function redrawItem(it) {
      const n = els.get(it.id);
      if (!n) return drawAll();
      n.innerHTML = D.itemInner(it);
      D.applyGeom(n, it);
      U.hydrate(n);
      if (sel === it.id) addHandles(n);
    }
    function addHandles(n) {
      n.querySelectorAll('.h').forEach(function (h) { h.remove(); });
      n.insertAdjacentHTML('beforeend', '<span class="h h-rot" data-h="rot" title="돌리기">↻</span><span class="h h-size" data-h="size" title="크기">⤡</span>');
    }
    function markSel() {
      els.forEach(function (n, i) {
        n.classList.toggle('sel', i === sel);
        if (i === sel) addHandles(n); else n.querySelectorAll('.h').forEach(function (h) { h.remove(); });
      });
      drawTools();
    }
    function select(i) { sel = i; markSel(); }

    /* ---- 재료 추가 ---- */
    function maxZ() { return data.items.reduce(function (m, it) { return Math.max(m, it.z || 0); }, 0); }
    function viewCenterY() {
      const r = stage.getBoundingClientRect();
      const y = (window.innerHeight / 2 - r.top) / scale;
      return Math.max(160, Math.min(D.H - 160, y));
    }
    function add(it) {
      it.id = uid();
      it.z = maxZ() + 1;
      it.rot = it.rot || 0;
      it.x = Math.round(D.W / 2 - it.w / 2 + (Math.random() * 120 - 60));
      it.y = Math.round(viewCenterY() - it.h / 2 + (Math.random() * 80 - 40));
      data.items.push(it);
      const n = D.makeItemEl(it);
      stage.appendChild(n);
      els.set(it.id, n);
      U.hydrate(n);
      select(it.id);
      save();
    }

    /* ---- 재료 패널 ---- */
    let stkCat = D.STICKERS[0].id;
    function drawPanel(tab) {
      let h = '';
      if (tab === 'stk') {
        h = '<div class="dp-cats">' + D.STICKERS.map(function (c) {
          return '<button type="button" class="chip-btn" data-scat="' + c.id + '" aria-pressed="' + (c.id === stkCat) + '">' + c.name + '</button>';
        }).join('') + '</div><div class="emoji-grid">' + D.find(D.STICKERS, stkCat).list.map(function (e) {
          return '<button type="button" data-emoji="' + e + '" aria-label="' + e + ' 스티커 붙이기">' + e + '</button>';
        }).join('') + '</div>';
      }
      if (tab === 'tape') {
        h = '<div class="mat-grid">' + D.TAPES.map(function (t) {
          return '<button type="button" class="mat" data-tape="' + t.id + '"><span class="mat-tape" style="background:' + D.tapeCSS(t) + '"></span>' + t.name + '</button>';
        }).join('') + '</div>';
      }
      if (tab === 'memo') {
        h = '<div class="mat-grid">' + D.MEMOS.map(function (m) {
          return '<button type="button" class="mat" data-memo="' + m.id + '"><span class="mat-memo" style="' + D.memoCSS(m) + '"></span>' + m.name + '</button>';
        }).join('') + '</div>';
      }
      if (tab === 'photo') {
        h = '<label class="btn primary block">📷 사진 넣기<input type="file" accept="image/*" multiple hidden id="dPhotoIn"></label>' +
          '<label class="btn block">🧩 콜라주 만들기 (2~6장)<input type="file" accept="image/*" multiple hidden id="dCollageIn"></label>' +
          '<p class="fhint">사진을 넣은 뒤 아래 도구에서 사진 틀, 확대, 위치(자르기)를 바꿀 수 있어요.</p>' +
          '<div class="frame-row">' + D.FRAMES.map(function (f) { return '<span class="frame-chip fr-demo fr-' + f[0] + '">' + f[1] + '</span>'; }).join('') + '</div>';
      }
      if (tab === 'text') {
        h = '<button type="button" class="btn primary block" data-addtext="title">✏️ 큰 제목 넣기</button>' +
          '<button type="button" class="btn block" data-addtext="body">🔤 글자 넣기</button>' +
          '<p class="fhint">글자를 넣은 뒤 아래 도구에서 내용, 크기, 색을 바꿀 수 있어요.</p>';
      }
      if (tab === 'page') {
        h = '<h3 class="dp-h">배경 · 종이 질감</h3><div class="mat-grid">' + D.BGS.map(function (b) {
          const pat = b.p ? D.patternCSS(b.p, b.pc) : null;
          const st = b.id === 'theme' ? 'background:var(--bg);background-image:var(--pattern);background-size:var(--pattern-size)' :
            'background-color:' + b.c + ';' + (pat ? 'background-image:' + pat.img + ';background-size:' + pat.size : '');
          return '<button type="button" class="mat" data-bg="' + b.id + '" aria-pressed="' + ((data.bg || 'theme') === b.id) + '"><span class="mat-bg" style="' + st + '"></span>' + b.name + '</button>';
        }).join('') + '</div>' +
        '<h3 class="dp-h">테두리</h3><div class="choice">' + D.BORDERS.map(function (b) {
          return '<button type="button" class="chip-btn" data-border="' + b[0] + '" aria-pressed="' + ((data.border || 'none') === b[0]) + '">' + b[1] + '</button>';
        }).join('') + '</div>' +
        '<h3 class="dp-h">페이지 테마 (배경이 "테마 따라가기"일 때)</h3><select class="inp" id="dTheme"><option value="">메뉴 테마 따르기</option>' +
          M.themes.list.map(function (t) { return '<option value="' + t.id + '"' + (data.themeId === t.id ? ' selected' : '') + '>' + t.emoji + ' ' + t.name + '</option>'; }).join('') + '</select>';
      }
      if (tab === 'mine') {
        h = '<label class="btn primary block">+ 나만의 스티커 등록<input type="file" accept="image/png,image/webp,image/gif,image/jpeg" hidden id="dMyIn"></label>' +
          (myStickers.length ? '<div class="emoji-grid mine">' + myStickers.map(function (s) {
            return '<button type="button" data-mys="' + esc(s.mediaIds[0]) + '" aria-label="' + esc(s.title) + ' 붙이기"><img data-media="' + esc(s.mediaIds[0]) + '" data-variant="full" alt=""></button>';
          }).join('') + '</div>' : '<p class="empty">등록한 스티커가 없어요. 배경이 투명한 PNG 그림을 올려 보세요.</p>');
      }
      panel.innerHTML = h;
      U.hydrate(panel);
    }
    let curTab = 'stk';
    drawPanel(curTab);
    el.querySelector('.dp-tabs').addEventListener('click', function (e) {
      const b = e.target.closest('[data-ptab]');
      if (!b) return;
      curTab = b.dataset.ptab;
      el.querySelectorAll('[data-ptab]').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      drawPanel(curTab);
    });

    async function photosFrom(files) {
      const res = await M.media.addMany(Array.from(files));
      const ok = [];
      res.forEach(function (r) {
        if (!r.ok) M.toast(r.error.message, true);
        else if (r.media.kind !== 'image') M.toast('"' + r.file.name + '"은(는) 사진이 아니라서 넣을 수 없어요.', true);
        else ok.push(r.media);
      });
      return ok;
    }

    panel.addEventListener('click', function (e) {
      const t = e.target;
      const sc = t.closest('[data-scat]');
      if (sc) { stkCat = sc.dataset.scat; drawPanel('stk'); return; }
      const em = t.closest('[data-emoji]');
      if (em) return add({ kind: 'sticker', emoji: em.dataset.emoji, w: 120, h: 120 });
      const tp = t.closest('[data-tape]');
      if (tp) return add({ kind: 'tape', style: tp.dataset.tape, w: 220, h: 44, rot: Math.round(Math.random() * 16 - 8) });
      const mm = t.closest('[data-memo]');
      if (mm) return add({ kind: 'memo', style: mm.dataset.memo, text: '', fs: 26, w: 320, h: 300, rot: Math.round(Math.random() * 6 - 3) });
      const tx = t.closest('[data-addtext]');
      if (tx) {
        const big = tx.dataset.addtext === 'title';
        return add({ kind: 'text', text: big ? '제목을 적어요' : '글자를 적어요', fs: big ? 56 : 32, bold: big, color: '#4a3540', w: big ? 520 : 400, h: big ? 80 : 120 });
      }
      const my = t.closest('[data-mys]');
      if (my) return add({ kind: 'sticker', mediaId: my.dataset.mys, w: 160, h: 160 });
      const bg = t.closest('[data-bg]');
      if (bg) { data.bg = bg.dataset.bg; drawAll(); drawPanel('page'); save(); return; }
      const bd = t.closest('[data-border]');
      if (bd) { data.border = bd.dataset.border; drawAll(); drawPanel('page'); save(); }
    });
    panel.addEventListener('change', async function (e) {
      const t = e.target;
      if (t.id === 'dTheme') { data.themeId = t.value || null; drawAll(); save(); return; }
      if (t.id === 'dPhotoIn') {
        const ms = await photosFrom(t.files);
        ms.forEach(function (m) {
          const ratio = m.width && m.height ? m.height / m.width : 1;
          const w = 340;
          add({ kind: 'photo', mediaId: m.id, frame: 'polaroid', zoom: 1, cx: 50, cy: 50, w: w, h: Math.round(w * Math.min(1.5, Math.max(0.6, ratio)) + 50), rot: Math.round(Math.random() * 8 - 4) });
        });
        t.value = '';
      }
      if (t.id === 'dCollageIn') {
        const ms = await photosFrom(t.files);
        if (ms.length < 2) { if (ms.length) M.toast('콜라주는 사진을 2장 이상 골라 주세요.', true); t.value = ''; return; }
        if (ms.length > 6) M.toast('콜라주에는 처음 6장만 들어가요.');
        add({ kind: 'collage', mediaIds: ms.slice(0, 6).map(function (m) { return m.id; }), w: 560, h: ms.length >= 5 ? 400 : 440 });
        t.value = '';
      }
      if (t.id === 'dMyIn' && t.files[0]) {
        try {
          const s = await addMySticker(t.files[0]);
          myStickers.unshift(s);
          drawPanel('mine');
          add({ kind: 'sticker', mediaId: s.mediaIds[0], w: 160, h: 160 });
        } catch (err) { M.toast(M.db.friendly(err).message, true); }
        t.value = '';
      }
    });

    /* ---- 선택한 재료 도구 ---- */
    function range(p, label, min, max, step, v) {
      return '<label class="tool"><span>' + label + '</span><input type="range" data-p="' + p + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + v + '"></label>';
    }
    function drawTools() {
      const it = sel ? getItem(sel) : null;
      if (!it) {
        tools.innerHTML = '<p class="tools-hint">👆 재료를 눌러 고르면 여기서 크기·회전·순서를 바꿀 수 있어요. 끌어서 옮기고, 모서리 ⤡로 크기, ↻로 돌려요.</p>';
        return;
      }
      let h = '<div class="tool-row">' +
        range('size', '크기', 24, 800, 1, Math.round(it.w)) +
        range('rot', '회전', -180, 180, 1, Math.round(it.rot || 0)) +
        '<div class="tool-btns">' +
          '<button type="button" class="btn small" data-act="up" title="앞으로">⬆️ 앞으로</button>' +
          '<button type="button" class="btn small" data-act="down" title="뒤로">⬇️ 뒤로</button>' +
          '<button type="button" class="btn small" data-act="dup">📑 복제</button>' +
          '<button type="button" class="btn small danger" data-act="del">🗑️ 빼기</button>' +
        '</div></div>';
      if (it.kind === 'photo' || it.kind === 'collage') {
        if (it.kind === 'photo') {
          h += '<div class="tool-row"><label class="tool"><span>사진 틀</span><select class="inp" data-p="frame">' +
            D.FRAMES.map(function (f) { return '<option value="' + f[0] + '"' + ((it.frame || 'none') === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></label>' +
            range('zoom', '확대 (자르기)', 1, 3, 0.05, it.zoom || 1) +
            range('cx', '가로 위치', 0, 100, 1, it.cx == null ? 50 : it.cx) +
            range('cy', '세로 위치', 0, 100, 1, it.cy == null ? 50 : it.cy) + '</div>';
        }
      }
      if (it.kind === 'tape') {
        h += '<div class="tool-row"><label class="tool"><span>테이프 무늬</span><select class="inp" data-p="style">' +
          D.TAPES.map(function (t) { return '<option value="' + t.id + '"' + (it.style === t.id ? ' selected' : '') + '>' + t.name + '</option>'; }).join('') + '</select></label>' +
          range('h', '두께', 16, 120, 1, it.h) + '</div>';
      }
      if (it.kind === 'memo') {
        h += '<div class="tool-row"><label class="tool"><span>메모지</span><select class="inp" data-p="style">' +
          D.MEMOS.map(function (m) { return '<option value="' + m.id + '"' + (it.style === m.id ? ' selected' : '') + '>' + m.name + '</option>'; }).join('') + '</select></label>' +
          range('fs', '글자 크기', 14, 60, 1, it.fs || 26) + range('h', '높이', 60, 1000, 1, it.h) + '</div>' +
          '<label class="tool wide"><span>메모 내용</span><textarea class="inp" rows="3" data-p="text">' + esc(it.text || '') + '</textarea></label>';
      }
      if (it.kind === 'text') {
        h += '<div class="tool-row">' + range('fs', '글자 크기', 14, 120, 1, it.fs || 40) +
          '<label class="tool"><span>색</span><input type="color" data-p="color" value="' + esc(it.color || '#4a3540') + '"></label>' +
          '<label class="switch"><input type="checkbox" data-p="bold"' + (it.bold ? ' checked' : '') + '><span>굵게</span></label></div>' +
          '<label class="tool wide"><span>글자 내용</span><textarea class="inp" rows="2" data-p="text">' + esc(it.text || '') + '</textarea></label>';
      }
      tools.innerHTML = h;
    }
    function onTool(e) {
      const it = sel ? getItem(sel) : null;
      const t = e.target;
      if (!it || !t.dataset.p) return;
      const p = t.dataset.p;
      const v = t.type === 'checkbox' ? t.checked : t.value;
      if (p === 'size') {
        const ratio = it.h / it.w;
        const nw = Number(v);
        const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
        it.w = nw;
        if (it.kind !== 'tape' && it.kind !== 'memo' && it.kind !== 'text') it.h = Math.round(nw * ratio);
        it.x = Math.round(cx - it.w / 2);
        it.y = Math.round(cy - it.h / 2);
      } else if (['rot', 'zoom', 'cx', 'cy', 'fs', 'h'].indexOf(p) >= 0) {
        it[p] = Number(v);
      } else {
        it[p] = v;
      }
      redrawItem(it);
      save();
    }
    tools.addEventListener('input', onTool);
    tools.addEventListener('change', onTool);
    tools.addEventListener('click', function (e) {
      const b = e.target.closest('[data-act]');
      const it = sel ? getItem(sel) : null;
      if (!b || !it) return;
      const act = b.dataset.act;
      if (act === 'up') { it.z = maxZ() + 1; redrawItem(it); }
      if (act === 'down') {
        const minZ = data.items.reduce(function (m, x) { return Math.min(m, x.z || 0); }, 1);
        it.z = minZ - 1; redrawItem(it);
      }
      if (act === 'dup') {
        const c = clone(it);
        c.x += 30; c.y += 30;
        delete c.id;
        const keepX = c.x, keepY = c.y;
        add(c);
        c.x = keepX; c.y = keepY;
        redrawItem(c);
      }
      if (act === 'del') {
        data.items = data.items.filter(function (x) { return x.id !== it.id; });
        const n = els.get(it.id);
        if (n) n.remove();
        els.delete(it.id);
        select(null);
      }
      save();
    });

    /* ---- 끌기 · 크기 · 회전 (마우스·터치 공통) ---- */
    let drag = null;
    function local(e) {
      const r = stage.getBoundingClientRect();
      return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
    }
    stage.addEventListener('pointerdown', function (e) {
      const itEl = e.target.closest('.d-item');
      if (!itEl) { select(null); return; }
      const it = getItem(itEl.dataset.id);
      if (!it) return;
      if (sel !== it.id) select(it.id);
      e.preventDefault();
      stage.focus({ preventScroll: true });
      try { stage.setPointerCapture(e.pointerId); } catch (_) { /* 무시 */ }
      const h = e.target.closest('[data-h]');
      drag = { mode: h ? h.dataset.h : 'move', start: local(e), o: { x: it.x, y: it.y, w: it.w, h: it.h, rot: it.rot || 0 }, it: it, moved: false };
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      const p = local(e), it = drag.it, o = drag.o;
      const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
      if (drag.mode === 'move') {
        it.x = Math.round(Math.max(-o.w + 30, Math.min(D.W - 30, o.x + dx)));
        it.y = Math.round(Math.max(-o.h + 30, Math.min(D.H - 30, o.y + dy)));
      } else if (drag.mode === 'size') {
        if (it.kind === 'tape' || it.kind === 'memo' || it.kind === 'text') {
          it.w = Math.round(Math.max(40, o.w + dx));
          it.h = Math.round(Math.max(20, o.h + dy));
        } else {
          const nw = Math.max(24, o.w + Math.max(dx, dy * o.w / o.h));
          it.w = Math.round(nw);
          it.h = Math.round(nw * o.h / o.w);
        }
      } else if (drag.mode === 'rot') {
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
        if (a > 180) a -= 360;
        if (!e.shiftKey) { const snap = Math.round(a / 45) * 45; if (Math.abs(a - snap) < 4) a = snap; }
        it.rot = Math.round(a);
      }
      const n = els.get(it.id);
      if (n) D.applyGeom(n, it);
    });
    function endDrag() {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      if (moved) { drawTools(); save(); }
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    /* 키보드: 화살표로 옮기기, Delete로 빼기 */
    stage.addEventListener('keydown', function (e) {
      const it = sel ? getItem(sel) : null;
      if (!it) return;
      const step = e.shiftKey ? 10 : 2;
      const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (mv) { e.preventDefault(); it.x += mv[0]; it.y += mv[1]; D.applyGeom(els.get(it.id), it); save(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        tools.querySelector('[data-act="del"]').click();
      }
      if (e.key === 'Escape') select(null);
    });

    /* ---- 위쪽 버튼 ---- */
    el.querySelector('#dPng').addEventListener('click', async function (e) {
      const b = e.currentTarget;
      b.disabled = true;
      b.textContent = '⏳ 만드는 중…';
      try {
        page.title = titleIn.value.trim() || '꾸민 페이지';
        await D.downloadPNG(page, stage);
        M.toast('이미지를 저장했어요 🖼️ ' + M.savedWhere());
      } catch (err) {
        M.toast('이미지로 저장하지 못했어요: ' + M.db.friendly(err).message, true);
      }
      b.disabled = false;
      b.textContent = '🖼️ 이미지로 저장';
    });
    el.querySelector('#dCopy').addEventListener('click', async function () {
      try {
        await saver.flush();
        const c = await copyPage(Object.assign({}, page, { title: titleIn.value.trim() || page.title, data: data }));
        M.toast('복사본을 만들었어요. 복사본을 열었어요.');
        location.hash = '#/decorate/edit/' + c.id;
      } catch (err) { M.toast(M.db.friendly(err).message, true); }
    });
    el.querySelector('#dDel').addEventListener('click', async function () {
      try {
        await saver.flush();
        await M.db.trash(page.id);
        M.toast('휴지통으로 옮겼어요.', false, { label: '되돌리기', fn: async function () { await M.db.restore(page.id); M.rerender(); } });
        location.hash = '#/decorate';
      } catch (err) { M.toast(M.db.friendly(err).message, true); }
    });

    drawAll();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(function () { if (!outer.isConnected) { ro.disconnect(); return; } fit(); });
      ro.observe(outer);
    } else {
      window.addEventListener('resize', fit);
    }
  }

  /* ---------- 기록 연결 페이지 (#/decorate/for/<기록 id>) ---------- */
  async function forTarget(el, id) {
    const rec = await M.db.get(id);
    if (!rec || rec.trashed) { el.innerHTML = M.ui.empty('🔍', '기록을 찾을 수 없어요.', '#/decorate', '내 페이지로'); return; }
    const pages = await M.db.list('page');
    let p = pages.find(function (x) { return x.data.target && x.data.target.id === id; });
    if (!p) {
      const themeId = (rec.type === 'person' || rec.type === 'work') ? M.coll.themeIdByName(rec.data.theme) : null;
      p = await createPage((rec.title || '기록') + ' 꾸미기', {
        bg: 'theme', border: 'dashed', themeId: themeId, target: { type: rec.type, id: rec.id },
        items: [{ kind: 'text', text: rec.title || '', fs: 56, bold: true, color: '#4a3540', x: 80, y: 70, w: 640, h: 90, rot: 0, z: 1 }]
      });
    }
    M.replaceHash('#/decorate/edit/' + p.id);
    return editor(el, p.id);
  }

  M.mods.decorate = async function (el, sub) {
    const mode = sub[0] || 'pages';
    if (mode === 'edit') return editor(el, sub[1]);
    if (mode === 'for') return forTarget(el, sub[1]);
    if (mode === 'new') {
      const t = TEMPLATES[sub[1]] || TEMPLATES.blank;
      const p = await createPage(t.name === '빈 페이지' ? '새 페이지' : t.name, t.data);
      M.replaceHash('#/decorate/edit/' + p.id);
      return editor(el, p.id);
    }
    const tab = TABS.some(function (t) { return t[0] === mode; }) ? mode : 'pages';
    const head = '<div class="sub-bar">' + M.ui.tabs('decorate', TABS, tab) + '</div>';
    if (tab === 'stickers') return stickersView(el, head);
    if (tab === 'themes') {
      el.innerHTML = head + M.pages.settings(true);
      M.bindSettings();
      return;
    }
    return pagesView(el, head);
  };
})();
