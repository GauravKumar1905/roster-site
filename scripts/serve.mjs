// Serves _site/ locally the way GitHub Pages does: /start finds start.html, /dm finds
// dm/index.html, and an unknown address gets 404.html with a 404 status.
//
//   npm run dev            build, then serve on http://localhost:4000
//   PORT=3000 npm run dev  on another port

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "_site");
const port = Number(process.env.PORT) || 4000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function fileFor(urlPath) {
  const path = join(out, normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, ""));
  for (const candidate of [path, `${path}.html`, join(path, "index.html")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

createServer((req, res) => {
  const urlPath = new URL(req.url, "http://localhost").pathname;
  const file = fileFor(urlPath);
  const status = file ? 200 : 404;
  const served = file ?? join(out, "404.html");
  res.writeHead(status, { "Content-Type": TYPES[extname(served)] ?? "application/octet-stream" });
  createReadStream(served).pipe(res);
}).listen(port, () => console.log(`Serving _site/ on http://localhost:${port}`));
