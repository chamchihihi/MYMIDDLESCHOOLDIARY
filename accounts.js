/* =========================================================
   계정 (아이디 · 비밀번호) — 한 기기에서 여러 사람이 따로 쓰기
   - 계정마다 기록 저장소와 화면 설정이 완전히 따로예요.
   - 비밀번호와 복구 답은 그대로 저장하지 않고, 바꿔 쓴 값(해시)만 저장해요.
   - 인터넷 서버를 쓰지 않아요. 계정 정보도 이 기기 안에만 있어요.
   - 예전 기록(계정 기능 전)은 첫 계정을 만들 때 그 계정의 기록이 돼요.
   ========================================================= */
MMSD.accounts = (function () {
  const M = window.MMSD;
  const KEY = 'mmsd.accounts.v1';
  const LEGACY_LOCK = 'mmsd.lock.v1';
  const LEGACY_DB = 'mmsd-diary';
  const LEGACY_SETTINGS = 'mmsd.settings.v1';
  const ITER = 150000;
  const QUESTIONS = ['내가 처음 키운 반려동물 이름은?', '초등학교 때 가장 친한 친구 이름은?', '내가 가장 좋아하는 음식은?', '처음 좋아한 배우·가수는?', '직접 입력할게요'];
  const AVATARS = ['🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🐨', '🐧', '🦄', '🐹', '🐸', '🐥'];
  let current = null;

  /* ---------- 저장 ---------- */
  function readReg() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { accounts: [], last: '' }; } catch (e) { return { accounts: [], last: '' }; }
  }
  function writeReg(r) {
    try { localStorage.setItem(KEY, JSON.stringify(r)); return true; } catch (e) { return false; }
  }
  function list() { return readReg().accounts; }
  function find(username) {
    const u = normId(username);
    return list().find(function (a) { return a.username === u; }) || null;
  }
  function save(acc) {
    const r = readReg();
    const i = r.accounts.findIndex(function (a) { return a.id === acc.id; });
    if (i >= 0) r.accounts[i] = acc; else r.accounts.push(acc);
    if (!writeReg(r)) throw MMSD.AppError('ACCOUNT', '계정 정보를 저장하지 못했어요.');
  }

  /* ---------- 암호 바꿔 쓰기 ---------- */
  function supported() { return !!(window.crypto && crypto.subtle && window.TextEncoder); }
  function hex(buf) { return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  function randomSalt() { const a = new Uint8Array(16); crypto.getRandomValues(a); return hex(a.buffer); }
  async function derive(text, salt, iter) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(text), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: iter, hash: 'SHA-256' }, key, 256);
    return hex(bits);
  }
  function normAnswer(a) { return String(a || '').trim().toLowerCase().replace(/\s+/g, ''); }
  function normId(id) { return String(id || '').trim().toLowerCase(); }
  function checkId(id) {
    if (!/^[a-z0-9가-힣_]{2,20}$/.test(id)) throw MMSD.AppError('ID', '아이디는 2~20자의 한글·영어·숫자·밑줄(_)로 정해 주세요.');
    if (find(id)) throw MMSD.AppError('ID', '이미 있는 아이디예요. 다른 아이디를 정해 주세요.');
  }
  function checkPw(pw, pw2) {
    if (String(pw || '').length < 4) throw MMSD.AppError('PW', '비밀번호는 4자 이상으로 정해 주세요.');
    if (pw2 !== undefined && pw !== pw2) throw MMSD.AppError('PW', '두 비밀번호가 서로 달라요.');
  }

  /* ---------- 틀린 횟수 제한 (계정마다) ---------- */
  function failKey(acc) { return 'mmsd.acc.fail.' + acc.id; }
  function fails(acc) { try { return JSON.parse(localStorage.getItem(failKey(acc))) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } }
  function resetFails(acc) { try { localStorage.removeItem(failKey(acc)); } catch (e) { /* 무시 */ } }
  function addFail(acc) {
    const f = fails(acc);
    f.n += 1;
    if (f.n >= 5) f.until = Date.now() + Math.min(600, 30 * Math.pow(2, f.n - 5)) * 1000;
    try { localStorage.setItem(failKey(acc), JSON.stringify(f)); } catch (e) { /* 무시 */ }
    return f;
  }
  async function check(acc, kind, text) {
    const w = Math.max(0, Math.ceil((fails(acc).until - Date.now()) / 1000));
    if (w) throw MMSD.AppError('WAIT', '여러 번 틀려서 ' + w + '초 뒤에 다시 시도할 수 있어요.');
    const ok = kind === 'pw' ? (await derive(text, acc.salt, acc.iter)) === acc.hash
      : (await derive(normAnswer(text), acc.aSalt, acc.iter)) === acc.aHash;
    if (ok) { resetFails(acc); return true; }
    const f = addFail(acc);
    const left = 5 - f.n;
    throw MMSD.AppError('WRONG', (kind === 'pw' ? '비밀번호가 맞지 않아요.' : '답이 맞지 않아요.') +
      (left > 0 ? ' (' + left + '번 더 틀리면 잠시 기다려야 해요)' : ' 잠시 뒤에 다시 시도해 주세요.'));
  }

  /* ---------- 계정 만들기 · 바꾸기 ---------- */
  async function create(o) {
    if (!supported()) throw MMSD.AppError('ACCOUNT', '이 브라우저에서는 계정 기능을 쓸 수 없어요.');
    const username = normId(o.username);
    checkId(username);
    const name = String(o.name || '').trim() || username;
    const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const acc = {
      id: id, username: username, name: name, avatar: o.avatar || AVATARS[list().length % AVATARS.length],
      dbName: o.legacy ? LEGACY_DB : 'mmsd-diary-' + id,
      settingsKey: o.legacy ? LEGACY_SETTINGS : LEGACY_SETTINGS + '.' + id,
      iter: ITER, createdAt: new Date().toISOString()
    };
    if (o.legacyLock) {
      /* 예전 잠금 비밀번호와 복구 질문을 그대로 이어서 써요 */
      const L = o.legacyLock;
      Object.assign(acc, { iter: L.iter, salt: L.salt, hash: L.hash, q: L.q, aSalt: L.aSalt, aHash: L.aHash });
    } else {
      checkPw(o.pw, o.pw2);
      if (!String(o.q || '').trim()) throw MMSD.AppError('Q', '복구 질문을 적어 주세요.');
      if (!normAnswer(o.a)) throw MMSD.AppError('A', '복구 답을 적어 주세요.');
      acc.salt = randomSalt(); acc.hash = await derive(o.pw, acc.salt, ITER);
      acc.q = String(o.q).trim(); acc.aSalt = randomSalt(); acc.aHash = await derive(normAnswer(o.a), acc.aSalt, ITER);
    }
    save(acc);
    if (o.legacyLock) { try { localStorage.removeItem(LEGACY_LOCK); localStorage.removeItem('mmsd.lock.fail'); } catch (e) { /* 무시 */ } }
    return acc;
  }
  async function changePassword(acc, pw) {
    checkPw(pw);
    acc.salt = randomSalt();
    acc.hash = await derive(pw, acc.salt, acc.iter);
    save(acc);
    resetFails(acc);
  }
  async function changeQuestion(acc, q, a) {
    if (!String(q || '').trim() || !normAnswer(a)) throw MMSD.AppError('Q', '복구 질문과 답을 적어 주세요.');
    acc.q = String(q).trim();
    acc.aSalt = randomSalt();
    acc.aHash = await derive(normAnswer(a), acc.aSalt, acc.iter);
    save(acc);
  }
  function rename(acc, name, avatar) {
    acc.name = String(name || '').trim() || acc.username;
    if (avatar) acc.avatar = avatar;
    save(acc);
  }
  /* 계정과 그 계정의 기록 · 사진 · 설정을 이 기기에서 지워요 */
  async function remove(acc) {
    await M.db.destroy(acc.dbName);
    M.settings.destroy(acc.settingsKey);
    resetFails(acc);
    const r = readReg();
    r.accounts = r.accounts.filter(function (a) { return a.id !== acc.id; });
    if (r.last === acc.username) r.last = '';
    writeReg(r);
  }

  /* 로그인한 계정의 저장소 · 설정으로 바꾸기 */
  function enter(acc) {
    current = acc;
    const r = readReg();
    r.last = acc.username;
    writeReg(r);
    M.settings.use(acc.settingsKey);
    M.display.apply();
    M.db.use(acc.dbName);
    M.profile = null;
  }

  /* ---------- 예전 기록이 있는지 (계정 기능 전) ---------- */
  async function legacyInfo() {
    let lock = null;
    try { const v = JSON.parse(localStorage.getItem(LEGACY_LOCK)); if (v && v.hash) lock = v; } catch (e) { /* 없음 */ }
    let records = 0;
    try {
      let exists = true;
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        exists = dbs.some(function (d) { return d.name === LEGACY_DB; });
      }
      if (exists) {
        M.db.use(LEGACY_DB);
        const s = await M.db.stats();
        records = s.records + s.trashed;
        M.db.close();
      }
    } catch (e) { records = 0; }
    return { lock: lock, records: records };
  }

  /* =========================================================
     로그인 화면
     ========================================================= */
  function screen(done) {
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const box = document.createElement('div');
    box.className = 'lock-screen';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '다이어리 로그인');
    document.body.appendChild(box);
    document.body.classList.add('locked');
    let legacy = null;
    let forgotAcc = null;

    function qPicker() {
      return '<label class="flabel">복구 질문<select class="inp" data-n="q">' + QUESTIONS.map(function (q) { return '<option>' + q + '</option>'; }).join('') + '</select></label>' +
        '<input class="inp" data-n="qOwn" placeholder="나만의 질문을 적어 주세요" hidden>';
    }
    function field(n, label, type, extra) {
      return '<label class="flabel">' + label + '<input class="inp" data-n="' + n + '" type="' + (type || 'text') + '" ' + (extra || '') + '></label>';
    }

    function view(mode) {
      const accs = list();
      let inner;
      if (mode === 'create') {
        const mig = legacy && legacy.records && !accs.length;
        inner = (mig
          ? '<p class="lock-lead">✨ 이제 계정을 만들어 여러 사람이 따로 쓸 수 있어요.<br><b>지금까지 쓴 기록 ' + legacy.records + '개는 이 첫 계정의 기록이 돼요.</b></p>'
          : (accs.length ? '<p class="lock-lead">새 계정은 빈 다이어리에서 시작해요. 다른 사람의 기록은 볼 수 없어요.</p>'
            : '<p class="lock-lead">👋 환영해요! 내 다이어리 계정을 만들어 주세요.</p>')) +
          '<form data-f="create" class="lock-col">' +
            field('username', '아이디 (2~20자, 한글·영어·숫자)', 'text', 'autocomplete="username" required') +
            field('name', '이름 · 별명 (화면에 보여요)', 'text', 'autocomplete="nickname"') +
            (mig && legacy.lock
              ? field('oldpw', '지금 쓰던 잠금 비밀번호 (그대로 계정 비밀번호가 돼요)', 'password', 'autocomplete="current-password" required')
              : field('pw', '비밀번호 (4자 이상)', 'password', 'autocomplete="new-password" minlength="4" required') +
                field('pw2', '비밀번호 확인', 'password', 'autocomplete="new-password" minlength="4" required') +
                qPicker() + field('a', '복구 답 (비밀번호를 잊었을 때 써요)', 'text', 'autocomplete="off" required')) +
            '<button class="btn primary" type="submit">' + (mig ? '내 계정 만들고 기록 이어가기' : '계정 만들기') + '</button></form>' +
          (accs.length ? '<button type="button" class="link-btn" data-go="login">← 로그인으로</button>' : '');
      } else if (mode === 'forgot') {
        inner = forgotAcc
          ? '<p>복구 질문에 답해 주세요.</p><p class="lock-q">❓ ' + esc(forgotAcc.q) + '</p>' +
            '<form data-f="answer"><input class="inp" data-n="a" type="text" autocomplete="off" aria-label="복구 답" placeholder="답" required>' +
            '<button class="btn primary" type="submit">확인</button></form>' +
            '<button type="button" class="link-btn" data-go="login">← 로그인으로</button>'
          : '<p>비밀번호를 잊은 계정의 아이디를 적어 주세요.</p>' +
            '<form data-f="who"><input class="inp" data-n="username" type="text" autocomplete="username" aria-label="아이디" placeholder="아이디" required>' +
            '<button class="btn primary" type="submit">다음</button></form>' +
            '<button type="button" class="link-btn" data-go="login">← 로그인으로</button>';
      } else if (mode === 'reset') {
        inner = '<p><b>' + esc(forgotAcc.name) + '</b> 계정의 새 비밀번호를 정해 주세요.</p>' +
          '<form data-f="reset" class="lock-col">' +
            field('pw', '새 비밀번호 (4자 이상)', 'password', 'autocomplete="new-password" minlength="4" required') +
            field('pw2', '새 비밀번호 확인', 'password', 'autocomplete="new-password" minlength="4" required') +
            '<button class="btn primary" type="submit">저장하고 열기</button></form>';
      } else {
        const last = readReg().last;
        inner = '<p>누구의 다이어리를 열까요?</p>' +
          '<div class="acct-pick">' + accs.map(function (a) {
            return '<button type="button" class="acct-chip" data-pick="' + esc(a.username) + '" aria-pressed="' + (a.username === last) + '">' +
              '<span aria-hidden="true">' + esc(a.avatar) + '</span>' + esc(a.name) + '</button>';
          }).join('') + '</div>' +
          '<form data-f="login" class="lock-col">' +
            field('username', '아이디', 'text', 'autocomplete="username" required value="' + esc(last) + '"') +
            field('pw', '비밀번호', 'password', 'autocomplete="current-password" required') +
            '<button class="btn primary" type="submit">열기</button></form>' +
          '<div class="lock-links"><button type="button" class="link-btn" data-go="forgot">비밀번호를 잊었어요</button>' +
          '<button type="button" class="link-btn" data-go="create">+ 새 계정 만들기</button></div>';
      }
      box.innerHTML = '<div class="lock-card card tape"><div class="lock-emoji" aria-hidden="true">📒</div>' +
        '<h1>MY MIDDLE<br>SCHOOL DIARY</h1>' + inner + '<p class="lock-msg" role="alert"></p>' +
        '<p class="lock-note">🔒 계정과 기록은 이 기기 안에만 저장돼요.</p></div>';
      const first = box.querySelector(mode === 'login' && readReg().last ? '[data-n="pw"]' : 'input:not([hidden])');
      if (first) first.focus();
    }
    function msg(t) { box.querySelector('.lock-msg').textContent = t; }
    function v(n) { const e = box.querySelector('[data-n="' + n + '"]'); return e ? e.value : ''; }

    box.addEventListener('click', function (e) {
      const g = e.target.closest('[data-go]');
      if (g) { forgotAcc = null; view(g.dataset.go); return; }
      const p = e.target.closest('[data-pick]');
      if (p) {
        box.querySelector('[data-n="username"]').value = p.dataset.pick;
        box.querySelectorAll('[data-pick]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === p)); });
        box.querySelector('[data-n="pw"]').focus();
      }
    });
    box.addEventListener('change', function (e) {
      if (e.target.dataset.n === 'q') box.querySelector('[data-n="qOwn"]').hidden = e.target.value !== '직접 입력할게요';
    });
    box.addEventListener('submit', async function (e) {
      e.preventDefault();
      const f = e.target;
      const btn = f.querySelector('button[type="submit"]');
      btn.disabled = true;
      msg('');
      try {
        if (f.dataset.f === 'login') {
          const acc = find(v('username'));
          if (!acc) throw MMSD.AppError('ID', '그런 아이디가 없어요. 아이디를 확인하거나 새 계정을 만들어 주세요.');
          await check(acc, 'pw', v('pw'));
          return open(acc);
        }
        if (f.dataset.f === 'create') {
          const mig = legacy && legacy.records && !list().length;
          let legacyLock = null;
          if (mig && legacy.lock) {
            /* 예전 잠금 비밀번호 확인 */
            if ((await derive(v('oldpw'), legacy.lock.salt, legacy.lock.iter)) !== legacy.lock.hash) throw MMSD.AppError('WRONG', '지금 쓰던 잠금 비밀번호가 맞지 않아요.');
            legacyLock = legacy.lock;
          }
          const q = v('q') === '직접 입력할게요' ? v('qOwn') : v('q');
          const acc = await create({ username: v('username'), name: v('name'), pw: v('pw'), pw2: v('pw2'), q: q, a: v('a'), legacy: !!mig, legacyLock: legacyLock });
          return open(acc);
        }
        if (f.dataset.f === 'who') {
          const acc = find(v('username'));
          if (!acc) throw MMSD.AppError('ID', '그런 아이디가 없어요.');
          forgotAcc = acc;
          return view('forgot');
        }
        if (f.dataset.f === 'answer') {
          await check(forgotAcc, 'answer', v('a'));
          return view('reset');
        }
        if (f.dataset.f === 'reset') {
          checkPw(v('pw'), v('pw2'));
          await changePassword(forgotAcc, v('pw'));
          return open(forgotAcc);
        }
      } catch (err) {
        msg(err.message || '다시 시도해 주세요.');
        const pw = f.querySelector('input[type="password"]');
        if (pw && (err.code === 'WRONG' || err.code === 'WAIT')) { pw.value = ''; pw.focus(); }
      }
      btn.disabled = false;
    });

    function open(acc) {
      enter(acc);
      box.remove();
      document.body.classList.remove('locked');
      done(acc);
    }

    legacyInfo().then(function (info) {
      legacy = info;
      view(list().length ? 'login' : 'create');
    });
  }

  /* 로그인할 때까지 기다림 */
  function gate() {
    if (current) return Promise.resolve(current);
    return new Promise(function (resolve) { screen(resolve); });
  }

  /* 로그아웃: 남은 저장을 끝내고, 화면을 비우고, 로그인 화면으로 */
  async function logout() {
    await M.autosave.flushAll();
    current = null;
    const view = document.getElementById('view');
    if (view) view.innerHTML = '';
    M.media.releaseAll();
    M.db.close();
    M.profile = null;
    refreshUI();
    if (M.start) M.start();
  }

  /* 사이드바의 계정 표시 */
  function refreshUI() {
    const box = document.getElementById('acctBox');
    if (!box) return;
    box.hidden = !current;
    if (current) box.querySelector('#acctName').textContent = current.avatar + ' ' + current.name;
  }

  return {
    QUESTIONS: QUESTIONS, AVATARS: AVATARS,
    current: function () { return current; },
    isLocked: function () { return !current; },
    list: list, supported: supported, check: check,
    create: create, changePassword: changePassword, changeQuestion: changeQuestion, rename: rename, remove: remove,
    gate: gate, logout: logout, refreshUI: refreshUI
  };
})();
