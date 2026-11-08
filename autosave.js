/* =========================================================
   자동 저장
   - 입력이 멈추고 0.7초 뒤 자동 저장
   - 화면 오른쪽 위에 저장 상태 표시 (저장 중 / 저장됨 / 저장 실패)
   - 다른 메뉴로 이동하거나 창을 닫기 전에 남은 저장을 마무리
   사용법:
     const saver = MMSD.autosave.create(async (data) => MMSD.db.save(data));
     input 이벤트마다 saver.schedule(() => 지금 폼의 데이터);
   ========================================================= */
MMSD.autosave = (function () {
  const dirty = new Set();       // 저장을 기다리거나 실패한 저장기
  let statusEl = null;
  let hideTimer = null;

  function setStatus(state, err) {
    statusEl = statusEl || document.getElementById('saveStatus');
    if (!statusEl) return;
    clearTimeout(hideTimer);
    statusEl.dataset.state = state;
    const text = {
      waiting: '✏️ 입력 중…',
      saving: '💾 저장 중…',
      saved: '✔️ 저장됨',
      error: '⚠️ 저장 실패'
    }[state] || '';
    statusEl.textContent = text;
    statusEl.title = err ? err.message : '';
    statusEl.hidden = false;
    if (state === 'saved') hideTimer = setTimeout(function () { statusEl.hidden = true; }, 2500);
    if (state === 'error' && err && MMSD.toast) MMSD.toast(err.message + ' 입력한 내용은 화면에 남아 있어요. 잠시 후 다시 저장을 시도해요.', true);
  }

  function create(saveFn, delay) {
    delay = delay || 700;
    let timer = null;
    let latest = null;          // 아직 저장하지 않은 최신 데이터를 꺼내는 함수
    let chain = Promise.resolve();
    let retryTimer = null;
    const self = {};

    async function doRun() {
      clearTimeout(timer);
      if (!latest) return;
      const getData = latest;
      latest = null;
      setStatus('saving');
      try {
        await saveFn(getData());
        if (!latest) {
          dirty.delete(self);
          setStatus('saved');
        }
      } catch (e) {
        if (!latest) latest = getData;   // 실패한 내용은 다시 저장할 수 있게 보관
        setStatus('error', MMSD.db.friendly(e));
        clearTimeout(retryTimer);
        retryTimer = setTimeout(function () { self.flush().catch(function () {}); }, 5000);
        throw e;
      }
    }

    self.schedule = function (getData) {
      latest = getData;
      dirty.add(self);
      setStatus('waiting');
      clearTimeout(timer);
      timer = setTimeout(function () { self.flush().catch(function () {}); }, delay);
    };
    self.flush = function () {
      clearTimeout(timer);
      chain = chain.catch(function () {}).then(doRun);
      return chain;
    };
    self.isDirty = function () { return dirty.has(self); };
    return self;
  }

  /* 남은 저장을 모두 끝냄. 하나라도 실패하면 false */
  async function flushAll() {
    const list = Array.from(dirty);
    const results = await Promise.allSettled(list.map(function (s) { return s.flush(); }));
    return results.every(function (r) { return r.status === 'fulfilled'; }) && dirty.size === 0;
  }

  window.addEventListener('beforeunload', function (e) {
    if (dirty.size) {
      flushAll();
      e.preventDefault();
      e.returnValue = '';
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && dirty.size) flushAll();
  });

  return {
    create: create,
    flushAll: flushAll,
    hasUnsaved: function () { return dirty.size > 0; }
  };
})();
