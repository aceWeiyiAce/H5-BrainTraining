const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const css = fs.readFileSync(path.join(root, "assets/styles.css"), "utf8");
const data = fs.readFileSync(path.join(root, "assets/app-data.js"), "utf8");
const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const manifest = fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8");

fs.mkdirSync(dist, { recursive: true });

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f7f8fb" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="脑力锻炼" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="description" content="舒特尔方格与单词拼写训练，内嵌本地词库。" />
    <title>脑力锻炼</title>
    <link rel="manifest" href="./manifest.webmanifest" />
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="app" class="app-shell"></div>
    <script>
${data}
    </script>
    <script>
${app}
    </script>
  </body>
</html>
`;

const serviceWorker = `const CACHE_NAME = "brain-training-h5-v6";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
  );
});
`;

fs.writeFileSync(path.join(root, "share.html"), html);
fs.writeFileSync(path.join(dist, "index.html"), html);
fs.writeFileSync(path.join(dist, "manifest.webmanifest"), manifest);
fs.writeFileSync(path.join(dist, "sw.js"), serviceWorker);

console.log(`Built dist/index.html (${Buffer.byteLength(html)} bytes)`);
