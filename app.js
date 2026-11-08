/* 화면 이동(라우터) · 사이드바 · 테마 적용 */
(function () {
  const M = window.MMSD;
  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const menuBtn = document.getElementById('menuBtn');
  const topbarTitle = document.getElementById('topbarTitle');
  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  /* ---------- 알림 ---------- */
  function toast(msg, isError, action) {
    toastEl.innerHTML = '';
    toastEl.appendChild(document.createTextNode(msg));
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.toggle('has-action', !!action);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-btn';
      b.textContent = action.label;
      b.addEventListener('click', function () {
        toastEl.classList.remove('show');
        Promise.resolve(action.fn()).catch(function (e) { toast(M.db.friendly(e).message, true); });
      });
      toastEl.appendChild(b);
    }
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, isError ? 5500 : (action ? 6000 : 2200));
  }
  M.toast = toast;
  function saved(ok, msg) {
    if (ok) toast(msg);
    else toast('저장하지 못했어요. 브라우저 저장 공간이나 개인정보 보호 모드를 확인해 주세요.', true);
  }

  /* ---------- 사이드바 ---------- */
  function buildNav() {
    nav.innerHTML = M.menu.filter(function (m) { return !m.hidden; }).map(function (m) {
      return '<li><a href="#/' + m.id + '" data-id="' + m.id + '">' +
        '<span class="nav-ic" aria-hidden="true">' + m.icon + '</span><span>' + m.title + '</span></a></li>';
    }).join('');
  }
  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    menuBtn.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) { closeSidebar(); menuBtn.focus(); }
  });

  /* ---------- 라우터: #/메뉴/하위/... ---------- */
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const id = M.findMenu(parts[0]) ? parts[0] : 'home';
    return { id: id, sub: id === parts[0] ? parts.slice(1).filter(function (x) { return x !== ''; }) : [] };
  }

  function header(menu) {
    const s = M.settings.get();
    const own = s.pageThemes[menu.id] || '';
    const defaultName = M.themes.byId(s.defaultTheme).name;
    const opts = '<option value="">기본 테마 따르기 (' + defaultName + ')</option>' +
      M.themes.list.map(function (t) {
        return '<option value="' + t.id + '"' + (own === t.id ? ' selected' : '') + '>' + t.emoji + ' ' + t.name + '</option>';
      }).join('');
    return '<div class="page-head">' +
      '<div><h1 class="page-title"><a href="#/' + menu.id + '" class="title-link"><span aria-hidden="true">' + menu.icon + '</span> <span class="hl">' + menu.title + '</span></a></h1>' +
      '<p class="page-sub">' + menu.sub + '</p></div>' +
      '<label class="theme-pick">🎨 이 페이지 테마' +
      '<select class="select" id="pageThemeSelect">' + opts + '</select></label>' +
      '</div>';
  }

  let renderSeq = 0;
  async function render(keepScroll) {
    if (M.accounts.isLocked()) return;   /* 로그인 전에는 아무 기록도 화면에 그리지 않음 */
    const seq = ++renderSeq;
    const r = route();
    const id = r.id;
    const menu = M.findMenu(id);
    const themeId = M.themes.effectiveFor(id);
    M.themes.apply(themeId);

    nav.querySelectorAll('a').forEach(function (a) {
      if (a.dataset.id === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    topbarTitle.textContent = menu.icon + ' ' + menu.title;
    document.title = (id === 'home' ? '' : menu.title + ' · ') + 'MY MIDDLE SCHOOL DIARY';

    M.media.releaseAll();
    const banner = M.dbError
      ? '<div class="db-banner" role="alert"><b>⚠️ 기록 저장소를 열 수 없어요.</b> ' + M.dbError.message +
        ' 지금은 기록이 저장되지 않으니, 문제를 해결한 뒤 새로고침해 주세요.</div>'
      : '';
    const scrollY = window.scrollY;
    view.innerHTML = banner + header(menu) + '<div id="pageBody"><p class="empty loading">불러오는 중…</p></div>';
    bindHeader(id);
    const body = document.getElementById('pageBody');

    try {
      if (!M.profile) await M.ui.loadProfile();
      if (seq !== renderSeq) return;
      if (M.mods[id]) {
        await M.mods[id](body, r.sub, themeId);
      } else if (id === 'settings') {
        body.innerHTML = M.pages.settings();
        bindSettings();
        M.pages.fillStorage(document.getElementById('storageInfo'));
      } else {
        body.innerHTML = M.pages.placeholder(menu);
      }
      if (seq !== renderSeq) return;
      M.ui.hydrate(body);
    } catch (e) {
      console.error(e);
      if (seq === renderSeq) {
        body.innerHTML = '<div class="db-banner" role="alert"><b>⚠️ 화면을 불러오지 못했어요.</b> ' +
          M.ui.esc(M.db.friendly(e).message) + ' 새로고침해도 계속되면 백업 후 브라우저를 바꿔 보세요.</div>';
      }
    }
    if (keepScroll) window.scrollTo(0, scrollY);
    else { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  }
  M.rerender = function () { render(true); };

  function bindHeader(id) {
    document.getElementById('pageThemeSelect').addEventListener('change', async function (e) {
      await M.autosave.flushAll();
      saved(M.settings.setPageTheme(id, e.target.value), '이 페이지 테마를 저장했어요 🎨');
      render(true);
    });
  }

  M.bindSettings = function () { bindSettings(); };
  function bindSettings() {
    view.querySelectorAll('[data-pick-default]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const t = M.themes.byId(btn.dataset.pickDefault);
        saved(M.settings.setDefaultTheme(t.id), '기본 테마를 "' + t.name + '"(으)로 바꿨어요');
        render(true);
      });
    });
    view.querySelectorAll('[data-page-theme]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        const page = sel.dataset.pageTheme;
        saved(M.settings.setPageTheme(page, sel.value), M.findMenu(page).title + ' 테마를 저장했어요');
        render(true);
      });
    });
  }

  /* 페이지 이동 전에 저장하지 못한 기록이 있으면 먼저 저장, 실패하면 물어봄 */
  let lastHash = location.hash;
  let ignoreNext = false;
  M.replaceHash = function (h) {
    history.replaceState(null, '', h);
    lastHash = location.hash;
  };
  window.addEventListener('hashchange', async function () {
    if (ignoreNext) { ignoreNext = false; return; }
    closeSidebar();
    if (M.autosave.hasUnsaved()) {
      const ok = await M.autosave.flushAll();
      if (!ok && !window.confirm('아직 저장하지 못한 기록이 있어요. 이동하면 방금 입력한 내용이 사라질 수 있어요.\n그래도 이동할까요?')) {
        ignoreNext = true;
        location.hash = lastHash;
        return;
      }
    }
    lastHash = location.hash;
    render(false);
  });

  buildNav();

  /* 로그인 → 그 계정의 기록 저장소를 연 뒤 첫 화면 표시 (로그아웃 후 다시 로그인할 때도 사용) */
  M.start = async function () {
    await M.accounts.gate();
    M.dbError = null;
    try {
      await M.db.open();
      M.dbReady = true;
      M.media.cleanupOrphans().catch(function () { return 0; });
    } catch (e) {
      M.dbError = M.db.friendly(e);
    }
    M.accounts.refreshUI();
    if (M.protectStorage) M.protectStorage();
    render(false);
  };
  M.start();

  /* 사이드바 검색 · 로그아웃 */
  const sForm = document.getElementById('sideSearch');
  if (sForm) sForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const q = sForm.querySelector('input').value.trim();
    location.hash = '#/search/' + encodeURIComponent(q);
    sForm.querySelector('input').value = '';
  });
  const outBtn = document.getElementById('logoutBtn');
  if (outBtn) outBtn.addEventListener('click', function () { closeSidebar(); M.accounts.logout(); });

  /* ---------- 웹앱: 인터넷 없이 열기 · 앱으로 설치 ---------- */
  const isWeb = (location.protocol === 'https:' || location.hostname === 'localhost') && !window.AndroidDiary;
  if (isWeb && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* 설치 기능 없이도 그대로 쓸 수 있어요 */ });
  }
  let installEvt = null;
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) installBtn.addEventListener('click', async function () {
    if (!installEvt) return;
    installEvt.prompt();
    const r = await installEvt.userChoice;
    installEvt = null;
    installBtn.hidden = true;
    if (r && r.outcome === 'accepted') toast('홈 화면에 다이어리 앱을 설치했어요 📲');
  });
  window.addEventListener('appinstalled', function () { if (installBtn) installBtn.hidden = true; });

  /* 앱으로 설치해서 쓸 때는 브라우저가 기록을 함부로 지우지 않도록 자동으로 요청해요 */
  M.protectStorage = function () {
    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    if (!standalone || !navigator.storage || !navigator.storage.persist) return;
    navigator.storage.persisted().then(function (p) { if (!p) navigator.storage.persist(); }).catch(function () {});
  };
})();
