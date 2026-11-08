/* =========================================================
   다이어리 꾸미기: 재료 · 페이지 그리기(화면/이미지)
   페이지 = 800 × 1100 크기의 종이. 모든 재료는 이 좌표로 저장해요.
   item: { id, kind, x, y, w, h, rot, z, ... }
     sticker  : emoji | mediaId(나만의 스티커)
     tape     : style
     memo     : style, text, fs
     photo    : mediaId, frame, zoom, cx, cy
     collage  : mediaIds[], frame
     text     : text, fs, color, bold
   ========================================================= */
(function () {
  const M = window.MMSD;
  const W = 800, H = 1100;

  /* ---------- 재료 (모두 처음부터 사용 가능) ---------- */
  const STICKERS = [
    { id: 'char', name: '🐰 캐릭터·동물', list: ['🐶', '🐱', '🐰', '🐻', '🐼', '🐨', '🦊', '🐹', '🐸', '🐧', '🐥', '🦄', '🐳', '🐙', '🦋', '🐝', '🐞', '🐢', '🦖', '🐯', '🐮', '🐷'] },
    { id: 'food', name: '🍰 음식·디저트', list: ['🍓', '🍒', '🍑', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '🍦', '🍨', '🍮', '🥞', '🧇', '🍙', '🍣', '🍕', '🍔', '🧋', '🍉', '🥤'] },
    { id: 'flower', name: '🌷 꽃·식물', list: ['🌸', '🌷', '🌹', '🌻', '🌼', '💐', '🌺', '🪷', '🍀', '🌿', '🌱', '🌵', '🍃', '🌾', '🪴', '🍄', '🌳', '🥀'] },
    { id: 'star', name: '✨ 별·하트·반짝이', list: ['⭐', '🌟', '✨', '💫', '💖', '💗', '💕', '💞', '💓', '💝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🎀', '💎', '🔮', '🫧', '🪐'] },
    { id: 'school', name: '✏️ 학교생활', list: ['📚', '📖', '✏️', '🖍️', '📏', '📐', '📎', '📌', '🎒', '🏫', '🔔', '🏆', '🥇', '📝', '🎨', '🎵', '⚽', '🏀', '💯', '🖊️', '🧮', '🔬'] },
    { id: 'season', name: '🌈 계절·날씨', list: ['☀️', '🌤️', '⛅', '🌧️', '⛈️', '❄️', '☃️', '⛄', '🌈', '🌙', '🍂', '🍁', '🎃', '🎄', '🎆', '🌊', '🏖️', '☂️', '🧣', '🌨️'] }
  ];
  const TAPES = [
    { id: 'pink', name: '핑크 줄무늬', a: '#ffb6c9', b: '#ffe2ea', p: 'stripe' },
    { id: 'blue', name: '블루 줄무늬', a: '#a9d2f5', b: '#e6f2fd', p: 'stripe' },
    { id: 'mint', name: '민트 도트', a: '#8fd9c2', b: '#e3f8f1', p: 'dots' },
    { id: 'lemon', name: '레몬 체크', a: '#ffd75e', b: '#fff6c9', p: 'check' },
    { id: 'gingham', name: '빨강 깅엄', a: '#f29a9a', b: '#ffffff', p: 'check' },
    { id: 'lav', name: '라벤더', a: '#d6c8ff', b: '#d6c8ff', p: 'solid' },
    { id: 'kraft', name: '크라프트', a: '#d6b88a', b: '#d6b88a', p: 'solid' },
    { id: 'rainbow', name: '무지개', a: '', b: '', p: 'rainbow' }
  ];
  const MEMOS = [
    { id: 'yellow', name: '노랑 포스트잇', bg: '#fff3a3', line: 'none' },
    { id: 'pink', name: '핑크 포스트잇', bg: '#ffd6e2', line: 'none' },
    { id: 'lined', name: '줄 노트', bg: '#ffffff', line: 'lined', lc: '#c9dcf2' },
    { id: 'grid', name: '모눈 메모', bg: '#fbfdff', line: 'grid', lc: '#d5e5f5' },
    { id: 'letter', name: '꽃 편지지', bg: '#fff7fa', line: 'lined', lc: '#f5c6d6', border: '#f19bb7' },
    { id: 'kraft', name: '크라프트 메모', bg: '#e2c9a3', line: 'none' }
  ];
  const FRAMES = [['none', '틀 없음'], ['polaroid', '폴라로이드'], ['white', '흰 테두리'], ['round', '동그라미'], ['film', '필름'], ['stamp', '우표']];
  const BGS = [
    { id: 'theme', name: '테마 따라가기' },
    { id: 'cream', name: '크림 종이', c: '#fffaf0' },
    { id: 'pinkdot', name: '핑크 도트', c: '#fff0f5', p: 'dots', pc: '#f7c3d4' },
    { id: 'bluegrid', name: '블루 모눈', c: '#f3f8ff', p: 'grid', pc: '#cfe0f3' },
    { id: 'mintline', name: '민트 줄노트', c: '#f1fbf7', p: 'lines', pc: '#bfe6d6' },
    { id: 'lemoncheck', name: '레몬 체크', c: '#fffbe6', p: 'check', pc: 'rgba(255, 214, 90, .3)' },
    { id: 'kraft', name: '크라프트지', c: '#dcc29b', p: 'dots', pc: 'rgba(120, 85, 40, .16)' },
    { id: 'night', name: '밤하늘', c: '#2b3158', p: 'dots', pc: 'rgba(255, 255, 255, .5)' }
  ];
  const BORDERS = [['none', '테두리 없음'], ['dashed', '점선'], ['double', '이중선'], ['stitch', '스티치'], ['round', '둥근 테두리']];

  const find = function (list, id) { return list.find(function (x) { return x.id === id; }) || list[0]; };

  /* ---------- CSS 무늬 ---------- */
  function patternCSS(p, pc) {
    switch (p) {
      case 'dots': return { img: 'radial-gradient(' + pc + ' 2px, transparent 2.6px)', size: '24px 24px' };
      case 'grid': return { img: 'linear-gradient(' + pc + ' 1px, transparent 1px), linear-gradient(90deg, ' + pc + ' 1px, transparent 1px)', size: '28px 28px' };
      case 'lines': return { img: 'linear-gradient(transparent 33px, ' + pc + ' 33px, ' + pc + ' 34px)', size: '100% 34px' };
      case 'check': return { img: 'linear-gradient(90deg, ' + pc + ' 50%, transparent 50%), linear-gradient(' + pc + ' 50%, transparent 50%)', size: '40px 40px' };
      default: return null;
    }
  }
  function tapeCSS(t) {
    switch (t.p) {
      case 'stripe': return 'repeating-linear-gradient(45deg, ' + t.a + ' 0 9px, ' + t.b + ' 9px 18px)';
      case 'dots': return 'radial-gradient(' + t.a + ' 3px, transparent 3.6px) 0 0 / 14px 14px, ' + t.b;
      case 'check': return 'linear-gradient(90deg, ' + t.a + '88 50%, transparent 50%) 0 0 / 20px 20px, linear-gradient(' + t.a + '88 50%, transparent 50%) 0 0 / 20px 20px, ' + t.b;
      case 'rainbow': return 'linear-gradient(90deg, #ffb3ba, #ffdfba, #fff5ba, #baffc9, #bae1ff, #e0c3fc)';
      default: return t.a;
    }
  }
  function memoCSS(m) {
    let s = 'background-color:' + m.bg + ';';
    if (m.line === 'lined') s += 'background-image:linear-gradient(transparent 31px, ' + m.lc + ' 31px, ' + m.lc + ' 32px);background-size:100% 32px;background-position:0 14px;';
    if (m.line === 'grid') s += 'background-image:linear-gradient(' + m.lc + ' 1px, transparent 1px),linear-gradient(90deg, ' + m.lc + ' 1px, transparent 1px);background-size:22px 22px;';
    if (m.border) s += 'box-shadow:inset 0 0 0 6px ' + m.border + ', 0 4px 10px rgba(0,0,0,.12);';
    return s;
  }
  function pageBgStyle(page) {
    const bg = find(BGS, page.data.bg);
    if (bg.id === 'theme') return '';
    const pat = bg.p ? patternCSS(bg.p, bg.pc) : null;
    return 'background-color:' + bg.c + ';' + (pat ? 'background-image:' + pat.img + ';background-size:' + pat.size + ';' : 'background-image:none;');
  }

  /* ---------- 콜라주 칸 배치 (0~1 비율) ---------- */
  function collageCells(n) {
    const g = 0.025;
    if (n <= 1) return [[0, 0, 1, 1]];
    if (n === 2) return [[0, 0, 0.5 - g / 2, 1], [0.5 + g / 2, 0, 0.5 - g / 2, 1]];
    if (n === 3) return [[0, 0, 0.6 - g / 2, 1], [0.6 + g / 2, 0, 0.4 - g / 2, 0.5 - g / 2], [0.6 + g / 2, 0.5 + g / 2, 0.4 - g / 2, 0.5 - g / 2]];
    if (n === 4) return [[0, 0, 0.5 - g / 2, 0.5 - g / 2], [0.5 + g / 2, 0, 0.5 - g / 2, 0.5 - g / 2], [0, 0.5 + g / 2, 0.5 - g / 2, 0.5 - g / 2], [0.5 + g / 2, 0.5 + g / 2, 0.5 - g / 2, 0.5 - g / 2]];
    const cols = 3, rows = Math.ceil(Math.min(n, 6) / 3), cw = (1 - g * (cols - 1)) / cols, ch = (1 - g * (rows - 1)) / rows;
    const out = [];
    for (let i = 0; i < Math.min(n, 6); i++) out.push([(i % cols) * (cw + g), Math.floor(i / cols) * (ch + g), cw, ch]);
    return out;
  }

  /* ---------- 화면용 재료 그리기 ---------- */
  function cropImg(id, it) {
    const zoom = it.zoom || 1, cx = it.cx == null ? 50 : it.cx, cy = it.cy == null ? 50 : it.cy;
    return '<img data-media="' + M.ui.esc(id) + '" data-variant="full" alt="" draggable="false" style="object-position:' + cx + '% ' + cy + '%;transform:scale(' + zoom + ');transform-origin:' + cx + '% ' + cy + '%">';
  }
  function itemInner(it) {
    const esc = M.ui.esc;
    switch (it.kind) {
      case 'sticker':
        return it.mediaId ? '<img class="d-stk" data-media="' + esc(it.mediaId) + '" data-variant="full" alt="" draggable="false">'
          : '<span class="d-emoji">' + esc(it.emoji) + '</span>';
      case 'tape': return '<div class="d-tape" style="background:' + tapeCSS(find(TAPES, it.style)) + '"></div>';
      case 'memo': {
        const m = find(MEMOS, it.style);
        return '<div class="d-memo" style="' + memoCSS(m) + 'font-size:' + (it.fs || 24) + 'px">' + esc(it.text || '').replace(/\n/g, '<br>') + '</div>';
      }
      case 'text':
        return '<div class="d-text" style="font-size:' + (it.fs || 40) + 'px;color:' + esc(it.color || '#4a3540') + ';font-weight:' + (it.bold ? 800 : 500) + '">' + esc(it.text || '').replace(/\n/g, '<br>') + '</div>';
      case 'photo':
        return '<div class="d-photo fr-' + (it.frame || 'none') + '"><div class="d-crop">' + (it.mediaId ? cropImg(it.mediaId, it) : '<span class="d-ph">📷</span>') + '</div></div>';
      case 'collage': {
        const ids = it.mediaIds || [];
        return '<div class="d-collage"><div class="d-cin">' + collageCells(ids.length).map(function (c, i) {
          return '<div class="d-crop" style="left:' + c[0] * 100 + '%;top:' + c[1] * 100 + '%;width:' + c[2] * 100 + '%;height:' + c[3] * 100 + '%">' + cropImg(ids[i], {}) + '</div>';
        }).join('') + '</div></div>';
      }
    }
    return '';
  }
  function applyGeom(el, it) {
    el.style.left = it.x + 'px';
    el.style.top = it.y + 'px';
    el.style.width = it.w + 'px';
    el.style.height = it.h + 'px';
    el.style.transform = 'rotate(' + (it.rot || 0) + 'deg)';
    el.style.zIndex = String(it.z || 1);
    const em = el.querySelector('.d-emoji');
    if (em) em.style.fontSize = (Math.min(it.w, it.h) * 0.82) + 'px';
  }
  function makeItemEl(it) {
    const el = document.createElement('div');
    el.className = 'd-item k-' + it.kind;
    el.dataset.id = it.id;
    el.innerHTML = itemInner(it);
    applyGeom(el, it);
    return el;
  }

  /* 페이지를 화면에 그림 (목록 미리보기 · 편집기 공용) */
  function renderStage(stage, page) {
    const d = page.data;
    stage.className = 'd-stage bd-' + (d.border || 'none') + (d.bg === 'theme' || !d.bg ? ' bg-theme' : '');
    if (d.themeId) stage.setAttribute('data-theme', M.themes.resolve(d.themeId)); else stage.removeAttribute('data-theme');
    stage.setAttribute('style', pageBgStyle(page));
    stage.innerHTML = '';
    (d.items || []).slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); }).forEach(function (it) { stage.appendChild(makeItemEl(it)); });
    M.ui.hydrate(stage);
  }

  /* 작은 미리보기 (목록 카드용) */
  function previewHTML(page, width) {
    const s = width / W;
    return '<div class="d-preview" style="width:' + width + 'px;height:' + Math.round(H * s) + 'px"><div class="d-stage-holder" data-page-preview="' + page.id + '" style="transform:scale(' + s + ')"></div></div>';
  }
  function hydratePreviews(root, pages) {
    root.querySelectorAll('[data-page-preview]').forEach(function (h) {
      const p = pages.find(function (x) { return x.id === h.dataset.pagePreview; });
      if (!p) return;
      const st = document.createElement('div');
      h.appendChild(st);
      renderStage(st, p);
    });
  }

  /* ---------- 이미지(PNG)로 그리기 ---------- */
  function loadImage(id) {
    return M.media.url(id, 'full').then(function (u) {
      return new Promise(function (res) {
        if (!u) return res(null);
        const img = new Image();
        img.onload = function () { res(img); };
        img.onerror = function () { res(null); };
        img.src = u;
      });
    });
  }
  function drawPattern(ctx, w, h, p, pc) {
    ctx.save();
    ctx.fillStyle = pc; ctx.strokeStyle = pc; ctx.lineWidth = 1;
    if (p === 'dots') for (let y = 12; y < h; y += 24) for (let x = 12; x < w; x += 24) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
    if (p === 'grid') { for (let x = 0; x < w; x += 28) ctx.fillRect(x, 0, 1, h); for (let y = 0; y < h; y += 28) ctx.fillRect(0, y, w, 1); }
    if (p === 'lines') for (let y = 33; y < h; y += 34) ctx.fillRect(0, y, w, 1);
    if (p === 'check') { for (let x = 0; x < w; x += 40) ctx.fillRect(x, 0, 20, h); for (let y = 0; y < h; y += 40) ctx.fillRect(0, y, w, 20); }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrapText(ctx, text, maxW) {
    const out = [];
    String(text || '').split('\n').forEach(function (para) {
      let line = '';
      for (const ch of para) {
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch;
      }
      out.push(line);
    });
    return out;
  }
  function drawCover(ctx, img, ax, ay, aw, ah, it) {
    const zoom = it.zoom || 1, cx = (it.cx == null ? 50 : it.cx) / 100, cy = (it.cy == null ? 50 : it.cy) / 100;
    const s0 = Math.max(aw / img.naturalWidth, ah / img.naturalHeight);
    const dw0 = img.naturalWidth * s0, dh0 = img.naturalHeight * s0;
    const dx0 = (aw - dw0) * cx, dy0 = (ah - dh0) * cy;
    const ox = aw * cx, oy = ah * cy;
    ctx.save();
    ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip();
    ctx.drawImage(img, ax + ox + (dx0 - ox) * zoom, ay + oy + (dy0 - oy) * zoom, dw0 * zoom, dh0 * zoom);
    ctx.restore();
  }
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const TEXT_FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';

  async function drawItem(ctx, it, imgs) {
    const w = it.w, h = it.h;
    ctx.save();
    ctx.translate(it.x + w / 2, it.y + h / 2);
    ctx.rotate((it.rot || 0) * Math.PI / 180);
    ctx.translate(-w / 2, -h / 2);
    switch (it.kind) {
      case 'sticker':
        if (it.mediaId) {
          const img = imgs[it.mediaId];
          if (img) {
            const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
            ctx.drawImage(img, (w - img.naturalWidth * s) / 2, (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
          }
        } else {
          ctx.font = (Math.min(w, h) * 0.82) + 'px ' + EMOJI_FONT;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(it.emoji, w / 2, h / 2 + Math.min(w, h) * 0.04);
        }
        break;
      case 'tape': {
        const t = find(TAPES, it.style);
        ctx.globalAlpha = 0.88;
        ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
        if (t.p === 'rainbow') {
          const g = ctx.createLinearGradient(0, 0, w, 0);
          ['#ffb3ba', '#ffdfba', '#fff5ba', '#baffc9', '#bae1ff', '#e0c3fc'].forEach(function (c, i, a) { g.addColorStop(i / (a.length - 1), c); });
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = t.p === 'stripe' ? t.a : t.b; ctx.fillRect(0, 0, w, h);
          if (t.p === 'stripe') {
            ctx.fillStyle = t.b;
            for (let i = -h; i < w + h; i += 25.5) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 12.7, 0); ctx.lineTo(i + 12.7 - h, h); ctx.lineTo(i - h, h); ctx.fill(); }
          }
          if (t.p === 'dots') { ctx.fillStyle = t.a; for (let y = 7; y < h; y += 14) for (let x = 7; x < w; x += 14) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); } }
          if (t.p === 'check') { ctx.fillStyle = t.a + '88'; for (let x = 0; x < w; x += 20) ctx.fillRect(x, 0, 10, h); for (let y = 0; y < h; y += 20) ctx.fillRect(0, y, w, 10); }
        }
        break;
      }
      case 'memo': {
        const m = find(MEMOS, it.style);
        ctx.shadowColor = 'rgba(0,0,0,.14)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        ctx.fillStyle = m.bg; ctx.fillRect(0, 0, w, h);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = m.lc || 'transparent';
        if (m.line === 'lined') for (let y = 45; y < h; y += 32) ctx.fillRect(0, y, w, 1);
        if (m.line === 'grid') { for (let x = 0; x < w; x += 22) ctx.fillRect(x, 0, 1, h); for (let y = 0; y < h; y += 22) ctx.fillRect(0, y, w, 1); }
        if (m.border) { ctx.strokeStyle = m.border; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6); }
        const fs = it.fs || 24;
        ctx.fillStyle = '#3a3036'; ctx.font = fs + 'px ' + TEXT_FONT; ctx.textBaseline = 'top';
        wrapText(ctx, it.text, w - 36).forEach(function (l, i) { if (18 + i * fs * 1.45 < h - fs) ctx.fillText(l, 18, 18 + i * fs * 1.45); });
        break;
      }
      case 'text': {
        const fs = it.fs || 40;
        ctx.fillStyle = it.color || '#4a3540';
        ctx.font = (it.bold ? '800 ' : '500 ') + fs + 'px ' + TEXT_FONT; ctx.textBaseline = 'top';
        wrapText(ctx, it.text, w).forEach(function (l, i) { ctx.fillText(l, 0, i * fs * 1.3); });
        break;
      }
      case 'photo': {
        const f = it.frame || 'none';
        let ax = 0, ay = 0, aw = w, ah = h;
        ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = f === 'none' ? 0 : 12; ctx.shadowOffsetY = 4;
        if (f === 'polaroid') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ax = w * 0.06; ay = w * 0.06; aw = w - ax * 2; ah = h - ay - h * 0.18; }
        if (f === 'white' || f === 'stamp') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ax = ay = Math.min(w, h) * 0.05; aw = w - ax * 2; ah = h - ay * 2; }
        if (f === 'film') { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, w, h); ax = w * 0.04; ay = h * 0.1; aw = w - ax * 2; ah = h - ay * 2; }
        ctx.shadowColor = 'transparent';
        if (f === 'film') { ctx.fillStyle = '#eee'; for (let x = 10; x < w - 10; x += 26) { ctx.fillRect(x, h * 0.03, 12, h * 0.04); ctx.fillRect(x, h * 0.93, 12, h * 0.04); } }
        if (f === 'stamp') { ctx.strokeStyle = '#d9d9d9'; ctx.setLineDash([6, 6]); ctx.lineWidth = 3; ctx.strokeRect(2, 2, w - 4, h - 4); ctx.setLineDash([]); }
        const img = imgs[it.mediaId];
        if (f === 'round') { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.clip(); }
        if (img) drawCover(ctx, img, ax, ay, aw, ah, it);
        break;
      }
      case 'collage': {
        ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.shadowColor = 'transparent';
        const px = w * 0.04, py = h * 0.04, iw = w - px * 2, ih = h - py * 2;
        const ids = it.mediaIds || [];
        collageCells(ids.length).forEach(function (c, i) {
          const img = imgs[ids[i]];
          if (img) drawCover(ctx, img, px + c[0] * iw, py + c[1] * ih, c[2] * iw, c[3] * ih, {});
        });
        break;
      }
    }
    ctx.restore();
  }

  async function toCanvas(page, themeHost) {
    const scale = 1.5;
    const c = document.createElement('canvas');
    c.width = W * scale; c.height = H * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    const d = page.data;
    const cs = getComputedStyle(themeHost);
    const bg = find(BGS, d.bg);
    if (bg.id === 'theme') {
      ctx.fillStyle = cs.getPropertyValue('--bg').trim() || '#fff'; ctx.fillRect(0, 0, W, H);
      drawPattern(ctx, W, H, 'dots', cs.getPropertyValue('--line').trim() || '#eee');
    } else {
      ctx.fillStyle = bg.c; ctx.fillRect(0, 0, W, H);
      if (bg.p) drawPattern(ctx, W, H, bg.p, bg.pc);
    }
    const bc = cs.getPropertyValue('--accent').trim() || '#e8a0b8';
    ctx.strokeStyle = bc;
    if (d.border === 'dashed') { ctx.lineWidth = 5; ctx.setLineDash([16, 12]); ctx.strokeRect(22, 22, W - 44, H - 44); }
    if (d.border === 'double') { ctx.lineWidth = 4; ctx.strokeRect(18, 18, W - 36, H - 36); ctx.strokeRect(32, 32, W - 64, H - 64); }
    if (d.border === 'stitch') { ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.strokeRect(30, 30, W - 60, H - 60); }
    if (d.border === 'round') { ctx.lineWidth = 12; roundRect(ctx, 16, 16, W - 32, H - 32, 44); ctx.stroke(); }
    ctx.setLineDash([]);

    const ids = new Set();
    (d.items || []).forEach(function (it) {
      if (it.mediaId) ids.add(it.mediaId);
      (it.mediaIds || []).forEach(function (m) { ids.add(m); });
    });
    const imgs = {};
    await Promise.all(Array.from(ids).map(function (id) { return loadImage(id).then(function (img) { imgs[id] = img; }); }));
    const items = (d.items || []).slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); });
    for (const it of items) await drawItem(ctx, it, imgs);
    return c;
  }

  async function downloadPNG(page, themeHost) {
    const c = await toCanvas(page, themeHost);
    const blob = await new Promise(function (res) { c.toBlob(res, 'image/png'); });
    if (!blob) throw MMSD.AppError('IMAGE', '이미지를 만들지 못했어요.');
    await M.saveFile(blob, (page.title || '꾸민 페이지').replace(/[\\/:*?"<>|]/g, '_') + '.png');
  }

  M.deco = {
    W: W, H: H, STICKERS: STICKERS, TAPES: TAPES, MEMOS: MEMOS, FRAMES: FRAMES, BGS: BGS, BORDERS: BORDERS,
    find: find, tapeCSS: tapeCSS, memoCSS: memoCSS, patternCSS: patternCSS,
    itemInner: itemInner, applyGeom: applyGeom, makeItemEl: makeItemEl,
    renderStage: renderStage, previewHTML: previewHTML, hydratePreviews: hydratePreviews,
    toCanvas: toCanvas, downloadPNG: downloadPNG
  };
})();
