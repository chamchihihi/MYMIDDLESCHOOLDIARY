/* =========================================================
   공통 입력 양식 + 자동 저장 편집 화면
   필드 정의: { k, label, t, top?, opts?, of?, ph?, hint?, full?, unit?, rows?, cols? }
     t     : text | textarea | number | date | select | grade | choice | multi
             | link(다른 기록 연결) | tags | check | media | rows(여러 줄 목록)
             | timetable | secret(비공개 메모) | section(소제목)
     top   : 기록의 최상위 칸에 저장 (title | date | grade | tags | mediaIds)
             없으면 record.data[k] 에 저장
   ========================================================= */
(function () {
  const M = window.MMSD;

  const OPTS = {
    weather: ['☀️ 맑음', '⛅ 구름 조금', '☁️ 흐림', '🌧️ 비', '⛈️ 천둥번개', '❄️ 눈', '🌫️ 안개', '🌬️ 바람'],
    mood: ['😊 좋음', '🥰 설렘', '😆 신남', '😌 평온', '😐 그냥 그래', '😢 슬픔', '😠 화남', '😰 걱정', '😴 피곤'],
    avatar: ['🐣', '🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🐨', '🐧', '🦄', '🐹', '🐸']
  };
  const DAYS = ['월', '화', '수', '목', '금'];
  /* "🎀 꾸미기" 버튼을 보여줄 기록 종류 (인물·작품별 개별 꾸미기 포함) */
  const DECO_TYPES = ['profile', 'growth', 'friend', 'friendMemory', 'diary', 'memory', 'teacher', 'club', 'schoolEvent', 'letter',
    'person', 'work', 'performance', 'fandomDiary'];
  const PERIODS = 7;

  function labelOf(r) {
    if (r.type === 'diary') return M.ui.fmtDate(r.date, false) + ' ' + M.ui.snippet(r.title, 14);
    return r.title || '(이름 없음)';
  }

  async function prepare(fields) {
    const out = {};
    for (const f of fields) {
      if (f.t === 'link' && !out[f.of]) {
        out[f.of] = (await M.db.list(f.of)).map(function (r) { return { id: r.id, label: labelOf(r) }; });
      }
    }
    return out;
  }

  function val(f, rec) { return f.top ? rec[f.top] : (rec.data || {})[f.k]; }

  function rowHTML(f, r) {
    const esc = M.ui.esc;
    return '<div class="row">' + f.cols.map(function (c) {
      const cv = r ? (r[c.k] || '') : '';
      const st = c.w ? ' style="flex:' + c.w + '"' : '';
      if (c.t === 'select') {
        return '<select class="inp" data-col="' + c.k + '" aria-label="' + c.label + '"' + st + '><option value="">' + c.label + '</option>' +
          c.opts.map(function (o) { return '<option' + (o === cv ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
      }
      return '<input class="inp" type="' + (c.t || 'text') + '" data-col="' + c.k + '" value="' + esc(cv) + '" placeholder="' + c.label + '" aria-label="' + c.label + '"' + st + '>';
    }).join('') + '<button type="button" class="row-del" aria-label="이 줄 지우기">✕</button></div>';
  }

  function chipsHTML(key, items, selected) {
    selected = selected || [];
    return '<div class="choice">' + items.map(function (o) {
      const v = typeof o === 'string' ? o : o.id;
      const l = typeof o === 'string' ? o : o.label;
      return '<label class="chk"><input type="checkbox" data-multi="' + key + '" value="' + M.ui.esc(v) + '"' +
        (selected.indexOf(v) >= 0 ? ' checked' : '') + '><span>' + M.ui.esc(l) + '</span></label>';
    }).join('') + '</div>';
  }

  function fieldHTML(f, rec, opts) {
    const esc = M.ui.esc;
    if (f.t === 'section') return '<h3 class="fsection">' + esc(f.label) + '</h3>';
    const v = val(f, rec);
    const id = 'f_' + f.k;
    const ph = f.ph ? ' placeholder="' + esc(f.ph) + '"' : '';
    const dk = ' data-k="' + f.k + '"';
    let inner = '';
    switch (f.t) {
      case 'text':
        inner = '<input id="' + id + '" class="inp" type="text"' + dk + ' value="' + esc(v || '') + '"' + ph + '>';
        break;
      case 'number':
        inner = '<div class="unit-wrap"><input id="' + id + '" class="inp" type="number" step="any" inputmode="decimal"' + dk +
          ' value="' + (v == null ? '' : esc(v)) + '"' + ph + '>' + (f.unit ? '<span class="unit">' + f.unit + '</span>' : '') + '</div>';
        break;
      case 'date':
        inner = '<input id="' + id + '" class="inp" type="date"' + dk + ' value="' + esc(v || '') + '">';
        break;
      case 'textarea':
        inner = '<textarea id="' + id + '" class="inp" rows="' + (f.rows || 3) + '"' + dk + ph + '>' + esc(v || '') + '</textarea>';
        break;
      case 'select':
        inner = '<select id="' + id + '" class="inp"' + dk + '><option value="">선택 안 함</option>' +
          f.opts.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
        break;
      case 'grade':
        inner = '<select id="' + id + '" class="inp"' + dk + '><option value="">선택 안 함</option>' +
          [1, 2, 3].map(function (g) { return '<option value="' + g + '"' + (Number(v) === g ? ' selected' : '') + '>' + g + '학년</option>'; }).join('') + '</select>';
        break;
      case 'choice':
        inner = '<input type="hidden"' + dk + ' value="' + esc(v || '') + '"><div class="choice" role="group" aria-label="' + esc(f.label) + '">' +
          f.opts.map(function (o) {
            return '<button type="button" class="chip-btn' + (f.big ? ' big' : '') + '" data-choice="' + f.k + '" data-val="' + esc(o) + '" aria-pressed="' + (o === v) + '">' + esc(o) + '</button>';
          }).join('') + '</div>';
        break;
      case 'multi':
        inner = chipsHTML(f.k, f.opts, v);
        break;
      case 'link': {
        const list = opts[f.of] || [];
        inner = list.length ? chipsHTML(f.k, list, v) : '<p class="fhint">' + esc(f.emptyText || '아직 등록된 기록이 없어요.') + '</p>';
        break;
      }
      case 'tags':
        inner = '<input id="' + id + '" class="inp" type="text"' + dk + ' value="' + esc((v || []).map(function (t) { return '#' + t; }).join(' ')) +
          '" placeholder="#태그 #띄어쓰기로_구분">';
        break;
      case 'check':
        inner = '<label class="switch"><input type="checkbox"' + dk + (v ? ' checked' : '') + '><span>' + esc(f.label) + '</span></label>';
        break;
      case 'media':
        inner = '<div class="media-slot" data-media-k="' + f.k + '"></div>';
        break;
      case 'rows':
        inner = '<div class="rows" data-rows="' + f.k + '"><div class="rows-list">' + (v || []).map(function (r) { return rowHTML(f, r); }).join('') +
          '</div><button type="button" class="btn small" data-add-row="' + f.k + '">+ ' + (f.addLabel || '추가') + '</button></div>';
        break;
      case 'timetable': {
        const t = v || {};
        inner = '<div class="tt-wrap"><table class="tt"><thead><tr><th></th>' + DAYS.map(function (d) { return '<th>' + d + '</th>'; }).join('') +
          '</tr></thead><tbody>';
        for (let p = 1; p <= PERIODS; p++) {
          inner += '<tr><th>' + p + '교시</th>' + DAYS.map(function (d, i) {
            const key = i + '-' + p;
            return '<td><input class="inp" data-tt="' + key + '" value="' + esc(t[key] || '') + '" aria-label="' + d + '요일 ' + p + '교시"></td>';
          }).join('') + '</tr>';
        }
        inner += '</tbody></table></div>';
        break;
      }
      case 'secret':
        inner = '<details class="secret"><summary>🔒 비공개 메모 (눌러서 열기)</summary><textarea class="inp" rows="3"' + dk + ' aria-label="비공개 메모">' + esc(v || '') + '</textarea></details>';
        break;
    }
    const forable = ['text', 'number', 'date', 'textarea', 'select', 'grade', 'tags'].indexOf(f.t) >= 0;
    const label = (f.t === 'check' || f.t === 'secret') ? '' :
      '<' + (forable ? 'label for="' + id + '"' : 'span') + ' class="flabel">' + esc(f.label) + '</' + (forable ? 'label' : 'span') + '>';
    return '<div class="field' + (f.full ? ' full' : '') + '">' + label + inner + (f.hint ? '<p class="fhint">' + esc(f.hint) + '</p>' : '') + '</div>';
  }

  function collect(root, fields, base) {
    const rec = Object.assign({}, base, { data: Object.assign({}, base.data || {}) });
    const links = [];
    fields.forEach(function (f) {
      if (f.t === 'section') return;
      const el = root.querySelector('[data-k="' + f.k + '"]');
      let v;
      switch (f.t) {
        case 'number': v = el.value === '' ? null : Number(el.value); break;
        case 'grade': v = el.value ? Number(el.value) : null; break;
        case 'tags':
          v = el.value.split(/[\s,]+/).map(function (t) { return t.replace(/^#+/, '').trim(); }).filter(Boolean);
          break;
        case 'check': v = el.checked; break;
        case 'multi':
        case 'link':
          v = Array.from(root.querySelectorAll('[data-multi="' + f.k + '"]:checked')).map(function (i) { return i.value; });
          if (f.t === 'link') {
            /* 화면에 안 보이는 연결(휴지통에 있는 친구 등)은 지우지 않고 그대로 둠 */
            const shown = Array.from(root.querySelectorAll('[data-multi="' + f.k + '"]')).map(function (i) { return i.value; });
            (val(f, base) || []).forEach(function (id) { if (shown.indexOf(id) < 0 && v.indexOf(id) < 0) v.push(id); });
            v.forEach(function (id) { links.push({ type: f.of, id: id }); });
          }
          break;
        case 'media': v = root._pickers && root._pickers[f.k] ? root._pickers[f.k].getIds() : (val(f, base) || []); break;
        case 'rows':
          v = Array.from(root.querySelectorAll('[data-rows="' + f.k + '"] .row')).map(function (row) {
            const o = {};
            row.querySelectorAll('[data-col]').forEach(function (i) { o[i.dataset.col] = i.value.trim(); });
            return o;
          }).filter(function (o) { return Object.keys(o).some(function (k) { return o[k]; }); });
          break;
        case 'timetable':
          v = {};
          root.querySelectorAll('[data-tt]').forEach(function (i) { if (i.value.trim()) v[i.dataset.tt] = i.value.trim(); });
          break;
        default: v = el ? el.value : '';
      }
      if (f.top) rec[f.top] = v; else rec.data[f.k] = v;
    });
    rec.links = links;
    return rec;
  }

  /* ---------------------------------------------------------
     편집 화면
     cfg: { type, fields, rec, back, backLabel, titleOf(rec), editHref(id),
            onSaved(saved), extra(rec) → html, before, noDelete, noBack }
     --------------------------------------------------------- */
  async function editor(container, cfg) {
    const esc = M.ui.esc;
    const opts = await prepare(cfg.fields);
    const state = { rec: Object.assign({ type: cfg.type, data: {} }, cfg.rec || {}) };
    const gradeField = cfg.fields.find(function (f) { return f.t === 'grade' && f.top === 'grade'; });
    let autoGrade = false;
    if (!state.rec.id && gradeField && state.rec.date && state.rec.grade == null) {
      state.rec.grade = M.ui.gradeFor(state.rec.date);
      autoGrade = state.rec.grade != null;
    }

    container.innerHTML = '<div class="editor">' +
      (cfg.before || '') +
      '<div class="editor-bar">' +
        (cfg.noBack ? '' : '<a class="btn" href="' + cfg.back + '">← ' + (cfg.backLabel || '목록으로') + '</a>') +
        '<span class="ed-meta" id="edMeta"></span>' +
        (DECO_TYPES.indexOf(cfg.type) >= 0 ? '<a class="btn" id="edDeco" hidden>🎀 꾸미기</a>' : '') +
        (cfg.noDelete ? '' : '<button type="button" class="btn danger" id="edDel">🗑️ 휴지통으로</button>') +
      '</div>' +
      '<form class="card tape form-grid" id="edForm" novalidate>' +
        cfg.fields.map(function (f) { return fieldHTML(f, state.rec, opts); }).join('') +
      '</form>' +
      '<div id="edExtra"></div></div>';

    const form = container.querySelector('#edForm');
    const metaEl = container.querySelector('#edMeta');
    const decoBtn = container.querySelector('#edDeco');
    function meta() {
      if (decoBtn && state.rec.id) {
        decoBtn.hidden = false;
        decoBtn.href = '#/decorate/for/' + state.rec.id;
        decoBtn.title = '이 기록만의 페이지를 스티커와 사진으로 꾸며요';
      }
      metaEl.textContent = state.rec.id
        ? '처음 작성 ' + M.ui.fmtStamp(state.rec.createdAt) + ' · 마지막 수정 ' + M.ui.fmtStamp(state.rec.updatedAt)
        : '✏️ 새 기록이에요. 입력하면 자동으로 저장돼요.';
    }
    meta();

    async function showExtra() {
      if (!cfg.extra || !state.rec.id) return;
      const box = container.querySelector('#edExtra');
      try {
        box.innerHTML = await cfg.extra(state.rec);
        M.ui.hydrate(box);
      } catch (e) { box.innerHTML = ''; }
    }

    const saver = M.autosave.create(async function (rec) {
      const isNew = !state.rec.id;
      const saved = await M.db.save(rec);
      state.rec = saved;
      meta();
      if (isNew && cfg.editHref) M.replaceHash(cfg.editHref(saved.id));
      if (cfg.onSaved) await cfg.onSaved(saved);
      if (isNew) showExtra();
    });
    function schedule() {
      saver.schedule(function () {
        const r = collect(form, cfg.fields, Object.assign({}, state.rec, { type: cfg.type }));
        if (cfg.titleOf) r.title = cfg.titleOf(r);
        return r;
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); });
    form.addEventListener('input', schedule);
    /* 학년 자동 채움: 직접 고른 학년은 바꾸지 않고, 자동으로 채운 학년은 날짜를 따라감 */
    const gradeSel = gradeField ? form.querySelector('[data-k="' + gradeField.k + '"]') : null;
    if (gradeSel && autoGrade) gradeSel.dataset.auto = '1';
    function syncGrade(dateVal) {
      if (!gradeSel || !(gradeSel.dataset.auto || !gradeSel.value)) return;
      const g = M.ui.gradeFor(dateVal);
      gradeSel.value = g ? String(g) : '';
      if (g) gradeSel.dataset.auto = '1'; else delete gradeSel.dataset.auto;
    }
    form.addEventListener('change', function (e) {
      if (e.target === gradeSel) delete gradeSel.dataset.auto;
      if (gradeSel && e.target.matches('input[type="date"][data-k="date"]')) syncGrade(e.target.value);
      schedule();
    });
    form.addEventListener('input', function (e) {
      if (gradeSel && e.target.matches('input[type="date"][data-k="date"]')) syncGrade(e.target.value);
    });
    form.addEventListener('click', function (e) {
      const b = e.target.closest('[data-choice]');
      if (b) {
        const k = b.dataset.choice;
        const hidden = form.querySelector('input[type="hidden"][data-k="' + k + '"]');
        const same = hidden.value === b.dataset.val;
        hidden.value = same ? '' : b.dataset.val;
        form.querySelectorAll('[data-choice="' + k + '"]').forEach(function (x) {
          x.setAttribute('aria-pressed', String(x === b && !same));
        });
        schedule();
        return;
      }
      const add = e.target.closest('[data-add-row]');
      if (add) {
        const f = cfg.fields.find(function (x) { return x.k === add.dataset.addRow; });
        const list = add.previousElementSibling;
        list.insertAdjacentHTML('beforeend', rowHTML(f, null));
        list.lastElementChild.querySelector('input,select').focus();
        return;
      }
      const del = e.target.closest('.row-del');
      if (del) { del.closest('.row').remove(); schedule(); }
    });

    form._pickers = {};
    cfg.fields.filter(function (f) { return f.t === 'media'; }).forEach(function (f) {
      form._pickers[f.k] = M.mediaPicker(form.querySelector('[data-media-k="' + f.k + '"]'), {
        ids: val(f, state.rec) || [],
        files: !!f.files,
        onChange: schedule
      });
    });

    const delBtn = container.querySelector('#edDel');
    if (delBtn) delBtn.addEventListener('click', async function () {
      try {
        /* 저장 대기 중인 내용을 먼저 마무리해야 그 기록까지 함께 휴지통으로 감 */
        await saver.flush();
        if (!state.rec.id) { location.hash = cfg.back; return; }
        const id = state.rec.id;
        await M.db.trash(id);
        M.toast('휴지통으로 옮겼어요.', false, {
          label: '되돌리기',
          fn: async function () {
            await M.db.restore(id);
            M.toast('되돌렸어요.');
            M.rerender();
          }
        });
        location.hash = cfg.back;
      } catch (e) {
        M.toast(M.db.friendly(e).message, true);
      }
    });

    showExtra();
    return { state: state, saver: saver, form: form, refreshExtra: showExtra };
  }

  M.forms = { OPTS: OPTS, editor: editor, fieldHTML: fieldHTML, collect: collect, prepare: prepare };
})();
