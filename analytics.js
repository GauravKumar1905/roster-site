// Google Analytics 4 behind Consent Mode v2.
//
// Consent defaults to denied and gtag.js is not fetched at all until someone accepts, so a
// visitor who ignores the banner is never measured. That is what the privacy policy promises,
// and loading the tag first and asking afterwards would make it untrue.

(function () {
  var MEASUREMENT_ID = "G-REPLACE_ME"; // GA4 property for the marketing site
  var STORE_KEY = "roster.consent.analytics";

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
    wait_for_update: 500,
  });

  function stored() {
    try {
      return localStorage.getItem(STORE_KEY);
    } catch (e) {
      // Private browsing and blocked site data both throw here. No stored choice means the
      // banner shows again, which is the safe direction to fail.
      return null;
    }
  }

  function remember(value) {
    try {
      localStorage.setItem(STORE_KEY, value);
    } catch (e) {
      /* choice lasts for this page view only */
    }
  }

  var loaded = false;
  function load() {
    if (loaded) return;
    loaded = true;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    document.head.appendChild(s);

    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
  }

  function accept() {
    remember("granted");
    gtag("consent", "update", { analytics_storage: "granted" });
    load();
  }

  function decline() {
    remember("denied");
  }

  function banner() {
    var bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Analytics cookies");
    bar.innerHTML =
      '<p class="consent-text">We would like to measure which pages people find useful. ' +
      'Analytics only runs if you say yes. <a href="privacy.html">What we collect</a>.</p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-no">No thanks</button>' +
      '<button type="button" class="consent-yes">Allow</button>' +
      "</div>";

    bar.querySelector(".consent-yes").addEventListener("click", function () {
      accept();
      bar.remove();
    });
    bar.querySelector(".consent-no").addEventListener("click", function () {
      decline();
      bar.remove();
    });

    document.body.appendChild(bar);
  }

  var choice = stored();
  if (choice === "granted") {
    gtag("consent", "update", { analytics_storage: "granted" });
    load();
  } else if (choice !== "denied") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", banner);
    } else {
      banner();
    }
  }
})();
