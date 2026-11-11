# roster-site

The marketing site for Roster, [useroster.xyz](https://useroster.xyz): plain HTML, CSS and
JavaScript, published with GitHub Pages. The product app lives in a separate, private repo.

## Layout

```
src/
  pages/              every page, grouped by kind
    index.html          the homepage
    404.html            shown for any address that doesn't exist
    start.html          setup instructions after sign-up
    guides.html         the index of guides
    changelog.html
    product/            what Roster does: reporting, campaign creation, tracking, security
    guides/             the Google Ads articles
    compare/            Roster against other tools
    legal/              privacy policy and terms
  partials/           the menu bar and footer every page shares, put into each page by the build
  links/              short addresses used when sharing (/dm, /ig, /li, /mail), which forward
                      to the homepage with campaign tags
  assets/
    css/                site.css on every page, plus one stylesheet per kind of page
    js/                 site.js and analytics.js on every page, plus page-specific scripts
    js/vendor/          third-party code, copied in unchanged
  public/             copied to the site exactly as it is: robots.txt, sitemap.xml, search-engine
                      verification files, and images whose address is used elsewhere
scripts/
  build.mjs           arranges src/ into _site/, the folder that is published
  check.mjs           fails if any page links to something that doesn't exist
  serve.mjs           serves _site/ locally the way GitHub Pages does
```

### Every page keeps its address

The folders under `src/pages/` are for finding things; they don't appear in the URL. The build
publishes each page at the top level under its file name, so
`src/pages/guides/google-ads-monthly-report.html` is
`https://useroster.xyz/google-ads-monthly-report.html`. Those addresses are indexed by search
engines and linked from elsewhere (the Meta app's settings and the Roster plugin's manifests link
the privacy policy), so a page's file name is its address: don't rename one without a plan for the old link.
Two pages can't share a file name, and the build stops if they do.

### Shared header and footer

The menu bar and the footer live once, in `src/partials/`. Each page has a comment where they go:

```html
<!-- include header cta="article_" home="/" -->
...
<!-- include footer cta="article_" home="/" -->
```

`cta` prefixes the analytics names of the buttons in them (`article_nav_sign_in`), so a page's
clicks can be told apart in Google Analytics; keep a page's prefix as it is, or its history splits
in two. `home` is `/` everywhere except the homepage, which passes `""` so its own section links
scroll rather than reload. The comment at the top of each partial says the same.

## Working on it

Needs Node 20 or later and nothing else: there are no dependencies to install.

```bash
npm run dev
```

builds the site and serves it on http://localhost:4000. After an edit, run it again.

```bash
npm run build && npm run check
```

is what the deploy runs. The check catches a broken link, a missing stylesheet or script, or a
sitemap entry for a page that doesn't exist.

### Adding a page

1. Add the HTML file to the folder under `src/pages/` it belongs in. Copy the `<head>` from a
   page of the same kind: it carries the canonical URL, the share card and the analytics. Use the
   `include header` and `include footer` comments for the menu bar and footer, with a `cta`
   prefix of its own if its clicks should be counted apart.
2. Link stylesheets, scripts and images from the site root (`/assets/css/site.css`,
   `/img/logo-square-400.png`), so a page works whichever folder its source sits in.
3. Add it to `src/public/sitemap.xml` if search engines should find it.
4. Run `npm run build && npm run check`.

## Deploying

Every push to `main` builds, checks and publishes the site
([.github/workflows/pages.yml](.github/workflows/pages.yml)). If the check fails, nothing is
published and the live site stays as it was. Work on a branch, and merge to `main` when it is
ready to go live.
