/* The homepage: the dashboard demo on the first page, the sample report it builds, and the side
 * menu of pages. The page itself scrolls the ordinary way — the browser does it, and CSS says where
 * to settle — so nothing here takes over the wheel, the keys or a swipe.
 *
 * Analytics hears about the demo through `roster:demo` events, which analytics.js sends on as
 * `demo_step`: whether people press Build it (still named `send`, so the history carries on from
 * the demo before it), whether they read the report it builds, and which part of it they open. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tell = (step, extra) => document.dispatchEvent(new CustomEvent('roster:demo', { detail: { step, ...extra } }));
const { mount, S } = window.RosterPaper;

/* ---------- page 1: build the report ---------- */
const heroEl = $('#top'), dash = $('#dash'), buildBtn = $('#build');
const state = $('#bstate'), steps = $$('.bsteps li'), approve = $('.approve');
const liveEl = $('#live'), rscroll = $('#rscroll'), secBtns = $$('.live-side [data-sec]');
// after Build it: Roster works through its steps for 4.2s, the dashboard sinks quickly into the
// paper, then the report comes up piece by piece over 3.4s and hands over to the live sample report
const hero = mount(heroEl, { outs: [], live: liveEl, once: true, spread: .72, steps: [S('send', 4.2), S('absorb', .3), S('rise', 3.4, 0)] });
let heroState = 'idle', heroTimers = [], runs = 0, explored = false;
const SAY = { start: 'Roster is starting on it…', work: 'Roster is working on it…', check: 'Ready for you to check', done: 'Your report is ready.' };

// a step is working (now), waiting for a yes (wait) or settled (done)
function mark(i, cls) {
  steps[i].classList.remove('now', 'wait');
  steps[i].classList.add(cls);
}

function send() {
  if (heroState !== 'idle') return;
  heroState = 'running';
  tell(runs++ ? 'replay' : 'send');
  dash.classList.add('sent');
  // the dashboard is what presses into the paper before the report comes up
  hero.lines = [hero.boxOf(dash, 22)];
  hero.restart();
  const at = (ms, f) => heroTimers.push(setTimeout(f, RM ? 0 : ms));
  // Roster works out how to build it, then waits for a yes on the pages
  at(350, () => { state.textContent = SAY.work; mark(0, 'now'); });
  at(900, () => { state.textContent = SAY.check; mark(0, 'done'); mark(1, 'wait'); });
  at(1600, () => approve.classList.add('pressed'));
  // then it builds each page in turn, ticking each off with a line on what's in it
  at(1850, () => { state.textContent = SAY.work; mark(1, 'done'); mark(2, 'now'); });
  [2250, 2600, 2950, 3300].forEach((ms, k) => at(ms, () => { mark(k + 2, 'done'); mark(k + 3, 'now'); }));
  at(3650, () => { state.textContent = SAY.done; mark(6, 'done'); });
  at(4200, () => dash.classList.add('gone'));
  // the report starts printing as the paper rises, piece by piece; once it's all up it can be clicked
  at(4500, () => heroEl.classList.add('built'));
  at(7950, () => { heroState = 'done'; heroEl.classList.add('done'); tell('report_built'); });
  // "Run it again" waits a minute, so the first thing on offer is the report, not a replay
  at(67950, () => heroEl.classList.add('replayable'));
}

function replay() {
  heroTimers.forEach(clearTimeout); heroTimers = [];
  heroState = 'idle'; explored = false;
  dash.className = 'dash'; heroEl.classList.remove('built', 'done', 'replayable');
  steps.forEach(li => { li.className = ''; });
  approve.classList.remove('pressed');
  state.textContent = SAY.start;
  liveEl.classList.remove('explored');
  hero.t0 = null; hero.sig = ''; hero.lines = [];
  rscroll.style.scrollBehavior = 'auto'; rscroll.scrollTop = 0; rscroll.style.scrollBehavior = '';
  markSection();
}

buildBtn.addEventListener('click', send);
$('[data-replay]').addEventListener('click', replay);

/* ---------- the sample report: section menu and scroll position ---------- */
// the pulse on the menu goes once someone clicks into the report or scrolls it
function explore() {
  if (heroState !== 'done' || explored) return;
  explored = true; liveEl.classList.add('explored');
  tell('report_explored');
}
liveEl.addEventListener('pointerdown', explore);
rscroll.addEventListener('wheel', explore, { passive: true });
rscroll.addEventListener('touchstart', explore, { passive: true });

function markSection() {
  const top = rscroll.scrollTop + 60;
  let on = secBtns[0];
  // the last section whose top has passed; at the very bottom, the last one
  for (const b of secBtns) if ($('#' + b.dataset.sec).offsetTop <= top) on = b;
  if (rscroll.scrollTop + rscroll.clientHeight >= rscroll.scrollHeight - 2) on = secBtns[secBtns.length - 1];
  secBtns.forEach(b => b.classList.toggle('on', b === on));
}
rscroll.addEventListener('scroll', markSection, { passive: true });
secBtns.forEach(b => b.addEventListener('click', () => {
  rscroll.scrollTo({ top: $('#' + b.dataset.sec).offsetTop - 16, behavior: RM ? 'auto' : 'smooth' });
  tell('report_section', { section: b.dataset.sec.replace(/^r-/, '') });
}));

/* ---------- the side menu of pages ---------- */
// a page counts as current while it crosses the middle of the screen
const dots = new Map($$('.dots a').map(a => [a.getAttribute('href').slice(1), a]));
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      dots.forEach((a, id) => a.classList.toggle('on', id === e.target.id));
    }
  }, { rootMargin: '-50% 0px -50% 0px' });
  dots.forEach((a, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
}
})();
