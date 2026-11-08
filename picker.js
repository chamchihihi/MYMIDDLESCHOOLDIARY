/* ---------------------------------------------------------
   사진·동영상(·첨부 파일) 첨부 칸
   MMSD.mediaPicker(container, { ids: [...], onChange(ids), files: true|false })
   - 사진을 누르면 원본을 새 창에서 보고, 파일은 내려받아요.
   --------------------------------------------------------- */
/* 사진·동영상 크게 보기 (새 창 대신 화면 위에 띄움 — 앱 안에서도 동작) */
MMSD.lightbox = function (kind, url, name) {
  const esc = MMSD.ui.esc;
  const prev = document.activeElement;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', name || '크게 보기');
  box.innerHTML = '<button type="button" class="lb-close" aria-label="닫기">✕</button>' +
    (kind === 'video' ? '<video src="' + url + '" controls autoplay playsinline></video>' : '<img src="' + url + '" alt="' + esc(name || '') + '">');
  function close() {
    document.removeEventListener('keydown', onKey);
    box.remove();
    if (prev && prev.focus) prev.focus();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.lb-close')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(box);
  box.querySelector('.lb-close').focus();
};

MMSD.mediaPicker = function (container, opts) {
  const M = window.MMSD;
  const R = M.media.RULES;
  let ids = (opts.ids || []).slice();
  const allowFiles = !!opts.files;
  const accept = M.media.ACCEPT + (allowFiles ? ',' + R.file.exts.map(function (e) { return '.' + e; }).join(',') : '');

  container.classList.add('media-picker');
  container.innerHTML = '<ul class="mp-grid"></ul>' +
    '<label class="btn mp-add">' + (allowFiles ? '📎 사진·동영상·파일 추가' : '📷 사진·동영상 추가') +
    '<input type="file" multiple accept="' + accept + '" hidden></label>' +
    '<p class="mp-hint">사진 한 장 ' + M.media.fmtSize(R.image.max) + ', 동영상 한 개 ' + M.media.fmtSize(R.video.max) +
      (allowFiles ? ', 파일 한 개 ' + M.media.fmtSize(R.file.max) + ' (' + R.file.ext + ')' : '') + '까지 저장돼요. 사진을 누르면 크게 볼 수 있어요.</p>';
  const grid = container.querySelector('.mp-grid');
  const input = container.querySelector('input');

  function tile(id) {
    const li = document.createElement('li');
    li.className = 'mp-tile';
    li.dataset.id = id;
    li.innerHTML = '<span class="mp-loading">불러오는 중…</span>' +
      '<button type="button" class="mp-del" aria-label="첨부 빼기">✕</button>';
    li.querySelector('.mp-del').addEventListener('click', function () {
      ids = ids.filter(function (x) { return x !== id; });
      li.remove();
      opts.onChange && opts.onChange(ids.slice());
    });
    Promise.all([M.media.getMeta(id), M.media.url(id, 'thumb'), M.media.url(id, 'full')]).then(function (r) {
      const meta = r[0], thumbUrl = r[1], fullUrl = r[2];
      const box = li.querySelector('.mp-loading');
      if (!meta || !thumbUrl) { box.textContent = '파일 없음'; return; }
      const name = M.ui.esc(meta.name);
      let inner;
      if (meta.kind === 'file') inner = '<span class="mp-file"><span aria-hidden="true">📄</span><small>' + name + '</small></span>';
      else if (meta.kind === 'video' && !meta.hasThumb) inner = '<span class="mp-video-ph">🎬</span>';
      else inner = '<img alt="' + name + '" src="' + thumbUrl + '">';
      box.outerHTML = '<button type="button" class="mp-open" aria-label="' + name + (meta.kind === 'file' ? ' 내려받기' : ' 크게 보기') + '">' + inner + '</button>';
      li.querySelector('.mp-open').addEventListener('click', async function () {
        if (meta.kind === 'file') {
          try {
            await M.saveFile(await (await fetch(fullUrl)).blob(), meta.name);
            M.toast('📄 "' + meta.name + '" — ' + M.savedWhere());
          } catch (e) { M.toast(M.db.friendly(e).message, true); }
        } else {
          M.lightbox(meta.kind, fullUrl, meta.name);
        }
      });
      if (meta.kind === 'video') li.insertAdjacentHTML('beforeend', '<span class="mp-badge">▶</span>');
    }).catch(function () { li.querySelector('.mp-loading').textContent = '불러오기 실패'; });
    return li;
  }

  ids.forEach(function (id) { grid.appendChild(tile(id)); });

  input.addEventListener('change', async function (e) {
    e.stopPropagation();
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;
    const pending = files.map(function () {
      const li = document.createElement('li');
      li.className = 'mp-tile mp-saving';
      li.innerHTML = '<span class="mp-loading">저장 중…</span>';
      grid.appendChild(li);
      return li;
    });
    let i = 0;
    await M.media.addMany(files, function (res) {
      const li = pending[i++];
      if (res.ok) {
        if (ids.indexOf(res.media.id) >= 0) {
          li.remove();
          M.toast('"' + res.file.name + '"은(는) 이미 첨부되어 있어요.');
        } else {
          ids.push(res.media.id);
          li.replaceWith(tile(res.media.id));
          opts.onChange && opts.onChange(ids.slice());
        }
      } else {
        li.remove();
        M.toast(res.error.message, true);
      }
    }, allowFiles);
  });

  return { getIds: function () { return ids.slice(); } };
};
