/* =========================================================
   사진·동영상 저장 — 원본 + 미리보기(썸네일)를 media 저장소에 보관
   - 형식/용량 검사, 남은 저장 공간 확인
   - 같은 파일을 두 번 올리면 하나만 저장 (중복 방지)
   - 저장 후 다시 읽어서 제대로 저장됐는지 확인
   ========================================================= */
MMSD.media = (function () {
  const db = MMSD.db;
  const MB = 1024 * 1024;

  const RULES = {
    image: { types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], max: 30 * MB, label: '사진', ext: 'JPG·PNG·GIF·WEBP' },
    video: { types: ['video/mp4', 'video/webm', 'video/quicktime'], max: 100 * MB, label: '동영상', ext: 'MP4·WEBM·MOV' },
    /* 첨부 파일 (수행평가 등 첨부 파일 칸에서만 허용) */
    file: { types: [], exts: ['pdf', 'hwp', 'hwpx', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip'], max: 30 * MB, label: '파일', ext: 'PDF·HWP·워드·PPT·엑셀·TXT·ZIP' }
  };
  const THUMB_MAX = 480;

  function fmtSize(b) {
    if (!b) return '0B';
    if (b < 1024) return b + 'B';
    if (b < MB) return (b / 1024).toFixed(0) + 'KB';
    if (b < 1024 * MB) return (b / MB).toFixed(1).replace(/\.0$/, '') + 'MB';
    return (b / 1024 / MB).toFixed(2).replace(/\.?0+$/, '') + 'GB';
  }

  function kindOf(file, allowFiles) {
    if (RULES.image.types.indexOf(file.type) >= 0) return 'image';
    if (RULES.video.types.indexOf(file.type) >= 0) return 'video';
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (allowFiles && RULES.file.exts.indexOf(ext) >= 0) return 'file';
    return null;
  }

  async function checkSpace(bytes) {
    if (!navigator.storage || !navigator.storage.estimate) return;
    try {
      const est = await navigator.storage.estimate();
      const free = (est.quota || 0) - (est.usage || 0);
      if (est.quota && free < bytes * 1.3 + 5 * MB) {
        throw MMSD.AppError('QUOTA', '저장 공간이 부족해요. 남은 공간: ' + fmtSize(Math.max(free, 0)) + '. 필요한 공간: ' + fmtSize(bytes));
      }
    } catch (e) {
      if (e.isAppError) throw e;
    }
  }

  async function sha256(buf) {
    if (!(window.crypto && crypto.subtle)) return null;
    try {
      const h = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) { return null; }
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) { canvas.toBlob(function (b) { resolve(b); }, 'image/jpeg', 0.82); });
  }
  function fit(w, h) {
    const r = Math.min(1, THUMB_MAX / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
  }

  function loadImage(blob) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('IMG')); };
      img.src = url;
    });
  }

  async function imageThumb(blob) {
    const img = await loadImage(blob);
    const w = img.naturalWidth, h = img.naturalHeight;
    const s = fit(w, h);
    const c = document.createElement('canvas');
    c.width = s.w; c.height = s.h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, s.w, s.h);
    ctx.drawImage(img, 0, 0, s.w, s.h);
    return { thumb: await canvasToBlob(c), width: w, height: h };
  }

  function videoThumb(blob) {
    return new Promise(function (resolve) {
      const url = URL.createObjectURL(blob);
      const v = document.createElement('video');
      let done = false;
      function finish(out) {
        if (done) return;
        done = true;
        URL.revokeObjectURL(url);
        v.removeAttribute('src');
        resolve(out || {});
      }
      const timer = setTimeout(function () { finish({}); }, 8000);
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.onerror = function () { clearTimeout(timer); finish({}); };
      const seekable = function () { return isFinite(v.duration) && v.duration > 0; };
      async function draw() {
        clearTimeout(timer);
        const duration = seekable() ? v.duration : null;
        try {
          const s = fit(v.videoWidth || 320, v.videoHeight || 240);
          const c = document.createElement('canvas');
          c.width = s.w; c.height = s.h;
          c.getContext('2d').drawImage(v, 0, 0, s.w, s.h);
          finish({ thumb: await canvasToBlob(c), width: v.videoWidth, height: v.videoHeight, duration: duration });
        } catch (e) {
          finish({ width: v.videoWidth, height: v.videoHeight, duration: duration });
        }
      }
      /* 길이를 알 수 있으면 0.5초 지점, 모르면 첫 화면을 미리보기로 사용 */
      v.onloadeddata = function () {
        if (seekable()) v.currentTime = Math.min(0.5, v.duration / 2);
        else draw();
      };
      v.onseeked = draw;
      v.src = url;
    });
  }

  function meta(rec) {
    return {
      id: rec.id, kind: rec.kind, mime: rec.mime, name: rec.name, size: rec.size,
      width: rec.width, height: rec.height, duration: rec.duration, createdAt: rec.createdAt,
      hasThumb: !!rec.thumb
    };
  }

  function getRaw(id) {
    return db._run(['media'], 'readonly', function (t) { return db._reqP(t.objectStore('media').get(id)); });
  }

  /* 파일 하나 저장 → 메타 정보 반환 (duplicate:true 이면 이미 있던 파일) */
  async function add(file, allowFiles) {
    const kind = kindOf(file, allowFiles);
    if (!kind) {
      throw MMSD.AppError('TYPE', '"' + file.name + '"은(는) 올릴 수 없는 형식이에요. 사진은 ' + RULES.image.ext + ', 동영상은 ' + RULES.video.ext +
        (allowFiles ? ', 파일은 ' + RULES.file.ext : '') + '만 저장할 수 있어요.');
    }
    const rule = RULES[kind];
    if (!file.size) throw MMSD.AppError('EMPTY', '"' + file.name + '" 파일이 비어 있어요.');
    if (file.size > rule.max) {
      throw MMSD.AppError('SIZE', '"' + file.name + '"이(가) 너무 커요 (' + fmtSize(file.size) + '). ' + rule.label + '은 한 개에 ' + fmtSize(rule.max) + '까지 저장할 수 있어요.');
    }
    await checkSpace(file.size);

    let buf;
    try { buf = await file.arrayBuffer(); } catch (e) {
      throw MMSD.AppError('READ', '"' + file.name + '" 파일을 읽지 못했어요. 다시 골라 주세요.');
    }

    const hash = await sha256(buf);
    if (hash) {
      const existing = await db._run(['media'], 'readonly', function (t) {
        return db._reqP(t.objectStore('media').index('hash').get(hash));
      });
      if (existing) return Object.assign(meta(existing), { duplicate: true });
    }

    const mime = file.type || 'application/octet-stream';
    const blob = new Blob([buf], { type: mime });
    let extra = {};
    try {
      if (kind === 'image') extra = await imageThumb(blob);
      else if (kind === 'video') extra = await videoThumb(blob);
    } catch (e) { extra = {}; }

    const rec = {
      id: db.uid(), kind: kind, mime: mime, name: file.name, size: file.size, hash: hash,
      blob: blob, thumb: extra.thumb || null,
      width: extra.width || null, height: extra.height || null, duration: extra.duration || null,
      createdAt: new Date().toISOString()
    };
    await db._run(['media'], 'readwrite', function (t) { return db._reqP(t.objectStore('media').put(rec)); });

    /* 저장 상태 확인: 다시 읽어서 크기가 같은지 */
    const back = await getRaw(rec.id);
    if (!back || !back.blob || back.blob.size !== rec.size) {
      throw MMSD.AppError('VERIFY', '"' + file.name + '"이(가) 제대로 저장되지 않았어요. 다시 시도해 주세요.');
    }
    return meta(rec);
  }

  /* 여러 파일을 차례로 저장. 실패한 파일은 error 에 이유를 담아 돌려줌 */
  async function addMany(files, onEach, allowFiles) {
    const results = [];
    for (const f of Array.from(files)) {
      let r;
      try { r = { file: f, ok: true, media: await add(f, allowFiles) }; }
      catch (e) { r = { file: f, ok: false, error: db.friendly(e) }; }
      results.push(r);
      if (onEach) onEach(r);
    }
    return results;
  }

  async function getMeta(id) {
    const r = await getRaw(id);
    return r ? meta(r) : null;
  }

  /* 화면에 보여줄 주소. variant: 'thumb'(미리보기) | 'full'(원본) */
  const urls = new Map();
  async function url(id, variant) {
    const key = id + ':' + (variant || 'thumb');
    if (urls.has(key)) return urls.get(key);
    const r = await getRaw(id);
    if (!r) return null;
    const blob = (variant !== 'full' && r.thumb) ? r.thumb : r.blob;
    const u = URL.createObjectURL(blob);
    urls.set(key, u);
    return u;
  }
  function releaseAll() {
    urls.forEach(function (u) { URL.revokeObjectURL(u); });
    urls.clear();
  }

  /* 어떤 기록에도 연결되지 않은 채 하루 이상 지난 파일 정리
     (사진을 올리다가 기록을 저장하지 않고 나간 경우) */
  function cleanupOrphans() {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    return db._run(['records', 'media'], 'readwrite', async function (t) {
      const records = await db._reqP(t.objectStore('records').getAll());
      const used = new Set();
      records.forEach(function (r) { (r.mediaIds || []).forEach(function (m) { used.add(m); }); });
      const ms = t.objectStore('media');
      const all = await db._reqP(ms.getAll());
      let removed = 0;
      for (const m of all) {
        if (!used.has(m.id) && m.createdAt < cutoff) { await db._reqP(ms.delete(m.id)); removed++; }
      }
      return removed;
    });
  }

  return {
    RULES: RULES,
    ACCEPT: RULES.image.types.concat(RULES.video.types).join(','),
    fmtSize: fmtSize,
    add: add,
    addMany: addMany,
    getMeta: getMeta,
    url: url,
    releaseAll: releaseAll,
    cleanupOrphans: cleanupOrphans
  };
})();

