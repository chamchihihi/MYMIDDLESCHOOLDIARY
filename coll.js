/* =========================================================
   기록 묶음(컬렉션) 공통 화면: 목록(검색·필터) + 편집
   덕질노트 · 학업 기록에서 사용
   cfg: { type, label, emoji, add, fields | async fields(), titleOf, sub(r), badges(r),
          filters:[{key,label,opts}|{label,opts,test(r,v)}], sort(a,b), custom(list,base),
          before(all) → html, extra(rec) → html, onSaved, newRec(rest), theme(r) → 테마 id,
          round(썸네일 원형), noThumb }
   ========================================================= */
(function () {
  const M = window.MMSD;

  const STARS = ['★', '★★', '★★★', '★★★★', '★★★★★'];

  /* 테마 이름 ↔ id (인물·작품별 테마 선택용) */
  const THEME_NAMES = M.themes.list.map(function (t) { return t.name; });
  function themeIdByName(name) {
    const t = M.themes.list.find(function (x) { return x.name === name; });
    return t ? t.id : null;
  }

  function card(cfg, base, r) {
    const U = M.ui, esc = U.esc;
    const sub = cfg.sub ? cfg.sub(r) : '';
    const theme = cfg.theme ? cfg.theme(r) : null;
    return '<a class="item card' + (theme ? ' themed' : '') + '"' + (theme ? ' data-theme="' + M.themes.resolve(theme) + '"' : '') +
      ' href="#/' + base + '/edit/' + r.id + '">' +
      (cfg.noThumb ? '<div class="thumb"><span aria-hidden="true">' + cfg.emoji + '</span></div>' : U.thumb(r, cfg.emoji, cfg.round ? 'round' : '')) +
      '<div class="item-body"><p class="item-title">' + (r.data.fav ? '<span class="star">⭐</span>' : '') + esc(r.title || '(제목 없음)') + '</p>' +
      (sub ? '<p class="item-sub">' + esc(sub) + '</p>' : '') +
      '<div class="badges">' + (cfg.badges ? cfg.badges(r) : '') + '</div>' +
      '</div></a>';
  }
  function cards(cfg, base, list) {
    return '<div class="item-list">' + list.map(function (r) { return card(cfg, base, r); }).join('') + '</div>';
  }

  async function listPage(el, base, tabsHtml, cfg) {
    const U = M.ui;
    let all = await M.db.list(cfg.type);
    if (cfg.sort) all = all.sort(cfg.sort);
    const filters = cfg.filters || [];
    el.innerHTML = tabsHtml +
      '<div class="toolbar card">' +
        '<input type="search" class="inp" id="cq" placeholder="🔍 ' + cfg.label + ' 검색" aria-label="' + cfg.label + ' 검색">' +
        filters.map(function (f, i) {
          return '<select class="inp" data-cf="' + i + '" aria-label="' + f.label + '"><option value="">' + f.label + '</option>' +
            f.opts.map(function (o) { return '<option>' + U.esc(o) + '</option>'; }).join('') + '</select>';
        }).join('') +
        '<a class="btn primary" href="#/' + base + '/new">+ ' + cfg.add + '</a>' +
      '</div>' +
      '<div id="cbefore">' + (cfg.before ? await cfg.before(all) : '') + '</div>' +
      '<div id="cres"></div>';
    const q = el.querySelector('#cq'), res = el.querySelector('#cres');
    const sels = Array.from(el.querySelectorAll('[data-cf]'));
    function draw() {
      const list = all.filter(function (r) {
        if (!U.match(r, q.value.trim())) return false;
        return sels.every(function (s) {
          const f = filters[Number(s.dataset.cf)];
          if (!s.value) return true;
          return f.test ? f.test(r, s.value) : r.data[f.key] === s.value;
        });
      });
      if (!all.length) res.innerHTML = U.empty(cfg.emoji, '아직 기록이 없어요.', '#/' + base + '/new', '+ ' + cfg.add);
      else if (!list.length) res.innerHTML = '<p class="empty center">찾는 기록이 없어요.</p>';
      else res.innerHTML = cfg.custom ? cfg.custom(list, base) : cards(cfg, base, list);
      U.hydrate(res);
    }
    q.addEventListener('input', draw);
    sels.forEach(function (s) { s.addEventListener('change', draw); });
    draw();
  }

  async function editPage(el, base, cfg, sub, menuId) {
    const fields = typeof cfg.fields === 'function' ? await cfg.fields() : cfg.fields;
    let rec;
    if (sub[0] === 'edit') {
      rec = await M.db.get(sub[1]);
      if (!rec || rec.trashed || rec.type !== cfg.type) {
        el.innerHTML = M.ui.empty('🔍', '기록을 찾을 수 없어요. 휴지통으로 옮겨졌을 수 있어요.', '#/' + base, '목록으로');
        return;
      }
    } else {
      rec = Object.assign({ type: cfg.type, data: {} }, cfg.newRec ? await cfg.newRec(sub.slice(1)) : {});
    }
    function applyTheme(r) {
      if (!cfg.theme) return;
      M.themes.apply(cfg.theme(r) || M.themes.effectiveFor(menuId));
    }
    applyTheme(rec);
    await M.forms.editor(el, {
      type: cfg.type, fields: fields, rec: rec,
      back: '#/' + base, backLabel: cfg.label + ' 목록',
      titleOf: cfg.titleOf,
      editHref: function (id) { return '#/' + base + '/edit/' + id; },
      extra: cfg.extra,
      onSaved: async function (s) {
        applyTheme(s);
        if (cfg.onSaved) await cfg.onSaved(s);
      }
    });
  }

  /* 가로 막대 그래프 (값 목록) */
  function barList(items, unit, emptyText) {
    const esc = M.ui.esc;
    items = items.filter(function (i) { return i.value > 0; });
    if (!items.length) return '<p class="empty">' + (emptyText || '아직 기록이 없어요.') + '</p>';
    const max = Math.max.apply(null, items.map(function (i) { return i.value; }));
    return '<ul class="bars">' + items.map(function (i) {
      return '<li><span class="bar-label">' + esc(i.label) + '</span><span class="bar-track"><span class="bar-fill" style="width:' +
        Math.max(3, i.value / max * 100).toFixed(1) + '%"></span></span><span class="bar-val">' + esc(i.display || (i.value + (unit || ''))) + '</span></li>';
    }).join('') + '</ul>';
  }

  /* 최근 12개월 키 목록 ['2025-12', ... '2026-11'] */
  function last12Months() {
    const out = [];
    const d = new Date();
    for (let i = 11; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(x.getFullYear() + '-' + M.ui.pad(x.getMonth() + 1));
    }
    return out;
  }

  function won(n) { return (Number(n) || 0).toLocaleString('ko-KR') + '원'; }

  M.coll = {
    STARS: STARS, THEME_NAMES: THEME_NAMES, themeIdByName: themeIdByName,
    card: card, cards: cards, listPage: listPage, editPage: editPage,
    barList: barList, last12Months: last12Months, won: won
  };
})();
