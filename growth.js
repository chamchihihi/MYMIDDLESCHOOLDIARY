/* 성장 기록: 기록 목록 · 학년 비교 · 입학 vs 지금 · 그래프 */
(function () {
  const M = window.MMSD;

  const NUMS = [['height', '키', 'cm'], ['weight', '몸무게', 'kg'], ['shoe', '신발 사이즈', 'mm'], ['foot', '발 크기', 'mm']];
  const TEXTS = [
    ['clothes', '옷 사이즈'], ['bodyEtc', '기타 신체 변화'],
    ['face', '얼굴 변화'], ['hair', '헤어스타일'], ['skin', '피부 변화'], ['fashion', '패션 스타일'],
    ['voice', '목소리 변화'], ['range', '음역대'], ['singing', '노래 실력'], ['sports', '운동 능력'], ['newSkill', '새롭게 배운 기술'],
    ['personality', '성격 변화'], ['interests', '관심사 변화'], ['hobby', '새로운 취미'], ['confidence', '자신감 변화'], ['values', '가치관 변화'], ['dream', '장래희망 변화']
  ];
  const T = {};
  TEXTS.forEach(function (t) { T[t[0]] = t[1]; });

  const FIELDS = [
    { k: 'date', label: '날짜', t: 'date', top: 'date' },
    { k: 'grade', label: '학년', t: 'grade', top: 'grade' },
    { k: 'title', label: '한 줄 제목', t: 'text', top: 'title', full: true, ph: '예: 2학년 신체검사, 여름방학 끝' },
    { t: 'section', label: '📏 신체 성장' },
    { k: 'height', label: '키', t: 'number', unit: 'cm' },
    { k: 'weight', label: '몸무게', t: 'number', unit: 'kg' },
    { k: 'shoe', label: '신발 사이즈', t: 'number', unit: 'mm' },
    { k: 'foot', label: '발 크기', t: 'number', unit: 'mm' },
    { k: 'clothes', label: '옷 사이즈', t: 'text', ph: '예: 상의 M, 하의 26' },
    { k: 'bodyEtc', label: '기타 신체 변화', t: 'textarea' },
    { t: 'section', label: '💇 외모 변화' },
    { k: 'face', label: '얼굴 변화', t: 'textarea' },
    { k: 'hair', label: '헤어스타일 변화', t: 'textarea' },
    { k: 'skin', label: '피부 변화', t: 'textarea' },
    { k: 'fashion', label: '패션 스타일 변화', t: 'textarea' },
    { k: 'photos', label: '사진 (얼굴·전신 사진)', t: 'media', top: 'mediaIds', full: true },
    { t: 'section', label: '🎤 목소리와 능력' },
    { k: 'voice', label: '목소리 변화', t: 'textarea' },
    { k: 'range', label: '음역대 변화', t: 'text', ph: '예: 낮은 솔 ~ 높은 라' },
    { k: 'singing', label: '노래 실력', t: 'textarea' },
    { k: 'sports', label: '운동 능력', t: 'textarea' },
    { k: 'newSkill', label: '새롭게 배운 기술', t: 'textarea', full: true },
    { t: 'section', label: '💗 내면의 성장' },
    { k: 'personality', label: '성격 변화', t: 'textarea' },
    { k: 'interests', label: '관심사 변화', t: 'textarea' },
    { k: 'hobby', label: '새로운 취미', t: 'textarea' },
    { k: 'confidence', label: '자신감 변화', t: 'textarea' },
    { k: 'values', label: '가치관 변화', t: 'textarea' },
    { k: 'dream', label: '장래희망 변화', t: 'textarea' },
    { k: 'memo', label: '자유 기록', t: 'textarea', full: true, rows: 4 },
    { k: 'tags', label: '태그', t: 'tags', top: 'tags', full: true }
  ];

  const TABS = [['list', '📝 기록'], ['compare', '🎒 학년 비교'], ['then', '🌱 입학 vs 지금'], ['chart', '📈 그래프']];

  function has(v) { return v !== null && v !== undefined && v !== ''; }
  function asc(list) { return list.slice().sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; }); }

  function summary(r) {
    const d = r.data;
    const nums = NUMS.filter(function (n) { return has(d[n[0]]); }).map(function (n) { return n[1] + ' ' + d[n[0]] + n[2]; });
    const texts = TEXTS.filter(function (t) { return has(d[t[0]]); }).map(function (t) { return t[1]; });
    return nums.concat(texts.length ? ['✏️ ' + texts.slice(0, 3).join('·') + (texts.length > 3 ? ' 외 ' + (texts.length - 3) : '')] : []).join(' · ');
  }

  function listHTML(all) {
    const U = M.ui, esc = U.esc;
    return '<div class="item-list">' + all.slice().reverse().map(function (r) {
      return '<a class="item card" href="#/growth/edit/' + r.id + '">' + U.thumb(r, '🌱') +
        '<div class="item-body"><p class="item-title">' + esc(r.title || U.fmtDate(r.date)) + '</p>' +
        '<p class="item-sub">' + esc(U.fmtDate(r.date)) + (r.grade ? ' · ' + r.grade + '학년' : '') + '</p>' +
        '<p class="item-sub">' + esc(summary(r)) + '</p></div></a>';
    }).join('') + '</div>';
  }

  /* 학년별로 가장 마지막에 기록된 값 */
  function latestBy(list, key) {
    for (let i = list.length - 1; i >= 0; i--) if (has(list[i].data[key])) return list[i];
    return null;
  }

  function compareHTML(all) {
    const U = M.ui, esc = U.esc;
    const byG = { 1: [], 2: [], 3: [] };
    all.forEach(function (r) { if (byG[r.grade]) byG[r.grade].push(r); });
    const cell = function (g, key, unit) {
      const r = latestBy(byG[g], key);
      return '<td>' + (r ? esc(r.data[key]) + (unit ? unit : '') : '<span class="dim-text">-</span>') + '</td>';
    };
    const photoRow = '<tr><th>사진</th>' + [1, 2, 3].map(function (g) {
      let r = null;
      for (let i = byG[g].length - 1; i >= 0; i--) if ((byG[g][i].mediaIds || []).length) { r = byG[g][i]; break; }
      return '<td>' + (r ? '<div class="thumb cmp"><img data-media="' + esc(r.mediaIds[0]) + '" alt=""></div>' : '<span class="dim-text">-</span>') + '</td>';
    }).join('') + '</tr>';
    const rows = NUMS.map(function (n) { return '<tr><th>' + n[1] + '</th>' + [1, 2, 3].map(function (g) { return cell(g, n[0], n[2]); }).join('') + '</tr>'; }).join('') +
      TEXTS.filter(function (t) { return all.some(function (r) { return has(r.data[t[0]]); }); })
        .map(function (t) { return '<tr><th>' + t[1] + '</th>' + [1, 2, 3].map(function (g) { return cell(g, t[0], ''); }).join('') + '</tr>'; }).join('');
    return '<div class="card tape table-card"><div class="tbl-wrap"><table class="cmp-table"><thead><tr><th></th><th>1학년</th><th>2학년</th><th>3학년</th></tr></thead><tbody>' +
      photoRow + rows + '</tbody></table></div><p class="fhint">학년마다 가장 마지막에 기록한 내용을 보여줘요. 학년이 비어 있는 기록은 빠져요.</p></div>';
  }

  function thenNowHTML(all) {
    const U = M.ui, esc = U.esc;
    const firstOf = function (key) { for (let i = 0; i < all.length; i++) if (has(all[i].data[key])) return all[i]; return null; };
    const rows = NUMS.map(function (n) { return [n[0], n[1], n[2], true]; }).concat(TEXTS.map(function (t) { return [t[0], t[1], '', false]; }))
      .map(function (x) {
        const a = firstOf(x[0]), b = latestBy(all, x[0]);
        if (!a) return '';
        let diff = '';
        if (x[3] && b && a !== b) {
          const dv = Math.round((Number(b.data[x[0]]) - Number(a.data[x[0]])) * 10) / 10;
          diff = '<span class="badge ' + (dv > 0 ? 'hot' : 'soft') + '">' + (dv > 0 ? '+' : '') + dv + x[2] + '</span>';
        }
        return '<tr><th>' + x[1] + '</th><td>' + esc(a.data[x[0]]) + x[2] + '<small>' + esc(U.fmtDate(a.date, false)) + '</small></td>' +
          '<td>' + (b && b !== a ? esc(b.data[x[0]]) + x[2] + '<small>' + esc(U.fmtDate(b.date, false)) + '</small>' : '<span class="dim-text">같음</span>') + '</td><td>' + diff + '</td></tr>';
      }).join('');
    const firstPhoto = all.find(function (r) { return (r.mediaIds || []).length; });
    let lastPhoto = null;
    for (let i = all.length - 1; i >= 0; i--) if ((all[i].mediaIds || []).length) { lastPhoto = all[i]; break; }
    const ph = function (r) { return r ? '<div class="thumb cmp"><img data-media="' + esc(r.mediaIds[0]) + '" alt=""></div>' : '<span class="dim-text">-</span>'; };
    return '<div class="card tape table-card"><div class="tbl-wrap"><table class="cmp-table"><thead><tr><th></th><th>🌱 처음 기록</th><th>🌳 지금</th><th>변화</th></tr></thead><tbody>' +
      '<tr><th>사진</th><td>' + ph(firstPhoto) + '</td><td>' + (lastPhoto !== firstPhoto ? ph(lastPhoto) : '<span class="dim-text">같음</span>') + '</td><td></td></tr>' +
      rows + '</tbody></table></div><p class="fhint">항목마다 가장 처음 기록한 값과 가장 최근 값을 비교해요.</p></div>';
  }

  /* 간단한 꺾은선 그래프 (SVG) */
  function lineChart(points, label, unit) {
    const esc = M.ui.esc;
    if (points.length < 2) {
      return '<section class="card chart-card"><h2 class="sec-title">' + label + '</h2><p class="empty">' + label + ' 기록이 2개 이상 있어야 그래프가 그려져요. (지금 ' + points.length + '개)</p></section>';
    }
    const W = 640, H = 240, P = { l: 48, r: 18, t: 18, b: 34 };
    const xs = points.map(function (p) { return M.ui.parse(p.date).getTime(); });
    const ys = points.map(function (p) { return p.v; });
    let x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (x0 === x1) { x0 -= 86400000; x1 += 86400000; }
    let y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    const pad = Math.max((y1 - y0) * 0.15, 1);
    y0 = Math.floor(y0 - pad); y1 = Math.ceil(y1 + pad);
    const sx = function (x) { return P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r); };
    const sy = function (y) { return H - P.b - (y - y0) / (y1 - y0) * (H - P.t - P.b); };
    const ticks = [0, 1, 2, 3].map(function (i) { return y0 + (y1 - y0) * i / 3; });
    const path = points.map(function (p, i) { return (i ? 'L' : 'M') + sx(xs[i]).toFixed(1) + ' ' + sy(p.v).toFixed(1); }).join(' ');
    return '<section class="card chart-card"><h2 class="sec-title">' + label + ' <small>' + points[0].v + unit + ' → ' + points[points.length - 1].v + unit + '</small></h2>' +
      '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label + ' 변화 그래프">' +
        ticks.map(function (t) {
          return '<line class="grid" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + sy(t) + '" y2="' + sy(t) + '"/>' +
            '<text class="ax" x="' + (P.l - 8) + '" y="' + (sy(t) + 4) + '" text-anchor="end">' + (Math.round(t * 10) / 10) + '</text>';
        }).join('') +
        '<path class="line" d="' + path + '"/>' +
        points.map(function (p, i) {
          const first = i === 0, last = i === points.length - 1;
          return '<circle class="dot" cx="' + sx(xs[i]) + '" cy="' + sy(p.v) + '" r="5"><title>' + esc(M.ui.fmtDate(p.date, false)) + ' ' + p.v + unit + '</title></circle>' +
            (first || last ? '<text class="ax" x="' + sx(xs[i]) + '" y="' + (H - 10) + '" text-anchor="' + (first ? 'start' : 'end') + '">' + esc(M.ui.fmtDate(p.date, false)) + '</text>' : '');
        }).join('') +
      '</svg></section>';
  }

  M.ui.lineChart = lineChart;

  function chartHTML(all) {
    return NUMS.map(function (n) {
      const pts = all.filter(function (r) { return r.date && has(r.data[n[0]]); }).map(function (r) { return { date: r.date, v: Number(r.data[n[0]]) }; });
      return lineChart(pts, n[1], n[2]);
    }).join('');
  }

  M.mods.growth = async function (el, sub) {
    const mode = sub[0] || 'list';
    if (mode === 'new' || mode === 'edit') {
      let rec = null;
      if (mode === 'edit') {
        rec = await M.db.get(sub[1]);
        if (!rec || rec.trashed) { el.innerHTML = M.ui.empty('🔍', '기록을 찾을 수 없어요.', '#/growth', '목록으로'); return; }
      } else {
        rec = { type: 'growth', date: M.ui.today(), data: {} };
      }
      await M.forms.editor(el, {
        type: 'growth', fields: FIELDS, rec: rec, back: '#/growth', backLabel: '성장 기록',
        titleOf: function (r) { return r.title || M.ui.fmtDate(r.date) + ' 성장 기록'; },
        editHref: function (id) { return '#/growth/edit/' + id; }
      });
      return;
    }
    const tab = TABS.some(function (t) { return t[0] === mode; }) ? mode : 'list';
    const all = asc(await M.db.list('growth'));
    const head = '<div class="sub-bar">' + M.ui.tabs('growth', TABS, tab) + '<a class="btn primary" href="#/growth/new">+ 성장 기록하기</a></div>';
    if (!all.length) {
      el.innerHTML = head + M.ui.empty('🌱', '아직 성장 기록이 없어요. 키, 목소리, 관심사… 원하는 것만 골라서 자유롭게 기록해 보세요.', '#/growth/new', '+ 첫 기록 남기기');
      return;
    }
    el.innerHTML = head + (tab === 'compare' ? compareHTML(all) : tab === 'then' ? thenNowHTML(all) : tab === 'chart' ? chartHTML(all) : listHTML(all));
  };
})();
