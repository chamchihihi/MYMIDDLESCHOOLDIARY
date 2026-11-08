/* =========================================================
   서비스 워커 — 한 번 열면 인터넷이 없어도 다이어리가 열리게 해요.
   - 다이어리 프로그램 파일만 휴대폰에 보관해요. (기록은 원래대로 기기 안 저장소에)
   - 새 버전을 올리면 다음에 열 때 자동으로 바뀌어요.
   ========================================================= */
const VERSION = 'mmsd-v1';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon.png',
  './themes.css', './base.css', './records.css', './special.css', './deco.css', './system.css', './print.css',
  './settings.js', './db.js', './accounts.js', './media.js', './picker.js', './autosave.js', './themes.js', './pages.js',
  './ui.js', './forms.js', './coll.js', './deco.js',
  './home.js', './profile.js', './growth.js', './school.js', './friends.js', './diary.js',
  './memories.js', './fandom.js', './study.js', './decorate.js', './system.js',
  './zip.js', './backup.js', './printer.js', './app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* 보관해 둔 파일로 바로 열고, 인터넷이 되면 뒤에서 새 파일로 바꿔 둬요 */
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      const net = fetch(req).then(function (res) {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(function () { return hit || (req.mode === 'navigate' ? c.match('./index.html') : undefined); });
      return hit || net;
    });
  }));
});
