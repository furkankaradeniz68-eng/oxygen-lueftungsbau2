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

  // ------------------------------------------------------------ mobile nav --
  // Burger toggle for the header, present on every page (worldflight +
  // static subpages) so — like wireScrollTop above — it is wired here,
  // ahead of the worldflight-only early return below, rather than inside
  // the geometry block that bails out on pages with no [data-sc-mode].
  (function wireMobileNav() {
    var burger = document.getElementById('nav-burger');
    var panel = document.getElementById('mobile-nav');
    if (!burger || !panel) return;
    function closeMenu() {
      panel.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Menü öffnen');
    }
    function openMenu() {
      panel.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Menü schließen');
    }
    burger.addEventListener('click', function () {
      if (panel.classList.contains('is-open')) closeMenu(); else openMenu();
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) closeMenu();
    });
  })();

  // ------------------------------------------------- team clip, desktop only --
  // The Team segment's video is a wide group shot; object-fit:cover would crop
  // roughly a third of its width off at phone viewports (the picture/contain
  // CSS note in index.html has the math), cutting people out of frame. Rather
  // than ship a second portrait clip, mobile drops the clip entirely and keeps
  // the always-visible, letterboxed group still — assets.md's licensed "drop
  // the clip on phones" path. This has to run BEFORE ScrollCraft.mount() below
  // sees the segment, since the engine wires up whatever <video> it finds.
  (function stripTeamClipOnMobile() {
    if (!window.matchMedia('(max-width: 860px)').matches) return;
    var seg = document.querySelector('[data-sc-waypoint="Team"]');
    var clip = seg && seg.querySelector('video');
    if (clip) clip.remove();
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
  var spacerEl = flightEl.querySelector('[data-sc-spacer]');

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

  var NODE_KEYS = ['ansaugung', 'kanal', 'geraet', 'verteilung', 'auslass', 'team'];
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
    // the spacer's own bottom edge has scrolled up to the bottom of the
    // viewport, so the real <footer> after #flug can scroll into view. See
    // the CSS note on body.sc-flight-released in index.html for why this is
    // absolute+bottom-anchored rather than inset:0.
    //
    // Measured against live getBoundingClientRect, not a vh-multiplied
    // threshold (y >= top + total*vh): mobile Safari grows window.innerHeight
    // by the address-bar height once it auto-hides mid-scroll, but the
    // engine deliberately freezes the spacer's own pixel height against that
    // same class of resize (scrollcraft.js's "ignore URL-bar-only height
    // changes" guard) so the page does not jump under the reader's thumb. A
    // vh-multiplied threshold computed with the new, larger vh could then
    // exceed what the frozen-height spacer can ever satisfy, so the release
    // condition was never met and the reader hit the real end of the
    // document while the stage was still pinned fixed over it — scrolling
    // further did nothing, which read as the page being stuck right at the
    // closing card. Comparing two live rects instead of a rect to a
    // recomputed vh guarantees they are always measured on the same ruler.
    var released = spacerEl ? spacerEl.getBoundingClientRect().bottom <= vh : y >= top + total * vh;
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
