/* =========================================================
   기록 저장소 (IndexedDB) — 이 기기 브라우저 안에만 저장
   ---------------------------------------------------------
   데이터 구조
   1) records  : 모든 글 기록 (일기·친구·선생님·덕질·성적 등)
      {
        id        : 고유 ID (문자열)
        type      : 기록 종류 (아래 TYPES 중 하나)
        date      : 기록 날짜 'YYYY-MM-DD' (선택)
        grade     : 학년 1~3 (선택)
        title     : 제목 (선택, 검색용)
        tags      : 태그 배열
        links     : 다른 기록과의 연결 [{type, id}] (인물↔작품, 추억↔친구 등)
        mediaIds  : 첨부한 사진·동영상 ID 배열 (media 저장소 참조)
        data      : 메뉴별 상세 항목 (자유 구조)
        createdAt : 최초 작성 시각 (ISO)
        updatedAt : 마지막 수정 시각 (ISO)
        trashed   : 0 = 보관 중, 1 = 휴지통
        trashedAt : 휴지통으로 옮긴 시각
      }
   2) media    : 사진·동영상 원본과 미리보기 (글과 분리 보관)
      { id, kind:'image'|'video', mime, name, size, hash, blob, thumb,
        width, height, duration, createdAt }
   3) meta     : 저장소 정보 (스키마 버전 등)
   ========================================================= */
window.MMSD = window.MMSD || {};

MMSD.AppError = function (code, message) {
  const e = new Error(message);
  e.code = code;
  e.isAppError = true;
  return e;
};

