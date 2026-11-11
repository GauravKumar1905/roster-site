/* Behaviour every page shares: the menu bar's edge once the page has scrolled, and the sign-up
 * prompts that wait for their moment — the bar along the bottom of a phone screen, and the card in
 * a guide's margin on a wide one.
 *
 * A page says when its prompts may appear with `data-prompt-after` on <body>: how far down the
 * page the reader has to be, as a fraction (0 means straight away). Anything marked
 * `data-prompt-hide` — a first screen with its own button, a pricing card, a closing call to
 * action, the footer — hides them while it is on screen, because a button is already in view and
 * a second one beside it is noise. */
(function () {
  var nav = document.querySelector(".nav");
  var body = document.body;
  var after = parseFloat(body.getAttribute("data-prompt-after"));
  var prompts = document.querySelectorAll(".mbar, .cta-rail");
  var hiding = new Set();
  var eligible = false;
  // Until the observer has said what is on screen, assume a button already is: otherwise the bar
  // slides in on load and straight back out.
  var known = !("IntersectionObserver" in window);

  function update() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle("scrolled", y > 8);
    if (!prompts.length || isNaN(after)) return;

    // Once a reader has come far enough, the prompt stays theirs to see, even scrolling back up.
    if (!eligible) {
      var room = document.documentElement.scrollHeight - window.innerHeight;
      eligible = after <= 0 || (room > 0 && y / room >= after);
    }
    var on = known && eligible && hiding.size === 0;
    prompts.forEach(function (p) {
      p.classList.toggle("on", on);
    });
    body.classList.toggle("prompt-on", on);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) hiding.add(e.target);
          else hiding.delete(e.target);
        });
        known = true;
        update();
      },
      // A sliver of the first screen left at the top of a phone shouldn't keep the bar away.
      { rootMargin: "-12% 0px -12% 0px" },
    );
    var hiders = document.querySelectorAll("[data-prompt-hide]");
    if (!hiders.length) known = true;
    hiders.forEach(function (el) {
      io.observe(el);
    });
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
