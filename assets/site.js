/* ============================================================================
   OXYGEN Lüftungsbau — site script (not part of the scroll-craft engine)
   ----------------------------------------------------------------------------
   Three independent jobs:
     1. WHATSAPP_NUMBER — the one constant every wa.me link on every page
        reads. Change the number here, nowhere else.
     2. The worldflight resize/spacer-zero guard (worldflight.md §7b).
     3. The signature move: the filling strand-drawing rail + the hero's
        kinetic line reveal, both driven by the same scroll read.
   ========================================================================== */
(function () {
  'use strict';

  // ------------------------------------------------------------- WhatsApp --
  // Placeholder until the client supplies their real WhatsApp Business
  // number. German format, no leading zero, no "+", e.g. "4917XXXXXXXX".
  var WHATSAPP_NUMBER = '49XXXXXXXXXX';
  var WHATSAPP_TEXT = 'Hallo OXYGEN Lüftungsbau, ich interessiere mich für ...';

  function wireWhatsApp() {
    var href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(WHATSAPP_TEXT);
    var links = document.querySelectorAll('[data-whatsapp-link]');
    for (var i = 0; i < links.length; i++) links[i].setAttribute('href', href);
  }
  wireWhatsApp();

  // ------------------------------------------------------- scroll-to-top --
  // Footer control, present on every page (worldflight + static subpages),
  // so it is wired here rather than inside the worldflight-only geometry
  // block below, which bails out early on pages with no [data-sc-mode].
  (function wireScrollTop() {
    var btns = document.querySelectorAll('[data-scroll-top]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });
      });
    }
  })();

  // ---------------------------------------------------- resize/font guard --
  // If innerHeight reads 0 at mount (some mobile browsers mid-chrome-resize),
  // the worldflight spacer computes to 0 and the whole flight is unreachable.
  // Re-dispatch resize once the window has fully loaded and once webfonts
  // (here: none, but the hook is free) have settled, so the engine re-reads a
  // real viewport height.
  function relayout() { window.dispatchEvent(new Event('resize')); }
  window.addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(relayout).catch(function () {});
  }

  // ------------------------------------------------------- reduced motion --
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return reduceMQ.matches; }

  // ------------------------------------------------------------ geometry --
  var flightEl = document.querySelector('[data-sc-mode="worldflight"]');
  var railList = document.getElementById('rail-list');
  var heroH1 = document.getElementById('hero-h1');
  if (!flightEl) return;

  // Five rail nodes map 1:1 onto the five flight legs. Read weights straight
  // off the markup rather than hard-coding them again, so the rail can never
  // drift out of sync with the flight it is supposed to describe.
  var segEls = flightEl.querySelectorAll('[data-sc-segment]');
  var weights = [];
  for (var i = 0; i < segEls.length; i++) {
    weights.push(parseFloat(segEls[i].getAttribute('data-sc-w')) || 1.3);
  }
  var total = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
  var cum = [0];
  for (var j = 0; j < weights.length; j++) cum.push(cum[j] + weights[j]);
  // cum = [0, leg1End, leg2End, leg3End, leg4End, leg5End] in vh-weight units

  var NODE_KEYS = ['ansaugung', 'kanal', 'geraet', 'verteilung', 'auslass'];
  var bounds = cum.map(function (v) { return v / total; });

  var nodeEls = {};
  var fillEls = {};
  var btnEls = {};
  var lis = railList ? railList.querySelectorAll('.rail__node') : [];
  for (var n = 0; n < lis.length; n++) {
    var key = lis[n].getAttribute('data-key');
    nodeEls[key] = lis[n];
    var fill = lis[n].querySelector('.rail__line-fill');
    if (fill) fillEls[key] = fill;
    var btn = lis[n].querySelector('.rail__btn');
    if (btn) {
      btnEls[key] = btn;
      btn.addEventListener('click', (function (idx) {
        return function () { jumpTo(idx); };
      })(n));
    }
  }

  var top = 0;
  function measure() {
    var r = flightEl.getBoundingClientRect();
    top = r.top + window.scrollY;
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  function jumpTo(nodeIndex) {
    var frac = bounds[nodeIndex];
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var y = top + frac * total * vh;
    window.scrollTo({ top: y, left: 0, behavior: reduced() ? 'auto' : 'smooth' });
  }

  // -------------------------------------------------- hero kinetic split --
  // The engine's own data-sc-kinetic only wires up inside act cues, not
  // worldflight copy windows, so the hero's line-reveal is reproduced here
  // with the same markup/CSS the engine ships (.sc-split / .sc-split__i),
  // driven by the opacity the engine already writes on #hero-copy every
  // frame — no duplicate window math.
  var heroUnits = null;
  function splitLines(el) {
    if (el.__split) return el.__split;
    var text = el.textContent;
    var words = text.split(/\s+/).filter(Boolean);
    el.textContent = '';
    var probes = words.map(function (w, i) {
      var s = document.createElement('span');
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    var lines = [], cur = null, lastTop = null;
    probes.forEach(function (s) {
      var t = s.offsetTop;
      if (lastTop === null || Math.abs(t - lastTop) > 1) { cur = []; lines.push(cur); lastTop = t; }
      cur.push(s.textContent);
    });
    el.textContent = '';
    var units = [];
    lines.forEach(function (ws, li) {
      var mask = document.createElement('span');
      mask.className = 'sc-split sc-split--line';
      var inner = document.createElement('span');
      inner.className = 'sc-split__i';
      inner.textContent = ws.join(' ');
      mask.appendChild(inner);
      el.appendChild(mask);
      if (li < lines.length - 1) el.appendChild(document.createTextNode(' '));
      units.push(inner);
    });
    el.classList.add('sc-is-split');
    el.__split = units;
    return units;
  }
  function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  if (heroH1 && !reduced()) {
    heroUnits = splitLines(heroH1);
  }
  var heroCopyEl = document.getElementById('hero-copy');

  // --------------------------------------------------------------- frame --
  var raf = null;
  function frame() {
    raf = null;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var y = window.scrollY || window.pageYOffset;
    var t = Math.min(Math.max((y - top) / Math.max(vh, 1), 0), total);
    var pr = t / total;

    // release — flip the pinned stage from fixed to absolute the instant
    // progress first reaches 100% (y >= top + total*vh), so the real
    // <footer> after #flug can scroll into view. See the CSS note on
    // body.sc-flight-released in index.html for why this is absolute+
    // bottom-anchored rather than inset:0.
    var released = y >= top + total * vh;
    document.body.classList.toggle('sc-flight-released', released);

    // rail
    for (var k = 0; k < NODE_KEYS.length; k++) {
      var key = NODE_KEYS[k];
      var from = bounds[k], to = bounds[k + 1];
      var el = nodeEls[key];
      if (!el) continue;
      var isActive = pr >= from && pr < to;
      var isDone = pr >= to;
      el.classList.toggle('is-active', isActive);
      el.classList.toggle('is-done', isDone && !isActive);
      if (btnEls[key]) btnEls[key].setAttribute('aria-current', isActive ? 'step' : 'false');
      if (fillEls[key]) {
        var span = Math.max(to - from, 0.0001);
        var localFill = Math.min(Math.max((pr - from) / span, 0), 1) * 100;
        fillEls[key].style.setProperty('--fill', localFill.toFixed(1) + '%');
      }
    }

    // hero kinetic reveal, piggybacking on the engine's own opacity write
    if (heroUnits && heroCopyEl) {
      var vis = parseFloat(heroCopyEl.style.opacity);
      if (isNaN(vis)) vis = 0;
      var n = heroUnits.length;
      for (var u = 0; u < n; u++) {
        var uStart = (u / Math.max(n, 1)) * 0.62;
        var uv = smooth((vis - uStart) / (1 - 0.62 + 0.001));
        heroUnits[u].style.opacity = uv.toFixed(3);
        heroUnits[u].style.transform = 'translate3d(0,' + ((1 - uv) * 100).toFixed(2) + '%,0)';
      }
    }
  }
  function onScroll() {
    if (raf == null) raf = requestAnimationFrame(frame);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
