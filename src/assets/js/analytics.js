// Google Analytics for the marketing site.
//
// The site and the product app are separate origins — this is GitHub Pages, the app is Cloud Run
// — sharing a single GA4 stream. That is deliberate. Two streams would mean two properties'
// worth of reports and no way to ask the only question this site exists to answer: of the people
// who read it, which ones went on to sign up and connect an account. So both origins are linked
// for cross-domain measurement, every event carries a `surface` parameter saying which one it
// came from, and the journey is one session from the homepage to the first report.
//
// Storage is granted, with two limits that are not negotiable — advertising storage stays denied
// everywhere, and in the EEA, the UK and Switzerland analytics storage waits for consent.
//
// What the site measures, since the redesign of 2 November 2026 (every event also carries
// `site_release`, so "the new site only" is one filter in any report):
//
//   where a visit came from   `came_from` on every event, `first_came_from` on the user
//   what was read             section_view, section_time, scroll_milestone, article_read
//   which buttons worked      cta_view and cta_click per placement, sample_open
//   how people moved around   nav_click, faq_open, outbound_click, mailto_click
//   the demo                  demo_step: send, report_built, report_explored, report_section
//   what went wrong           site_error (a category, never a message), web_vital
//
// Only useroster.xyz sends anything. A local copy runs every measurement into `dataLayer` and stops
// there, so testing never reaches the property; `?ga_debug=1` sends from anywhere, flagged as
// debug traffic for DebugView. `?internal=1` marks the team's own browsers (`?internal=0` clears
// it), and their visits are tagged so the Internal Traffic filter can leave them out.

