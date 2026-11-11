/* The homepage: the Claude demo on the first page, the sample report it builds, and the side menu
 * of pages. The page itself scrolls the ordinary way — the browser does it, and CSS says where to
 * settle — so nothing here takes over the wheel, the keys or a swipe.
 *
 * Analytics hears about the demo through `roster:demo` events, which analytics.js sends on as
 * `demo_step`: whether people press Send, whether they read the report it builds, and which part
 * of it they open. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tell = (step, extra) => document.dispatchEvent(new CustomEvent('roster:demo', { detail: { step, ...extra } }));
const { mount, S } = window.RosterPaper;

/* ---------- page 1: send the message ---------- */
const heroEl = $('#top'), chat = $('#chat'), sendBtn = $('#send');
const liveEl = $('#live'), rscroll = $('#rscroll'), secBtns = $$('.live-side [data-sec]');
// after Send: the assistant works for 2.9s, the chat sinks quickly into the paper, then the report comes up
// piece by piece over 3.4s and hands over to the live sample report
const hero = mount(heroEl, { outs: [], live: liveEl, once: true, spread: .72, steps: [S('send', 2.9), S('absorb', .3), S('rise', 3.4, 0)] });
let heroState = 'idle', heroTimers = [], runs = 0, explored = false;

function send() {
  if (heroState !== 'idle') return;
  heroState = 'running';
  tell(runs++ ? 'replay' : 'send');
  chat.classList.add('sent');
  // the chat window is what presses into the paper before the report comes up
  hero.lines = [hero.boxOf(chat, 22)];
  hero.restart();
  const at = (ms, f) => heroTimers.push(setTimeout(f, RM ? 0 : ms));
  // the assistant works through its steps, ticking each off, before the chat sinks away
  at(500, () => chat.classList.add('thinking', 'p1'));
  at(1150, () => chat.classList.add('d1', 'p2'));
  at(1800, () => chat.classList.add('d2', 'p3'));
  at(2450, () => chat.classList.add('d3'));
  at(2900, () => chat.classList.add('gone'));
  // the report starts printing as the paper rises, piece by piece; once it's all up it can be clicked
  at(3200, () => heroEl.classList.add('built'));
  at(6650, () => { heroState = 'done'; heroEl.classList.add('done'); tell('report_built'); });
  // "Run it again" waits a minute, so the first thing on offer is the report, not a replay
  at(66650, () => heroEl.classList.add('replayable'));
}

function replay() {
  heroTimers.forEach(clearTimeout); heroTimers = [];
  heroState = 'idle'; explored = false;
  chat.className = 'chat'; heroEl.classList.remove('built', 'done', 'replayable');
  liveEl.classList.remove('explored');
  hero.t0 = null; hero.sig = ''; hero.lines = [];
  rscroll.style.scrollBehavior = 'auto'; rscroll.scrollTop = 0; rscroll.style.scrollBehavior = '';
  markSection();
}

sendBtn.addEventListener('click', send);
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
