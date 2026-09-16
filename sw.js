/* 训练日志 · 离线缓存
   作用：第一次联网打开后，把页面存进手机缓存。
   以后健身房没信号也能正常打开、正常记录。
   改动页面内容后，把下面的版本号 v1 改成 v2、v3…… 手机就会自动更新。 */
var CACHE = "gymlog-v1";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  // 站外请求（比如跳去 MuscleWiki）不拦截，交给浏览器
  if (url.origin !== self.location.origin) return;

  var isDoc = req.mode === "navigate" ||
              (req.headers.get("accept") || "").indexOf("text/html") >= 0;

  if (isDoc) {
    // 页面本身：联网时每次都取最新的，取不到就用缓存（离线）
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req.url, copy).catch(function () {}); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("./index.html") || caches.match("./");
        });
      })
    );
    return;
  }

  // 其他文件：先看缓存，没有再去网上拿
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req.url, copy).catch(function () {}); });
        return res;
      });
    })
  );
});
