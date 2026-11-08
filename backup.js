/* =========================================================
   백업 · 복원
   - 전체 백업(ZIP): data.json + media/(원본) + thumbs/(미리보기)
   - 기록만 백업(JSON): 글 기록만, 사진·동영상 제외
   - 복원: 미리보기 → "전부 교체" 또는 "합치기"
     합치기 규칙: 같은 기록(같은 ID)이 있으면 더 최근에 수정된 쪽을 남김
                  같은 사진(같은 파일 내용)이 있으면 하나만 남김
   - 잠금 비밀번호는 백업에 넣지 않음
   ========================================================= */
MMSD.backup = (function () {
  const M = window.MMSD;
  const APP = 'my-middle-school-diary';
  const FORMAT = 1;
  const EXT = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'application/pdf': 'pdf'
  };

  function getAll(store) {
    return M.db._run([store], 'readonly', function (t) { return M.db._reqP(t.objectStore(store).getAll()); });
  }
  function stamp() {
    const d = new Date(), p = M.ui.pad;
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }
  function extOf(m) {
    return EXT[m.mime] || ((m.name || '').split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  }

  /* ---------- 백업 만들기 ---------- */
  async function estimate() {
    const media = await getAll('media');
    return media.reduce(function (s, m) { return s + (m.size || 0) + (m.thumb ? m.thumb.size : 0); }, 0);
  }

  async function create(withMedia, onProgress) {
    const [records, media, meta] = await Promise.all([getAll('records'), getAll('media'), getAll('meta')]);
    const s = M.settings.get();
    const data = {
      app: APP, format: FORMAT, exportedAt: new Date().toISOString(), withMedia: !!withMedia,
      settings: { defaultTheme: s.defaultTheme, pageThemes: s.pageThemes, mode: s.mode, fontScale: s.fontScale },
      meta: meta.filter(function (m) { return m.key !== 'lastBackup'; }),
      records: records,
      media: media.map(function (m) {
        return {
          id: m.id, kind: m.kind, mime: m.mime, name: m.name, size: m.size, hash: m.hash,
          width: m.width, height: m.height, duration: m.duration, createdAt: m.createdAt,
          file: withMedia ? 'media/' + m.id + '.' + extOf(m) : null,
          thumb: withMedia && m.thumb ? 'thumbs/' + m.id + '.jpg' : null
        };
      })
    };
    let blob, name;
    if (!withMedia) {
      blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      name = '중학생활다이어리_기록백업_' + stamp() + '.json';
    } else {
      const total = media.reduce(function (s2, m) { return s2 + (m.size || 0) + (m.thumb ? m.thumb.size : 0); }, 0);
      if (total > 0xFFFFFFFF - 50 * 1024 * 1024) throw MMSD.AppError('ZIP_LIMIT', '사진·동영상이 4GB를 넘어서 한 파일로 백업할 수 없어요. 큰 동영상을 정리하거나 "기록만 백업"을 이용해 주세요.');
      const z = new M.zip.Writer();
      await z.add('data.json', JSON.stringify(data));
      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        if (m.blob) await z.add(data.media[i].file, m.blob);
        if (m.thumb) await z.add(data.media[i].thumb, m.thumb);
        if (onProgress) onProgress(i + 1, media.length);
      }
      blob = z.finish();
      name = '중학생활다이어리_전체백업_' + stamp() + '.zip';
    }
    return { blob: blob, name: name, records: records.length, media: media.length };
  }

  function download(blob, name) { return M.saveFile(blob, name); }

  /* ---------- 백업 파일 읽기 + 미리보기 ---------- */
  async function open(file) {
    let data, zip = null;
    const isZip = /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
    try {
      if (isZip) {
        zip = await M.zip.read(file);
        const j = await zip.blob('data.json');
        if (!j) throw MMSD.AppError('BACKUP', '이 ZIP 파일에는 다이어리 기록(data.json)이 없어요.');
        data = JSON.parse(await j.text());
      } else {
        data = JSON.parse(await file.text());
      }
    } catch (e) {
      if (e.isAppError) throw e;
      throw MMSD.AppError('BACKUP', '백업 파일을 읽지 못했어요. 이 다이어리에서 만든 백업 파일인지 확인해 주세요.');
    }
    if (!data || data.app !== APP || !Array.isArray(data.records)) {
      throw MMSD.AppError('BACKUP', '이 다이어리의 백업 파일이 아니에요.');
    }
    if (data.format > FORMAT) throw MMSD.AppError('BACKUP', '더 새로운 버전에서 만든 백업이에요. 다이어리를 최신으로 바꾼 뒤 복원해 주세요.');

    const types = M.db.TYPES;
    const valid = data.records.filter(function (r) { return r && r.id && types.indexOf(r.type) >= 0; });
    const byType = {};
    valid.forEach(function (r) { if (!r.trashed) byType[r.type] = (byType[r.type] || 0) + 1; });
    const media = Array.isArray(data.media) ? data.media : [];
    let missing = 0;
    if (zip) media.forEach(function (m) { if (!m.file || !zip.entries.has(m.file)) missing++; });
    return {
      data: data, zip: zip, fileName: file.name,
      summary: {
        exportedAt: data.exportedAt, withMedia: !!(zip && data.withMedia),
        records: valid.filter(function (r) { return !r.trashed; }).length,
        trashed: valid.filter(function (r) { return r.trashed; }).length,
        invalid: data.records.length - valid.length,
        byType: byType, media: media.length, missing: zip ? missing : media.length
      }
    };
  }

  /* ---------- 복원 ---------- */
  async function restore(opened, mode, onProgress) {
    const data = opened.data, zip = opened.zip;
    const types = M.db.TYPES;
    const records = data.records.filter(function (r) { return r && r.id && types.indexOf(r.type) >= 0; });
    const inMedia = Array.isArray(data.media) ? data.media : [];

    /* 1) 사진·동영상 파일을 먼저 꺼내 둠 (저장 작업 도중에 파일을 읽으면 저장이 끊기기 때문) */
    const ready = [];
    if (zip) {
      for (let i = 0; i < inMedia.length; i++) {
        const m = inMedia[i];
        const blob = m.file ? await zip.blob(m.file, m.mime) : null;
        if (blob) {
          const thumb = m.thumb ? await zip.blob(m.thumb, 'image/jpeg') : null;
          ready.push({
            id: m.id, kind: m.kind, mime: m.mime, name: m.name, size: blob.size, hash: m.hash,
            width: m.width || null, height: m.height || null, duration: m.duration || null, createdAt: m.createdAt,
            blob: blob, thumb: thumb
          });
        }
        if (onProgress) onProgress(i + 1, inMedia.length);
      }
    }

    const result = { added: 0, updated: 0, skipped: 0, mediaAdded: 0, mediaSkipped: 0, mediaMissing: inMedia.length - ready.length };

    if (mode === 'replace') {
      await M.db._run(['records', 'media', 'meta'], 'readwrite', async function (t) {
        const rs = t.objectStore('records'), ms = t.objectStore('media'), mt = t.objectStore('meta');
        const keepBackup = await M.db._reqP(mt.get('lastBackup'));
        await M.db._reqP(rs.clear());
        /* 기록만 백업(JSON)으로 교체할 때는 지금 있는 사진을 지우지 않음 */
        if (zip) await M.db._reqP(ms.clear());
        await M.db._reqP(mt.clear());
        if (keepBackup) await M.db._reqP(mt.put(keepBackup));
        for (const m of (data.meta || [])) if (m && m.key && m.key !== 'lastBackup') await M.db._reqP(mt.put(m));
        for (const r of records) { await M.db._reqP(rs.put(r)); result.added++; }
        for (const m of ready) { await M.db._reqP(ms.put(m)); result.mediaAdded++; }
      });
      if (data.settings) {
        const s = data.settings;
        if (s.defaultTheme) M.settings.setDefaultTheme(s.defaultTheme);
        Object.keys(M.settings.get().pageThemes).forEach(function (k) { M.settings.setPageTheme(k, null); });
        Object.keys(s.pageThemes || {}).forEach(function (k) { M.settings.setPageTheme(k, s.pageThemes[k]); });
        if (s.mode) M.settings.setMode(s.mode);
        if (s.fontScale) M.settings.setFontScale(s.fontScale);
        M.display.apply();
      }
    } else {
      /* 합치기: 같은 내용의 사진은 이미 있는 것을 쓰고, 기록 속 사진 ID를 바꿔 줌 */
      const existing = await getAll('media');
      const byId = {}, byHash = {};
      existing.forEach(function (m) { byId[m.id] = m; if (m.hash) byHash[m.hash] = m.id; });
      const idMap = {};
      const toAdd = [];
      ready.forEach(function (m) {
        if (byId[m.id]) { result.mediaSkipped++; return; }
        if (m.hash && byHash[m.hash]) { idMap[m.id] = byHash[m.hash]; result.mediaSkipped++; return; }
        toAdd.push(m);
      });
      const remap = function (r) {
        const keys = Object.keys(idMap);
        if (!keys.length) return r;
        let s = JSON.stringify(r);
        keys.forEach(function (k) { s = s.split(k).join(idMap[k]); });
        return JSON.parse(s);
      };
      await M.db._run(['records', 'media', 'meta'], 'readwrite', async function (t) {
        const rs = t.objectStore('records'), ms = t.objectStore('media'), mt = t.objectStore('meta');
        for (const m of toAdd) { await M.db._reqP(ms.put(m)); result.mediaAdded++; }
        for (const raw of records) {
          const r = remap(raw);
          const cur = await M.db._reqP(rs.get(r.id));
          if (!cur) { await M.db._reqP(rs.put(r)); result.added++; }
          else if ((r.updatedAt || '') > (cur.updatedAt || '')) { await M.db._reqP(rs.put(r)); result.updated++; }
          else result.skipped++;
        }
        for (const m of (data.meta || [])) {
          if (!m || !m.key || m.key === 'lastBackup') continue;
          const cur = await M.db._reqP(mt.get(m.key));
          if (!cur) await M.db._reqP(mt.put(m));
        }
      });
    }

    /* 복원 확인: 사진 파일 크기가 맞게 저장되었는지 */
    const after = await getAll('media');
    result.mediaBroken = after.filter(function (m) { return !m.blob || m.blob.size !== m.size; }).length;
    M.profile = null;
    return result;
  }

  async function lastBackup() { return M.db.getMeta('lastBackup'); }
  async function markBackup(kind) { return M.db.setMeta('lastBackup', { at: new Date().toISOString(), kind: kind }); }

  return { create: create, download: download, open: open, restore: restore, estimate: estimate, lastBackup: lastBackup, markBackup: markBackup };
})();
