// Spell Climb offline support.
// The game page itself is always fetched fresh when there's internet, so updates
// show up right away. The saved copy is only used when the phone is offline.
const CACHE = "spellclimb-v6";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // The game page: newest version from the internet first, saved copy if offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req.url, { cache: "no-store" }).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("index.html", copy));
      }
      return res;
    }).catch(() => caches.match("index.html").then(r => r || caches.match("./"))));
    return;
  }

  // Icons, fonts and other files: saved copy first, internet if missing.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  })));
});