MMSD.db = (function () {
  /* 계정마다 저장소 이름이 달라요. 첫 계정(예전 기록)은 'mmsd-diary' */
  let NAME = 'mmsd-diary';
  const VERSION = 1;

  const TYPES = [
    // 프로필·성장
    'profile', 'growth',
    // 덕질노트
    'person', 'work', 'performance', 'goods', 'music', 'fandomDiary',
    // 학교생활 수첩
    'teacher', 'club', 'classInfo', 'timetable', 'schoolEvent', 'schedule', 'award', 'letter',
    // 친구·일기·추억
    'friend', 'friendMemory', 'diary', 'memory',
    // 학업
    'subject', 'exam', 'assessment', 'studyLog', 'book',
    // 꾸미기
    'page', 'sticker'
  ];

  let dbPromise = null;

  function close() {
    if (!dbPromise) return;
    const p = dbPromise;
    dbPromise = null;
    p.then(function (d) { d.close(); }).catch(function () {});
  }

  function friendly(e) {
    if (e && e.isAppError) return e;
    const name = (e && (e.name || e.message)) || '';
    if (name === 'QuotaExceededError') {
      return MMSD.AppError('QUOTA', '저장 공간이 부족해요. 큰 사진이나 동영상을 정리하거나, 백업한 뒤 지워 주세요.');
    }
    if (name === 'NO_IDB') {
      return MMSD.AppError('NO_IDB', '이 브라우저는 기록 저장소를 지원하지 않아요. 크롬·엣지·사파리 최신 버전을 사용해 주세요.');
    }
    if (name === 'BLOCKED') {
      return MMSD.AppError('BLOCKED', '다른 탭에 다이어리가 열려 있어서 저장소를 열 수 없어요. 다른 탭을 닫고 새로고침해 주세요.');
    }
    if (name === 'InvalidStateError' || name === 'SecurityError' || name === 'UnknownError') {
      return MMSD.AppError('UNAVAILABLE', '기록 저장소를 열 수 없어요. 시크릿(개인정보 보호) 모드이거나 브라우저 설정에서 사이트 데이터 저장이 막혀 있을 수 있어요.');
    }
    return MMSD.AppError('UNKNOWN', '기록을 저장하는 중 문제가 생겼어요. (' + name + ')');
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window) || !window.indexedDB) return reject(friendly({ name: 'NO_IDB' }));
      let req;
      try { req = indexedDB.open(NAME, VERSION); } catch (e) { return reject(friendly(e)); }

      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains('records')) {
          const s = db.createObjectStore('records', { keyPath: 'id' });
          s.createIndex('type', 'type');
          s.createIndex('type_date', ['type', 'date']);
          s.createIndex('trashed', 'trashed');
          s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('media')) {
          const m = db.createObjectStore('media', { keyPath: 'id' });
          m.createIndex('hash', 'hash');
          m.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onsuccess = function () {
        const db = req.result;
        db.onversionchange = function () { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = function () { reject(friendly(req.error)); };
      req.onblocked = function () { reject(friendly({ name: 'BLOCKED' })); };
    });
    dbPromise.catch(function () { dbPromise = null; });
    return dbPromise;
  }

  function reqP(r) {
    return new Promise(function (resolve, reject) {
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  /* 트랜잭션 실행: 모든 작업이 끝까지 저장(complete)된 뒤에만 성공으로 처리 */
  async function run(stores, mode, fn) {
    const db = await open();
    return new Promise(function (resolve, reject) {
      let t, out;
      try { t = db.transaction(stores, mode); } catch (e) { return reject(friendly(e)); }
      t.oncomplete = function () { resolve(out); };
      t.onabort = function () { reject(friendly(t.error || { name: 'ABORT' })); };
      let p;
      try { p = Promise.resolve(fn(t)); } catch (e) { p = Promise.reject(e); }
      p.then(function (v) { out = v; }, function (e) {
        try { t.abort(); } catch (_) { /* 이미 끝남 */ }
        reject(friendly(e));
      });
    });
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  function nowISO() { return new Date().toISOString(); }
  function uniq(a) { return Array.from(new Set((a || []).filter(Boolean))); }

  function sortRecords(list) {
    return list.sort(function (a, b) {
      const da = a.date || '', dbb = b.date || '';
      if (da !== dbb) return da < dbb ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }

  /* ---------- 기록 ---------- */
  async function save(rec) {
    if (!rec || TYPES.indexOf(rec.type) < 0) {
      throw MMSD.AppError('BAD_TYPE', '알 수 없는 기록 종류예요: ' + (rec && rec.type));
    }
    return run(['records'], 'readwrite', async function (t) {
      const s = t.objectStore('records');
      const prev = rec.id ? await reqP(s.get(rec.id)) : null;
      const now = nowISO();
      const out = Object.assign({}, prev || {}, rec, {
        id: rec.id || uid(),
        createdAt: prev ? prev.createdAt : (rec.createdAt || now),
        updatedAt: now,
        trashed: prev ? prev.trashed : 0,
        tags: uniq(rec.tags || (prev && prev.tags)),
        links: rec.links || (prev && prev.links) || [],
        mediaIds: uniq(rec.mediaIds || (prev && prev.mediaIds)),
        data: rec.data || (prev && prev.data) || {}
      });
      await reqP(s.put(out));
      return out;
    });
  }

  function get(id) {
    return run(['records'], 'readonly', function (t) { return reqP(t.objectStore('records').get(id)); });
  }

  async function list(type, opts) {
    const wantTrashed = !!(opts && opts.trashed);
    const all = await run(['records'], 'readonly', function (t) {
      return reqP(t.objectStore('records').index('type').getAll(IDBKeyRange.only(type)));
    });
    return sortRecords(all.filter(function (r) { return !!r.trashed === wantTrashed; }));
  }

  async function listTrash() {
    const all = await run(['records'], 'readonly', function (t) {
      return reqP(t.objectStore('records').index('trashed').getAll(IDBKeyRange.only(1)));
    });
    return all.sort(function (a, b) { return a.trashedAt < b.trashedAt ? 1 : -1; });
  }

  function setTrashed(id, flag) {
    return run(['records'], 'readwrite', async function (t) {
      const s = t.objectStore('records');
      const r = await reqP(s.get(id));
      if (!r) throw MMSD.AppError('NOT_FOUND', '기록을 찾을 수 없어요.');
      r.trashed = flag ? 1 : 0;
      r.trashedAt = flag ? nowISO() : null;
      await reqP(s.put(r));
      return r;
    });
  }

  /* 휴지통에서 완전히 삭제: 다른 기록이 쓰지 않는 사진·동영상도 함께 삭제 */
  function purge(id) {
    return run(['records', 'media'], 'readwrite', async function (t) {
      const rs = t.objectStore('records'), ms = t.objectStore('media');
      const rec = await reqP(rs.get(id));
      if (!rec) return false;
      await reqP(rs.delete(id));
      const rest = await reqP(rs.getAll());
      const used = new Set();
      rest.forEach(function (r) { (r.mediaIds || []).forEach(function (m) { used.add(m); }); });
      for (const m of rec.mediaIds || []) {
        if (!used.has(m)) await reqP(ms.delete(m));
      }
      return true;
    });
  }

  /* ---------- 통계 ---------- */
  function stats() {
    return run(['records', 'media'], 'readonly', async function (t) {
      const records = await reqP(t.objectStore('records').getAll());
      const media = await reqP(t.objectStore('media').getAll());
      const out = { records: 0, trashed: 0, byType: {}, images: 0, videos: 0, mediaBytes: 0 };
      records.forEach(function (r) {
        if (r.trashed) out.trashed++;
        else { out.records++; out.byType[r.type] = (out.byType[r.type] || 0) + 1; }
      });
      media.forEach(function (m) {
        if (m.kind === 'video') out.videos++;
        else if (m.kind === 'file') out.files = (out.files || 0) + 1;
        else out.images++;
        out.mediaBytes += (m.size || 0) + (m.thumb ? m.thumb.size : 0);
      });
      return out;
    });
  }

  /* ---------- 메타 ---------- */
  function getMeta(key) {
    return run(['meta'], 'readonly', async function (t) {
      const r = await reqP(t.objectStore('meta').get(key));
      return r ? r.value : undefined;
    });
  }
  function setMeta(key, value) {
    return run(['meta'], 'readwrite', function (t) { return reqP(t.objectStore('meta').put({ key: key, value: value })); });
  }

  return {
    TYPES: TYPES,
    /* 사용할 저장소 바꾸기 (로그인한 계정) */
    use: function (name) {
      if (name === NAME) return;
      close();
      NAME = name;
    },
    name: function () { return NAME; },
    close: close,
    /* 계정 삭제용: 저장소 통째로 지우기 */
    destroy: function (name) {
      if (name === NAME) close();
      return new Promise(function (resolve, reject) {
        const r = indexedDB.deleteDatabase(name);
        r.onsuccess = function () { resolve(true); };
        r.onerror = function () { reject(friendly(r.error)); };
        r.onblocked = function () { resolve(false); };
      });
    },
    open: open,
    save: save,
    get: get,
    list: list,
    listTrash: listTrash,
    trash: function (id) { return setTrashed(id, true); },
    restore: function (id) { return setTrashed(id, false); },
    purge: purge,
    stats: stats,
    getMeta: getMeta,
    setMeta: setMeta,
    friendly: friendly,
    uid: uid,
    /* media.js 전용 */
    _run: run,
    _reqP: reqP
  };
})();