(function () {
  var MEASUREMENT_ID = "G-JW8Y77HM3M";
  var PRODUCTION_HOST = "useroster.xyz";
  var APP_HOST = "app.useroster.xyz";
  var APP_ORIGIN = "https://" + APP_HOST;
  var SURFACE = "site";
  var SITE_RELEASE = "2026-11-02";
  var CONSENT_KEY = "roster.consent.analytics";
  var DEBUG_KEY = "roster.ga_debug";
  var CAME_FROM_KEY = "roster.came_from";
  var FIRST_CAME_FROM_KEY = "roster.first_came_from";
  var INTERNAL_COOKIE = "roster_internal";

  // Both hostnames, so gtag decorates links from here to the app with `_gl` and the arriving
  // page adopts the same client id instead of starting a second session. The GA4 property has to
  // list both domains too — the linker writes the parameter, the property decides whether to
  // honour it, and setting only one of the two looks like it works.
  var LINKER_DOMAINS = [location.hostname, APP_HOST];

  // Where the law requires asking before measuring. Applied by gtag against Google's own
  // region determination, which is the only place that call can honestly be made client-side.
  var DENIED_REGIONS = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE",
    "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    "GB", "CH",
  ];

  var AD_DENIED = {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };

  function consentState(analytics) {
    return {
      ad_storage: AD_DENIED.ad_storage,
      ad_user_data: AD_DENIED.ad_user_data,
      ad_personalization: AD_DENIED.ad_personalization,
      analytics_storage: analytics,
    };
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  function read(store, key) {
    try {
      return window[store].getItem(key);
    } catch (e) {
      return null;
    }
  }

  function write(store, key, value) {
    try {
      if (value) window[store].setItem(key, value);
      else window[store].removeItem(key);
    } catch (e) {
      // Storage blocked: the value holds for this page only.
    }
  }

  function stored() {
    var v = read("localStorage", CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  }

  function merge(a, b) {
    var out = {};
    [a, b].forEach(function (o) {
      Object.keys(o || {}).forEach(function (k) {
        out[k] = o[k];
      });
    });
    return out;
  }

  // ---- which copy of the site this is --------------------------------------------------------

  var params = new URLSearchParams(location.search);
  var production = location.hostname === PRODUCTION_HOST;
  if (params.has("ga_debug")) write("sessionStorage", DEBUG_KEY, params.get("ga_debug") === "1" ? "1" : "");
  var debug = read("sessionStorage", DEBUG_KEY) === "1";
  var sending = production || debug;

  // The team's own browsers. A cookie on the parent domain rather than an IP rule, because a
  // home connection's address changes and the app at app.useroster.xyz can read the same mark.
  if (params.has("internal")) {
    var on = params.get("internal") === "1";
    document.cookie =
      INTERNAL_COOKIE + "=" + (on ? "1" : "") + "; path=/" +
      (production ? "; domain=" + PRODUCTION_HOST : "") +
      "; max-age=" + (on ? 63072000 : 0) + "; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
  }
  var internal = new RegExp("(?:^|;\\s*)" + INTERNAL_COOKIE + "=1").test(document.cookie);

  // ---- consent, before anything is sent ----------------------------------------------------
  //
  // The stored answer is folded into the *default* rather than pushed as an update after the
  // fact. An update would arrive after the first page_view had already gone out, which for
  // someone who declined is precisely the hit that should not exist.

  var choice = stored();
  if (choice) {
    gtag("consent", "default", consentState(choice));
  } else {
    gtag("consent", "default", {
      ad_storage: AD_DENIED.ad_storage,
      ad_user_data: AD_DENIED.ad_user_data,
      ad_personalization: AD_DENIED.ad_personalization,
      analytics_storage: "denied",
      region: DENIED_REGIONS,
      // Holds hits for half a second so a visitor who accepts immediately is not counted as
      // having arrived before consent existed.
      wait_for_update: 500,
    });
    gtag("consent", "default", consentState("granted"));
  }

  gtag("js", new Date());

  // ---- where the visit came from --------------------------------------------------------------
  //
  // GA reads the referrer and campaign tags itself, and a custom channel group in the property
  // sorts them into channels. This adds what GA cannot see: a link opened inside the Instagram,
  // LinkedIn or Facebook app usually arrives with no referrer at all and is filed as Direct, but
  // the app's own browser names itself in the user agent; and an Android app can pass itself as
  // an `android-app://` referrer. The answer is one value from a fixed list — never a URL.

  var SOURCES = [
    [/(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com)$/, "chatgpt"],
    [/(^|\.)claude\.ai$/, "claude"],
    [/(^|\.)perplexity\.ai$/, "perplexity"],
    [/^(gemini|bard)\.google\.com$/, "gemini"],
    [/(^|\.)copilot\.microsoft\.com$|^copilot\.cloud\.microsoft$/, "copilot"],
    [/(^|\.)(you\.com|phind\.com|poe\.com|chat\.deepseek\.com|deepseek\.com|grok\.com|meta\.ai|chat\.mistral\.ai)$/, "other_ai"],
    [/^(mail\.google\.com|outlook\.(live|office|office365)\.com|mail\.yahoo\.com|mail\.proton\.me)$/, "email"],
    [/^(docs|drive|sites|groups|calendar)\.google\.com$/, "other_site"],
    [/(^|\.)google\.[a-z.]+$/, "google"],
    [/(^|\.)bing\.com$/, "bing"],
    [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
    [/(^|\.)(yahoo\.com|yandex\.[a-z.]+|baidu\.com|ecosia\.org|search\.brave\.com|naver\.com|startpage\.com|kagi\.com)$/, "other_search"],
    [/(^|\.)instagram\.com$/, "instagram"],
    [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
    [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
    [/^t\.co$|(^|\.)(twitter\.com|x\.com)$/, "x"],
    [/(^|\.)reddit\.com$/, "reddit"],
    [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
    [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
    [/(^|\.)(tiktok\.com|threads\.net|pinterest\.[a-z.]+|quora\.com|medium\.com|news\.ycombinator\.com|producthunt\.com|t\.me|discord\.com)$/, "other_social"],
  ];

  // Android apps that hand over an android-app:// referrer, by package name.
  var ANDROID_APPS = {
    "com.google.android.gm": "email",
    "com.microsoft.office.outlook": "email",
    "com.google.android.googlequicksearchbox": "google",
    "com.linkedin.android": "linkedin",
    "com.instagram.android": "instagram",
    "com.facebook.katana": "facebook",
    "com.facebook.orca": "facebook",
    "com.whatsapp": "whatsapp",
    "com.twitter.android": "x",
    "com.reddit.frontpage": "reddit",
    "com.google.android.youtube": "youtube",
    "com.openai.chatgpt": "chatgpt",
    "com.anthropic.claude": "claude",
    "ai.perplexity.app.android": "perplexity",
    "com.google.android.apps.bard": "gemini",
    "com.microsoft.copilot": "copilot",
  };

  // In-app browsers that say whose they are.
  var IN_APP = [
    [/Instagram/, "instagram"],
    [/LinkedInApp/, "linkedin"],
    [/FBAN|FBAV|FB_IAB|FBIOS/, "facebook"],
    [/BytedanceWebview|musical_ly|TikTok/i, "other_social"],
  ];

  // What GA is told when it would otherwise see nothing: the campaign tags an app's link would
  // have carried, added to the landing page's reported address only, never to the real one.
  var TAGS = {
    instagram: ["instagram.com", "social"],
    linkedin: ["linkedin.com", "social"],
    facebook: ["facebook.com", "social"],
    x: ["x.com", "social"],
    reddit: ["reddit.com", "social"],
    youtube: ["youtube.com", "social"],
    whatsapp: ["whatsapp", "social"],
    chatgpt: ["chatgpt.com", "referral"],
    claude: ["claude.ai", "referral"],
    perplexity: ["perplexity.ai", "referral"],
    gemini: ["gemini.google.com", "referral"],
    copilot: ["copilot.microsoft.com", "referral"],
    email: ["email_app", "email"],
    google: ["google", "organic"],
  };

  function fromHost(host) {
    for (var i = 0; i < SOURCES.length; i++) {
      if (SOURCES[i][0].test(host)) return SOURCES[i][1];
    }
    return "other_site";
  }

  // A campaign tag on the link: one we wrote, or one an assistant added (ChatGPT tags its links
  // utm_source=chatgpt.com).
  function fromTag(source, medium) {
    if (medium === "email" || /mail|newsletter/.test(source)) return "email";
    if (medium === "dm" || source === "direct_message") return "direct_message";
    var known = fromHost(source.indexOf(".") > -1 ? source : source + ".com");
    return known === "other_site" ? "other_campaign" : known;
  }

  function arrival() {
    var source = (params.get("utm_source") || "").toLowerCase();
    var medium = (params.get("utm_medium") || "").toLowerCase();
    if (source || medium) return { from: fromTag(source, medium), tag: null };

    var ref = document.referrer || "";
    if (/^android-app:\/\//i.test(ref)) {
      var app = ANDROID_APPS[ref.slice(14).split("/")[0].toLowerCase()] || "other_app";
      return { from: app, tag: TAGS[app] || null };
    }

    var host = "";
    try {
      host = ref ? new URL(ref).hostname.toLowerCase() : "";
    } catch (e) {
      host = "";
    }
    if (host === location.hostname || host === PRODUCTION_HOST || host === APP_HOST) {
      return { from: "internal", tag: null };
    }
    if (host) return { from: fromHost(host), tag: null };

    var ua = navigator.userAgent || "";
    for (var i = 0; i < IN_APP.length; i++) {
      if (IN_APP[i][0].test(ua)) return { from: IN_APP[i][1], tag: TAGS[IN_APP[i][1]] || null };
    }
    return { from: "direct", tag: null };
  }

  // A visit is labelled by where it landed from. Moving on to a second page keeps that label,
  // carried in session storage — but only once GA's own cookie exists, which is to say only for
  // a visitor whose consent allows measurement storage at all.
  var landing = arrival();
  var cameFrom = landing.from === "internal" ? read("sessionStorage", CAME_FROM_KEY) || "unknown" : landing.from;
  var firstCameFrom = read("localStorage", FIRST_CAME_FROM_KEY) || "";

  function remember() {
    if (!/(?:^|;\s*)_ga=/.test(document.cookie)) return;
    if (landing.from !== "internal") write("sessionStorage", CAME_FROM_KEY, landing.from);
    if (!firstCameFrom && landing.from !== "internal") {
      firstCameFrom = landing.from;
      write("localStorage", FIRST_CAME_FROM_KEY, firstCameFrom);
      gtag("set", "user_properties", { first_came_from: firstCameFrom });
    }
  }

  // ---- what GA calls this page ---------------------------------------------------------------
  //
  // A readable page group, sent as GA's built-in `content_group`, and a canonical URL so that
  // `/` and `/index.html` are one row rather than two. The names match the app's
  // (src/lib/analytics/pages.ts) and the glossary in docs/analytics.md.
  //
  // Only the campaign tags survive in the query: GA reads traffic source from page_location, so
  // dropping them would file every tagged link under "direct".

  var PAGE_GROUPS = {
    "": "Site · Home",
    "index.html": "Site · Home",
    "campaign-creation.html": "Site · Campaign creation",
    "campaign-tracking.html": "Site · Campaign tracking",
    "campaign-reporting.html": "Site · Campaign reporting",
    "security.html": "Site · Security",
    "changelog.html": "Site · Changelog",
    "start.html": "Site · Getting started",
    "guides.html": "Site · Guides index",
    "google-ads-monthly-report.html": "Site · Guide",
    "roster-vs-looker-studio.html": "Site · Guide",
    "roster-vs-whatagraph.html": "Site · Guide",
    "google-ads-report-doesnt-match.html": "Site · Guide",
    "explain-bad-month-google-ads-client.html": "Site · Guide",
    "looker-studio-google-ads-report-broken.html": "Site · Guide",
    "white-label-google-ads-reports.html": "Site · Guide",
    "privacy.html": "Site · Privacy policy",
    "terms.html": "Site · Terms of service",
  };
  var KEPT_QUERY = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];

  var file = location.pathname.split("/").pop();
  var dir = location.pathname.slice(0, location.pathname.length - file.length);
  var canonicalPath = file === "index.html" ? dir : location.pathname;
  // The not-found page is served at whatever address was asked for, so it names itself.
  var group = document.body.getAttribute("data-page-group") || PAGE_GROUPS[file] || "Site · Other";
  var kept = new URLSearchParams();
  KEPT_QUERY.forEach(function (key) {
    if (params.get(key)) kept.set(key, params.get(key));
  });
  if (landing.tag) {
    kept.set("utm_source", landing.tag[0]);
    kept.set("utm_medium", landing.tag[1]);
    kept.set("utm_campaign", "(in-app)");
  }
  var query = kept.toString();

  // Sent with every hit: which surface, which release of the site, and where the visit came from.
  var COMMON = { surface: SURFACE, site_release: SITE_RELEASE, came_from: cameFrom };
  if (internal) COMMON.traffic_type = "internal";
  if (debug) COMMON.debug_mode = true;

  if (firstCameFrom) gtag("set", "user_properties", { first_came_from: firstCameFrom });

  gtag("config", MEASUREMENT_ID, merge(COMMON, {
    content_group: group,
    page_location: location.origin + canonicalPath + (query ? "?" + query : ""),
    // `auto` walks up looking for the broadest domain that will accept a cookie: useroster.xyz,
    // here and on app.useroster.xyz, so the site and the app share one client id. Moving either
    // side off it resets every client id, and the historic users go with them; the site's move off
    // github.io on 31 October 2026 and the app's off run.app on 1 November 2026 both did.
    cookie_domain: "auto",
    cookie_flags: "SameSite=Lax;Secure",
    linker: { domains: LINKER_DOMAINS, accept_incoming: true },
  }));

  if (sending) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    // gtag sets its cookie a moment after it loads; the visit's origin is stored after that.
    s.onload = function () {
      setTimeout(remember, 1500);
    };
    document.head.appendChild(s);
  }

  /** Every custom event goes through here, so none of them can forget the common parameters. */
  function event(name, detail) {
    gtag("event", name, merge(detail, COMMON));
  }

  /** A path in the app with its ids and share tokens replaced, so none of them reaches GA. */
  function template(path) {
    return path
      .replace(/^\/(s|r|reset)\/[^/]+/, "/$1/:id")
      .replace(/^\/workspaces\/[^/]+/, "/workspaces/:id")
      .replace(/\/[A-Za-z0-9_-]{16,}(?=\/|$)/g, "/:id");
  }

  /** Whether an element is actually showing, not merely inside the viewport. */
  function shown(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.2) return false;
    }
    return true;
  }

  // ---- the consent banner --------------------------------------------------------------------
  //
  // Injected rather than written into every HTML file, so privacy.html and terms.html get it
  // without anyone having to remember them. Shown to everyone: region is Google's determination
  // to make, not this script's, and outside the regions above consent is already granted — so
  // declining is the only action here that changes what is collected.

  function banner() {
    if (stored()) return;

    var style = document.createElement("style");
    style.textContent =
      ".ga-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:200;margin:0 auto;" +
      "max-width:620px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:14px 16px;" +
      "background:#fff;border:1px solid rgba(27,34,45,.12);border-radius:14px;" +
      "box-shadow:0 1px 2px rgba(27,34,45,.06),0 24px 50px -30px rgba(27,34,45,.45);" +
      "font-size:13px;line-height:1.5;color:#4b5462}" +
      ".ga-consent p{flex:1 1 240px;margin:0}" +
      ".ga-consent a{color:#1a73e8}" +
      ".ga-consent div{display:flex;gap:8px;flex-shrink:0}" +
      ".ga-consent button{font:inherit;font-weight:600;border-radius:999px;padding:8px 16px;" +
      "cursor:pointer;white-space:nowrap}" +
      ".ga-consent .ga-yes{color:#fff;background:#1b222d;border:1px solid #1b222d}" +
      ".ga-consent .ga-no{color:#4b5462;background:transparent;border:1px solid rgba(27,34,45,.18)}";
    document.head.appendChild(style);

    var el = document.createElement("div");
    el.className = "ga-consent";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Analytics consent");
    el.innerHTML =
      "<p>We use Google Analytics to see which parts of this site are read, and set a cookie to " +
      'do it. No advertising and no third-party tracking. <a href="/privacy.html">How we handle ' +
      'it</a>.</p><div><button type="button" class="ga-no">No thanks</button>' +
      '<button type="button" class="ga-yes">Allow</button></div>';

    function decide(value) {
      write("localStorage", CONSENT_KEY, value);
      gtag("consent", "update", consentState(value));
      el.remove();
    }

    el.querySelector(".ga-yes").addEventListener("click", function () {
      decide("granted");
    });
    el.querySelector(".ga-no").addEventListener("click", function () {
      decide("denied");
    });
    document.body.appendChild(el);
  }

  // ---- attention -------------------------------------------------------------------------------
  //
  // Which parts of the page hold people, rather than merely which were scrolled past. A section
  // counts as read only while it is both on screen and in a visible tab, so a page left open in
  // a background tab does not register as an hour of rapt attention.

  function attention() {
    var sections = document.querySelectorAll("[data-track]");
    if (!sections.length) return headings();

    var state = new Map();

    function bank(el) {
      var s = state.get(el);
      if (s && s.since) {
        s.ms += Date.now() - s.since;
        s.since = 0;
      }
    }

    function resume(el) {
      var s = state.get(el);
      if (s && s.onScreen && document.visibilityState === "visible" && !s.since) {
        s.since = Date.now();
      }
    }

    sections.forEach(function (el) {
      state.set(el, { ms: 0, since: 0, onScreen: false, seen: false });
    });

    // On screen means half of the section is showing, or, for a section taller than the screen,
    // that it fills half the screen. `isIntersecting` alone stays true until the last pixel has
    // gone, which would keep counting a section long after the reader had moved on.
    function filling(entry) {
      if (!entry.isIntersecting) return false;
      var screen = entry.rootBounds ? entry.rootBounds.height : window.innerHeight;
      return entry.intersectionRect.height >= Math.min(entry.boundingClientRect.height, screen) * 0.5;
    }

    var steps = [];
    for (var i = 0; i <= 20; i++) steps.push(i / 20);

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          var s = state.get(el);
          if (!s) return;

          s.onScreen = filling(entry);
          if (s.onScreen) {
            if (!s.seen) {
              s.seen = true;
              event("section_view", { section: el.getAttribute("data-track") });
            }
            resume(el);
          } else {
            bank(el);
          }
        });
      },
      { threshold: steps },
    );

    sections.forEach(function (el) {
      io.observe(el);
    });

    var flushed = false;
    function flush() {
      if (flushed) return;
      flushed = true;
      sections.forEach(function (el) {
        bank(el);
        var s = state.get(el);
        var seconds = Math.round(s.ms / 1000);
        if (seconds > 0) {
          event("section_time", {
            section: el.getAttribute("data-track"),
            seconds: seconds,
          });
        }
      });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        flushed = false;
        sections.forEach(resume);
      } else {
        // Reported when the tab is hidden, not only at pagehide. A phone that is locked and never
        // returned to fires no pagehide at all, and that reading would simply be lost.
        flush();
        sections.forEach(function (el) {
          state.get(el).ms = 0;
        });
      }
    });

    // One event per section on the way out, rather than a stream of updates while reading.
    window.addEventListener("pagehide", flush);
  }

  /**
   * The legal pages, which are a flat run of `h2[id]` with no wrapping elements to mark up.
   *
   * Only `section_view` — which clauses people actually reach — and deliberately not
   * `section_time`. The heading is a few pixels tall; time with it on screen is not time spent
   * reading the clause beneath it, and reporting one as the other would be a made-up number in a
   * property that otherwise contains none.
   */
  function headings() {
    var found = document.querySelectorAll("main h2[id]");
    if (!found.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          event("section_view", { section: entry.target.id });
        });
      },
      { threshold: 1 },
    );

    found.forEach(function (el) {
      io.observe(el);
    });
  }

  // ---- scroll depth ------------------------------------------------------------------------------
  //
  // Coarser than section attention and worth having anyway: it is the one measure that works on
  // pages with no sections marked up, which is every guide and legal page.

  function scrollDepth() {
    var marks = [25, 50, 75, 100];
    var hit = {};

    function check() {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      var percent = ((window.scrollY || doc.scrollTop) / scrollable) * 100;
      marks.forEach(function (mark) {
        if (!hit[mark] && percent >= mark - 1) {
          hit[mark] = true;
          event("scroll_milestone", { percent: mark });
        }
      });
    }

    // passive, because a scroll handler that can call preventDefault blocks scrolling on touch.
    window.addEventListener("scroll", check, { passive: true });
    check();
  }

  // ---- buttons seen ------------------------------------------------------------------------------
  //
  // A click count alone cannot say whether a placement works: the button at the end of a guide
  // is clicked less than the one in the menu partly because fewer people get there. So every
  // button into the product reports once per page when it is actually on screen — at least 60%
  // of it in view, and not hidden, faded out or waiting for the demo to finish — and its clicks
  // read as a rate.

  function ctaViews() {
    var buttons = [].filter.call(document.querySelectorAll("a[data-cta]"), function (a) {
      return a.href.indexOf(APP_ORIGIN) === 0;
    });
    if (!buttons.length || !("IntersectionObserver" in window)) return;

    var pending = new Set();
    var timer = 0;

    function fire(a) {
      pending.delete(a);
      io.unobserve(a);
      event("cta_view", { cta: a.getAttribute("data-cta"), destination: template(new URL(a.href).pathname) });
    }

    // In view but not yet showing — the bar along the bottom of a phone, the demo's buttons —
    // is checked again until it shows or leaves.
    function sweep() {
      pending.forEach(function (a) {
        if (shown(a)) fire(a);
      });
      if (!pending.size) {
        clearInterval(timer);
        timer = 0;
      }
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.intersectionRatio < 0.6) return pending.delete(e.target);
          if (shown(e.target)) return fire(e.target);
          pending.add(e.target);
          if (!timer) timer = setInterval(sweep, 600);
        });
      },
      { threshold: 0.6 },
    );

    buttons.forEach(function (a) {
      io.observe(a);
    });
  }

  // ---- clicks --------------------------------------------------------------------------------
  //
  // One delegated listener rather than a handler per link, so the next link added cannot be
  // forgotten. Into the product is `cta_click`, named by its `data-cta`; the sample report is
  // `sample_open`; anywhere else on this site is `nav_click`, named by the part of the page the
  // link sits in; anywhere else entirely is `outbound_click`, by domain.

  var AREAS = [
    [".nav", "menu"],
    [".dots", "page_dots"],
    [".foot", "footer"],
    [".tile", "job_tile"],
    [".back", "back_link"],
    [".after", "hero"],
    [".guide-list", "guide_list"],
    [".cta-card, .cta-inline, .cta-rail, .mbar, .closing, .report-end", "cta_card"],
    [".qa, .faq-list", "question"],
    [".how-steps, .needs, .steps3", "how_it_works"],
  ];

  function area(a) {
    for (var i = 0; i < AREAS.length; i++) {
      if (a.closest(AREAS[i][0])) return AREAS[i][1];
    }
    return "in_text";
  }

  function clicks() {
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a") : null;
        if (!a) return;
        var href = a.getAttribute("href") || "";

        if (href.indexOf("mailto:") === 0) {
          event("mailto_click", { context: group });
          return;
        }

        var url;
        try {
          url = new URL(a.href, location.href);
        } catch (err) {
          return;
        }
        if (!/^https?:$/.test(url.protocol)) return;

        // A click into the product is the site's whole job, so it is its own event rather than
        // an outbound click to a domain that happens to be ours.
        if (url.origin === APP_ORIGIN) {
          var path = template(url.pathname);
          event(path.indexOf("/s/") === 0 ? "sample_open" : "cta_click", {
            cta: a.getAttribute("data-cta") || "app_link",
            destination: path,
          });
          return;
        }

        if (url.origin === location.origin) {
          var to = url.pathname.replace(/\/index\.html$/, "/") + (url.hash || "");
          event("nav_click", { nav: area(a), destination: to });
          return;
        }

        event("outbound_click", { domain: url.hostname });
      },
      true,
    );

    // copy.js owns the clipboard and knows whether the write succeeded; it says so with this
    // event. Listening for it here rather than for the click means a blocked clipboard is not
    // counted as a copy.
    document.addEventListener("roster:copy", function (e) {
      event("copy_snippet", { snippet: (e.detail && e.detail.snippet) || "other" });
    });
  }

  // ---- questions ---------------------------------------------------------------------------------
  //
  // Which questions people open is the closest thing to hearing what worries them. `toggle` does
  // not bubble, so it is caught on the way down instead.

  function questions() {
    document.addEventListener(
      "toggle",
      function (e) {
        var d = e.target;
        if (!d || d.tagName !== "DETAILS" || !d.open) return;
        var summary = d.querySelector("summary");
        var q = d.getAttribute("data-q") || (summary ? summary.textContent : "other");
        event("faq_open", {
          question: q.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60),
        });
      },
      true,
    );
  }

  // ---- guides read to the end --------------------------------------------------------------------
  //
  // Scrolling to the bottom is easy to do without reading anything. A guide counts as read when
  // its closing card has come into view and the page has been in front of the reader for at
  // least thirty seconds, whichever happens later.

  function reading() {
    var article = document.querySelector("main.article .article-inner");
    if (!article || !("IntersectionObserver" in window)) return;
    var end = article.querySelector(".cta-card") || article.lastElementChild;
    var reached = false;
    var done = false;
    var ms = 0;
    var since = document.visibilityState === "visible" ? Date.now() : 0;

    function tick() {
      if (since) {
        ms += Date.now() - since;
        since = Date.now();
      }
    }

    function check() {
      tick();
      if (done || !reached || ms < 30000) return;
      done = true;
      clearInterval(timer);
      event("article_read", { seconds: Math.round(ms / 1000) });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") since = Date.now();
      else {
        tick();
        since = 0;
      }
    });

    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            reached = true;
            check();
          }
        });
      },
      { threshold: 0.3 },
    ).observe(end);
    var timer = setInterval(check, 5000);
  }

  // ---- the demo on the homepage ------------------------------------------------------------
  //
  // home.js says what happens in the demo — Send pressed, the report built, explored, a section
  // opened — by event, the same way copy.js reports a copy, so the demo never needs to know GA
  // exists. Whether people press Send at all is the first thing the homepage has to prove.

  function demo() {
    document.addEventListener("roster:demo", function (e) {
      var d = e.detail || {};
      var p = { step: d.step || "other" };
      if (d.section) p.section = d.section;
      event("demo_step", p);
    });
  }

  // ---- what went wrong ---------------------------------------------------------------------------
  //
  // A category and the page group, never a message: an error message can quote anything, and
  // nothing here accepts free text. At most one of each kind, and five in all, per page.

  function errors() {
    var sent = {};
    var count = 0;

    function report(kind) {
      if (sent[kind] || count >= 5) return;
      sent[kind] = true;
      count++;
      event("site_error", { kind: kind, route: group });
    }

    window.addEventListener(
      "error",
      function (e) {
        var t = e.target;
        if (t && t !== window && /^(IMG|SCRIPT|LINK)$/.test(t.tagName)) report("resource_" + t.tagName.toLowerCase());
        else report("script");
      },
      true,
    );
    window.addEventListener("unhandledrejection", function () {
      report("promise");
    });
    // paper.js marks a sheet it could not light, and every sheet is mounted before this runs.
    if (document.querySelector(".nogl")) report("no_webgl");
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!document.fonts.check('650 20px "Bricolage Grotesque"')) report("fonts");
      });
    }
  }

  // ---- speed -------------------------------------------------------------------------------------
  //
  // Google's web-vitals library, served from this site (vitals.js) rather than a third party.
  // Each page reports how long its largest piece took to appear, how quickly it answered a tap
  // or click, and how much its layout jumped — once each, as the page is left. Layout shift is
  // reported in thousandths, so all three are whole numbers.

  function speed() {
    var s = document.createElement("script");
    s.src = "/assets/js/vendor/web-vitals.js";
    s.async = true;
    s.onload = function () {
      var wv = window.webVitals;
      if (!wv) return;
      function report(m) {
        event("web_vital", {
          vital: m.name,
          rating: m.rating,
          metric_value: m.name === "CLS" ? Math.round(m.value * 1000) : Math.round(m.value),
        });
      }
      wv.onLCP(report);
      wv.onINP(report);
      wv.onCLS(report);
    };
    document.head.appendChild(s);
  }

  function start() {
    banner();
    attention();
    scrollDepth();
    ctaViews();
    clicks();
    questions();
    reading();
    demo();
    errors();
    speed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
