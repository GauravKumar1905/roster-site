// Builds the site into _site/, the folder GitHub Pages publishes.
//
// The source is arranged by what each file is; the published site keeps the flat URLs it has
// always had, because those are indexed, shared and listed in sitemap.xml. So the only real work
// here is flattening: src/pages/guides/google-ads-monthly-report.html is published as
// /google-ads-monthly-report.html. Two pages with the same file name would collide, and the build
// refuses rather than let one overwrite the other.
//
// Pages also share their menu bar and footer. A page marks where one goes with a comment such as
// <!-- include header cta="article_" home="/" -->, and the build puts src/partials/header.html
// there with each {{name}} filled in. A missing partial or an unfilled {{name}} stops the build.
//
//   src/pages/**   -> /<file name>.html     every page, whatever folder it sits in
//   src/links/**   -> /<name>/index.html    the short addresses (/dm, /li, ...) that forward on
//   src/assets/**  -> /assets/**            styles and scripts
//   src/public/**  -> /**                   copied as-is: files whose address is fixed elsewhere
//                                            (robots.txt, sitemap.xml, search-engine verification,
//                                            the logo and share image)
//
// No dependencies: plain Node, so the deploy needs nothing installed.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const out = join(root, "_site");

const IGNORED = new Set([".DS_Store", "Thumbs.db"]);

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (IGNORED.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

// Where each published file came from, so a collision can name both sides.
const written = new Map();

function emit(from, to, transform) {
  const key = relative(out, to);
  if (written.has(key)) {
    throw new Error(`${key} would be written twice: from ${written.get(key)} and ${relative(root, from)}`);
  }
  written.set(key, relative(root, from));
  mkdirSync(dirname(to), { recursive: true });
  if (transform) writeFileSync(to, transform(readFileSync(from, "utf8"), from));
  else cpSync(from, to);
}

// A partial opens with a comment saying how to use it; that stays in the source.
const partials = new Map();
function partial(name) {
  if (!partials.has(name)) {
    const path = join(src, "partials", `${name}.html`);
    if (!existsSync(path)) throw new Error(`No partial src/partials/${name}.html`);
    partials.set(name, readFileSync(path, "utf8").replace(/^<!--[\s\S]*?-->\n/, "").trimEnd());
  }
  return partials.get(name);
}

const INCLUDE = /<!--\s*include\s+([a-z-]+)((?:\s+[a-z-]+="[^"]*")*)\s*-->/g;

function withPartials(html, from) {
  return html.replace(INCLUDE, (_, name, attrs) => {
    const values = Object.fromEntries([...attrs.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    return partial(name).replace(/\{\{([a-z-]+)\}\}/g, (__, key) => {
      if (!(key in values)) throw new Error(`${relative(root, from)}: include ${name} needs ${key}="..."`);
      return values[key];
    });
  });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out);

for (const file of filesUnder(join(src, "pages"))) emit(file, join(out, basename(file)), withPartials);
for (const file of filesUnder(join(src, "links"))) emit(file, join(out, relative(join(src, "links"), file)));
for (const file of filesUnder(join(src, "assets"))) emit(file, join(out, "assets", relative(join(src, "assets"), file)));
for (const file of filesUnder(join(src, "public"))) emit(file, join(out, relative(join(src, "public"), file)));

if (!existsSync(join(out, "index.html"))) throw new Error("No index.html was built.");
console.log(`Built ${written.size} files into ${relative(root, out)}/`);
