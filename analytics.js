// Google Analytics for the marketing site.
//
// The site and the product app are separate origins — this is GitHub Pages, the app is Cloud Run
// — sharing a single GA4 stream. That is deliberate. Two streams would mean two properties'
// worth of reports and no way to ask the only question this site exists to answer: of the people
// who read it, which ones went on to sign up and connect an account. So both origins are linked
// for cross-domain measurement, every event carries a `surface` parameter saying which one it
// came from, and the journey is one session from the homepage to the first report.
//
// This file used to run permanently cookieless, with analytics_storage denied and never granted.
// That was honest and close to useless: with no persistent identifier every page load was a new
// user and a new session, so nothing joined a visit to the sign-up it led to. Storage is now
// granted, with two limits that are not negotiable — advertising storage stays denied everywhere,
// and in the EEA, the UK and Switzerland analytics storage waits for consent.

(function () {
  var MEASUREMENT_ID = "G-JW8Y77HM3M";
  var APP_ORIGIN = "https://roster-1035727789436.asia-southeast1.run.app";
  var SURFACE = "site";
  var CONSENT_KEY = "roster.consent.analytics";

  // Both hostnames, so gtag decorates links from here to the app with `_gl` and the arriving
  // page adopts the same client id instead of starting a second session. The GA4 property has to
  // list both domains too — the linker writes the parameter, the property decides whether to
  // honour it, and setting only one of the two looks like it works.
  var LINKER_DOMAINS = [location.hostname, APP_ORIGIN.replace(/^https?:\/\//, "")];

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

  function stored() {
    try {
      var v = localStorage.getItem(CONSENT_KEY);
      return v === "granted" || v === "denied" ? v : null;
    } catch (e) {
      return null;
    }
  }

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

  gtag("config", MEASUREMENT_ID, {
    surface: SURFACE,
    // `auto` walks up looking for the broadest domain that will accept a cookie. Both origins sit
    // under a public suffix — github.io here, run.app there — so it settles on the full hostname.
    // That works, and it is worth knowing before a custom domain lands: moving either side resets
    // every client id, and the historic users go with them.
    cookie_domain: "auto",
    cookie_flags: "SameSite=Lax;Secure",
    linker: { domains: LINKER_DOMAINS, accept_incoming: true },
  });

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(s);

  /** Every custom event goes through here, so none of them can forget which surface it was. */
  function event(name, params) {
    var payload = params || {};
    payload.surface = SURFACE;
    gtag("event", name, payload);
  }

  // ---- the consent banner --------------------------------------------------------------------
  //
  // Injected rather than written into four HTML files, so privacy.html and terms.html get it
  // without anyone having to remember them. Shown to everyone: region is Google's determination
  // to make, not this script's, and outside the regions above consent is already granted — so
  // declining is the only action here that changes what is collected.

  function banner() {
    if (stored()) return;

    var style = document.createElement("style");
    style.textContent =
      ".ga-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:200;margin:0 auto;" +
      "max-width:620px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:14px 16px;" +
      "background:#fff;border:1px solid #dadce0;border-radius:8px;" +
      "box-shadow:0 1px 3px rgba(60,64,67,.12),0 4px 8px rgba(60,64,67,.06);" +
      "font-size:13px;line-height:1.5;color:#5f6368}" +
      ".ga-consent p{flex:1 1 240px;margin:0}" +
      ".ga-consent a{color:#1a73e8}" +
      ".ga-consent div{display:flex;gap:8px;flex-shrink:0}" +
      ".ga-consent button{font:inherit;font-weight:500;border-radius:4px;padding:7px 14px;" +
      "cursor:pointer;white-space:nowrap}" +
      ".ga-consent .ga-yes{color:#fff;background:#1a73e8;border:1px solid #1a73e8}" +
      ".ga-consent .ga-no{color:#5f6368;background:transparent;border:1px solid #dadce0}";
    document.head.appendChild(style);

    var el = document.createElement("div");
    el.className = "ga-consent";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Analytics consent");
    el.innerHTML =
      "<p>We use Google Analytics to see which parts of this site are read, and set a cookie to " +
      'do it. No advertising and no third-party tracking. <a href="privacy.html">How we handle ' +
      'it</a>.</p><div><button type="button" class="ga-no">No thanks</button>' +
      '<button type="button" class="ga-yes">Allow</button></div>';

    function decide(value) {
      try {
        localStorage.setItem(CONSENT_KEY, value);
      } catch (e) {
        // Storage blocked. The choice holds for this page load and is asked again next time.
      }
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

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          var s = state.get(el);
          if (!s) return;

          s.onScreen = entry.isIntersecting;
          if (entry.isIntersecting) {
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
      // Half the section on screen, so a heading clipping into view does not count as read.
      { threshold: 0.5 },
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
        sections.forEach(resume);
      } else {
        // Reported when the tab is hidden, not only at pagehide. A phone that is locked and never
        // returned to fires no pagehide at all, and that reading would simply be lost.
        flush();
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
  // pages with no sections marked up, which is every legal page.

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
          event("scroll_depth", { percent: mark });
        }
      });
    }

    // passive, because a scroll handler that can call preventDefault blocks scrolling on touch.
    window.addEventListener("scroll", check, { passive: true });
    check();
  }

  // ---- clicks --------------------------------------------------------------------------------
  //
  // One delegated listener rather than a handler per link. The links that matter are spread over
  // four pages and a footer that is pasted into all of them; instrumenting each would guarantee
  // the next one added was forgotten.

  function clicks() {
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a") : null;
        if (!a) return;
        var href = a.getAttribute("href") || "";

        if (href.indexOf("mailto:") === 0) {
          event("mailto_click", { context: document.title.slice(0, 60) });
          return;
        }

        if (!/^https?:/i.test(href)) return;

        var url;
        try {
          url = new URL(href);
        } catch (err) {
          return;
        }

        // A click into the product is the site's whole job, so it is its own event rather than
        // an outbound click to a domain that happens to be ours. `data-cta` names the button;
        // links without one still count, labelled by where they land.
        if (url.origin === APP_ORIGIN) {
          event("cta_click", {
            cta: a.getAttribute("data-cta") || "app_link",
            destination: url.pathname,
          });
          return;
        }

        if (url.origin !== location.origin) {
          event("outbound_click", { domain: url.hostname });
        }
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

  function start() {
    banner();
    attention();
    scrollDepth();
    clicks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
