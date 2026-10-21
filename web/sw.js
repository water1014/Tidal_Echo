/* 镜花水月 — service worker（离线外壳 + Web Push）
   改了前端就 bump CACHE，否则装到主屏的旧壳不会更新。 */
const AI_NAME = "Cove";            // 推送标题兜底；和 index.html 的 CONFIG.AI_NAME 保持一致
const CACHE = "moonwater-v1";
const PRECACHE = [
  "./index.html",
  "./moon.css",
  "./moon.js",
  "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png",
  "./apple-touch-icon.png", "./favicon.png",
  "./avatar-sea.png", "./chat-light.webp", "./chat-harbor.webp",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 页面与前端代码走 network-first（改了马上生效，断网回落到缓存）；
   图片等静态资源走 cache-first。后端请求一律不拦（可能在别的域名上）。 */
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;            // 中继后端：直接放行
  if (url.pathname.indexOf("/relay/") >= 0) return;
  if (e.request.method !== "GET") return;

  const isDoc = e.request.mode === "navigate";
  const isCode = /\.(?:js|css|webmanifest)$/.test(url.pathname) || isDoc;

  if (isCode) {
    e.respondWith(
      fetch(e.request, { cache: "reload" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((r) => {
      if (r) return r;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      });
    })
  );
});

/* ── Web Push (VAPID) ── */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (_) { d = { body: (e.data && e.data.text && e.data.text()) || "" }; }
  const title = d.title || AI_NAME;
  const body  = d.body  || "水面上有新消息";
  const tag   = d.id ? ("moonwater-" + d.id) : "moonwater-msg";
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      icon:  "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [80, 40, 80],
      data: { url: d.url || "./" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cls) => {
      for (const c of cls) {
        if ("focus" in c) { c.postMessage({ type: "backfill" }); return c.focus(); }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : null;
    })
  );
});
