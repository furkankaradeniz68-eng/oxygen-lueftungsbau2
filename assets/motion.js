/* ============================================================================
   OXYGEN Lüftungsbau — subpage motion layer
   ----------------------------------------------------------------------------
   Scroll-in reveals for the static subpages. Nothing is added to the markup:
   the script tags the existing components, an IntersectionObserver adds
   .is-in once each one enters the viewport, and assets/motion.css does the
   animating. The hero stills themselves never move; only their copy enters.

   Safety: the <head> snippet only sets html.js-motion when the visitor has
   not asked for reduced motion, and removes it again after 2.5s if this file
   never ran — so content can never stay hidden.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('js-motion')) return;
  window.__oxyMotion = true;

  // ---------------------------------------------------- word-rise headings --
  // Each word of a section heading gets its own mask so the line rises word
  // by word. Nested spans (.text-accent) keep their element, only their text
  // is wrapped, so the red accent survives.
  var wordIndex = 0;
  function wrapWords(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var parts = child.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var outer = document.createElement('span');
          outer.className = 'mw';
          var inner = document.createElement('span');
          inner.className = 'mw__i';
          inner.style.setProperty('--w', wordIndex++);
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        child.parentNode.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        wrapWords(child);
      }
    });
  }
  var heads = document.querySelectorAll('main h1.sc-display, main h2.sc-display');
  Array.prototype.forEach.call(heads, function (h) {
    wordIndex = 0;
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    wrapWords(h);
    Array.prototype.forEach.call(h.querySelectorAll('.mw'), function (w) { w.setAttribute('aria-hidden', 'true'); });
    h.setAttribute('data-m', 'words');
  });

  // ------------------------------------------------------- tag the blocks --
  function tag(selector, kind) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (el) {
      if (!el.hasAttribute('data-m')) el.setAttribute('data-m', kind);
    });
  }
  // staggered groups: the children enter one after another
  var groups = '.benefit-grid, .scope-list, .service-tiles, .steps, .faq, .feature-list, .logo-row, .ref-grid, .urgent__cards, .model-grid, .stats-band__row, .job-list, .contact-list, .apply-steps';
  Array.prototype.forEach.call(document.querySelectorAll('main ' + groups.split(', ').join(', main ')), function (g) {
    g.setAttribute('data-m', 'group');
    // capped so long lists (36 reference cards) don't trail on for seconds
    Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 8)); });
  });
  tag('main .sub-hero .sc-label, main .sub-hero .sc-lede, main .sub-hero__actions', 'hero');
  tag('main .sc-label, main .sc-body, main .sc-lede, main .text-link, main .ref-strip .btn, main .faq-split__head .btn, main .close-cta__text .btn, main .urgent__actions, main .mail-form, main .media-split__media, main .team-banner__card', 'up');

  // hero copy enters on load, in order: label, title words, lede, buttons
  var heroBits = document.querySelectorAll('.sub-hero [data-m]');
  Array.prototype.forEach.call(heroBits, function (el, i) { el.style.setProperty('--h', i); });

  // Once an element has finished entering, .is-done hands it back to its
  // own component styles (hover lifts, zooms) — see motion.css.
  function settle(el) {
    var n = el.getAttribute('data-m') === 'group' ? Math.min(el.children.length, 9) : 1;
    var extra = el.getAttribute('data-m') === 'words' ? el.querySelectorAll('.mw').length * 60 : 0;
    setTimeout(function () { el.classList.add('is-done'); }, 1500 + n * 90 + extra);
  }

  // -------------------------------------------------------------- observe --
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
      settle(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  Array.prototype.forEach.call(document.querySelectorAll('[data-m]'), function (el) {
    if (el.closest('.sub-hero')) return;
    io.observe(el);
  });
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.sub-hero [data-m]'), function (el) { el.classList.add('is-in'); settle(el); });
    });
  });

  // ------------------------------------------------------ scroll progress --
  // Thin red bar along the top edge: how far through the page you are.
  var bar = document.createElement('div');
  bar.className = 'm-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var ticking = false;
  function progress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(progress); }
  }, { passive: true });
  progress();

  // ---------------------------------------------------------- FAQ height --
  // <details> snaps open natively; animate the answer's height instead.
  Array.prototype.forEach.call(document.querySelectorAll('.faq__item'), function (item) {
    var summary = item.querySelector('summary');
    var body = item.querySelector('.faq__a');
    if (!summary || !body || !body.animate) return;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (item.classList.contains('is-animating')) return;
      item.classList.add('is-animating');
      if (item.open) {
        var h = body.offsetHeight;
        body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.4,0,.2,1)' })
          .onfinish = function () { item.open = false; item.classList.remove('is-animating'); };
      } else {
        item.open = true;
        var full = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: full + 'px', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' })
          .onfinish = function () { item.classList.remove('is-animating'); };
      }
    });
  });
})();
