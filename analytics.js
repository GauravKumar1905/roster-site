// Google Analytics in permanently cookieless mode, plus section-level attention.
//
// analytics_storage is denied and never granted. That is the configuration, not a placeholder
// for a consent prompt: with storage denied gtag writes no _ga cookie and keeps no persistent
// identifier, so GA receives counts of what happened without anything identifying who did it.
// There is no cookie banner because there is no cookie to ask about.
//
// The trade shows up when reading reports. Page views, events and engagement are accurate;
// "users" and "returning users" are not, because nothing links one visit to the next.

(function () {
  var MEASUREMENT_ID = "G-JW8Y77HM3M";
  if (MEASUREMENT_ID.indexOf("REPLACE") !== -1) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });

  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID, { anonymize_ip: true });

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(s);

  // ---- attention -----------------------------------------------------------------
  //
  // Which parts of the page hold people, rather than merely which were scrolled past. A section
  // counts as read only while it is both on screen and in a visible tab, so a page left open in
  // a background tab does not register as an hour of rapt attention.

  function start() {
    var sections = document.querySelectorAll("[data-track]");
    if (!sections.length) return;

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
              gtag("event", "section_view", { section: el.getAttribute("data-track") });
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

    document.addEventListener("visibilitychange", function () {
      sections.forEach(function (el) {
        if (document.visibilityState === "visible") resume(el);
        else bank(el);
      });
    });

    // One event per section on the way out, rather than a stream of updates while reading.
    window.addEventListener("pagehide", function () {
      sections.forEach(function (el) {
        bank(el);
        var s = state.get(el);
        var seconds = Math.round(s.ms / 1000);
        if (seconds > 0) {
          gtag("event", "section_time", {
            section: el.getAttribute("data-track"),
            seconds: seconds,
          });
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
