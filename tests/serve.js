/* tests/serve.js — tiny static file server for the headless test harness.
   Serves the repo root so the PWA loads exactly as it would in production. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

function createServer(root) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    fs.readFile(path.join(root, p), (err, data) => {
      if (err) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "text/plain" });
      res.end(data);
    });
  });
}

// Start on an ephemeral port so parallel runs never collide.
function start(root) {
  return new Promise((resolve) => {
    const server = createServer(root);
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, port, url: "http://127.0.0.1:" + port });
    });
  });
}

module.exports = { start, createServer };
