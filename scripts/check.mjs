// Checks the built site in _site/ before it is published: every link, stylesheet, script and image
// a page points at must exist, and so must every address in sitemap.xml. A broken link here is a
// broken link for a visitor, so the deploy stops on the first run that finds one.
//
// Links to other sites are not fetched; only this site's own addresses are checked, whether
// written as a path ("/assets/css/site.css", "guides.html") or in full ("https://useroster.xyz/").

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://useroster.xyz";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "_site");

if (!existsSync(out)) {
  console.error("_site/ does not exist. Run `npm run build` first.");
  process.exit(1);
}

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

// The file GitHub Pages would serve for a site path: the file itself, the same name with .html
// added, or the folder's index.html.
function resolves(sitePath) {
  const path = join(out, decodeURIComponent(sitePath));
  const candidates = [path, `${path}.html`, join(path, "index.html")];
  return candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

// A reference as written in a page, turned into a site path, or null when it points elsewhere.
function sitePathOf(ref, pageSitePath) {
  if (ref.startsWith(SITE_ORIGIN)) ref = ref.slice(SITE_ORIGIN.length) || "/";
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref) || ref === "") return null;
  const path = ref.split(/[?#]/)[0];
  if (path === "") return null;
  return path.startsWith("/") ? path : posix.join(posix.dirname(pageSitePath), path);
}

const problems = [];
const ATTRIBUTES = /\b(href|src|content)\s*=\s*"([^"]*)"/g;

for (const file of filesUnder(out).filter((f) => f.endsWith(".html"))) {
  const pageSitePath = `/${relative(out, file).split("\\").join("/")}`;
  const html = readFileSync(file, "utf8");
  for (let [, attribute, ref] of html.matchAll(ATTRIBUTES)) {
    // `content` is plain text in most meta tags; only a full address on this site (og:image,
    // og:url, a refresh target) is a link to check.
    if (attribute === "content" && !ref.startsWith(SITE_ORIGIN) && !/url=\//.test(ref)) continue;
    if (attribute === "content" && /url=\//.test(ref)) ref = ref.slice(ref.indexOf("url=") + 4);
    const sitePath = sitePathOf(ref, pageSitePath);
    if (sitePath && !resolves(sitePath)) problems.push(`${pageSitePath}: "${ref}" does not exist`);
  }
}

const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const sitePath = sitePathOf(loc, "/");
  if (!sitePath || !resolves(sitePath)) problems.push(`sitemap.xml: ${loc} does not exist`);
}

const unique = [...new Set(problems)];
if (unique.length) {
  console.error(`${unique.length} broken reference(s):\n  ${unique.join("\n  ")}`);
  process.exit(1);
}
console.log("Every internal link, asset and sitemap address resolves.");
