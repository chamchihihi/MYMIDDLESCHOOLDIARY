/* =========================================================
   ZIP 파일 만들기 · 읽기 (외부 라이브러리 없이)
   - 만들 때: 압축하지 않고 담기만 함(사진·동영상은 이미 압축된 파일이라 크기 차이가 거의 없음)
   - 읽을 때: 담기만 한 파일 + 일반 압축(deflate) 파일 모두 읽을 수 있음
   - 한 파일 최대 4GB (ZIP 기본 형식의 한계)
   ========================================================= */
MMSD.zip = (function () {
  const enc = new TextEncoder();
  const LIMIT = 0xFFFFFFFF;
  const CHUNK = 8 * 1024 * 1024;

  const TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes, prev) {
    let c = (prev || 0) ^ 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  async function blobCrc(blob) {
    let c = 0;
    for (let o = 0; o < blob.size; o += CHUNK) c = crc32(new Uint8Array(await blob.slice(o, o + CHUNK).arrayBuffer()), c);
    return c;
  }
  function dos(d) {
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
      date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  function Writer() {
    const parts = [], central = [];
    let offset = 0, count = 0;
    const t = dos(new Date());

    this.add = async function (name, data) {
      const blob = data instanceof Blob ? data : new Blob([typeof data === 'string' ? enc.encode(data) : data]);
      const crc = await blobCrc(blob);
      const nameB = enc.encode(name);
      const size = blob.size;
      if (offset + 30 + nameB.length + size > LIMIT) throw MMSD.AppError('ZIP_LIMIT', '백업 파일이 4GB를 넘어요. 큰 동영상을 줄이거나 "기록만 백업"을 이용해 주세요.');
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, t.time, true); h.setUint16(12, t.date, true); h.setUint32(14, crc, true);
      h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, nameB.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, nameB, blob);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, t.time, true); c.setUint16(14, t.date, true); c.setUint32(16, crc, true);
      c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, nameB.length, true);
      c.setUint32(42, offset, true);
      central.push(c.buffer, nameB);
      offset += 30 + nameB.length + size;
      count++;
    };
    this.finish = function () {
      const cdStart = offset;
      let cdSize = 0;
      central.forEach(function (p) { cdSize += p.byteLength; });
      const e = new DataView(new ArrayBuffer(22));
      e.setUint32(0, 0x06054b50, true); e.setUint16(8, count, true); e.setUint16(10, count, true);
      e.setUint32(12, cdSize, true); e.setUint32(16, cdStart, true);
      return new Blob(parts.concat(central, [e.buffer]), { type: 'application/zip' });
    };
  }

  async function read(file) {
    const tailStart = Math.max(0, file.size - 65557);
    const tail = new DataView(await file.slice(tailStart).arrayBuffer());
    let eocd = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw MMSD.AppError('ZIP', 'ZIP 파일을 읽을 수 없어요. 파일이 손상되었을 수 있어요.');
    const count = tail.getUint16(eocd + 10, true);
    const cdSize = tail.getUint32(eocd + 12, true);
    const cdOff = tail.getUint32(eocd + 16, true);
    const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
    const dec = new TextDecoder();
    const entries = new Map();
    let p = 0;
    for (let i = 0; i < count; i++) {
      if (cd.getUint32(p, true) !== 0x02014b50) throw MMSD.AppError('ZIP', 'ZIP 파일 목록이 손상되었어요.');
      const method = cd.getUint16(p + 10, true), comp = cd.getUint32(p + 20, true), size = cd.getUint32(p + 24, true);
      const n = cd.getUint16(p + 28, true), e = cd.getUint16(p + 30, true), c = cd.getUint16(p + 32, true);
      const local = cd.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, n));
      entries.set(name, { name: name, method: method, comp: comp, size: size, local: local });
      p += 46 + n + e + c;
    }
    async function blob(name, type) {
      const en = entries.get(name);
      if (!en) return null;
      const lh = new DataView(await file.slice(en.local, en.local + 30).arrayBuffer());
      const start = en.local + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
      const raw = file.slice(start, start + en.comp, type || '');
      if (en.method === 0) return raw;
      if (en.method === 8) {
        if (!window.DecompressionStream) throw MMSD.AppError('ZIP', '이 브라우저는 압축된 ZIP 파일을 풀 수 없어요.');
        const out = await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
        return type ? out.slice(0, out.size, type) : out;
      }
      throw MMSD.AppError('ZIP', '지원하지 않는 압축 방식이에요.');
    }
    return { entries: entries, blob: blob };
  }

  return { Writer: Writer, read: read, crc32: crc32 };
})();
