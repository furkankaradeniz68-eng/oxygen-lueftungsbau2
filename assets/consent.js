/* ============================================================================
   OXYGEN Lüftungsbau — cookie consent + Google Analytics 4
   ----------------------------------------------------------------------------
   Google Analytics loads only after the visitor has said yes. Before that no
   Google script is requested and no cookie is set (Consent Mode v2, "basic"
   implementation). The choice itself is kept in localStorage, which is
   strictly necessary for remembering it and needs no consent of its own.

   GA_ID empty → the whole layer stays off: no banner, no footer link,
   because without a tracker there is nothing to consent to.
   Every [data-consent-open] element (the footer's "Cookie-Einstellungen")
   reopens the settings, so a yes can be withdrawn as easily as it was given.
   ========================================================================== */
(function () {
  'use strict';
  var GA_ID = '';                         // e.g. 'G-XXXXXXXXXX' from Google Analytics
  var KEY = 'oxy-consent';
  var VERSION = 1;                        // bump when the services change → asks again
  var MAX_AGE = 365 * 24 * 3600 * 1000;   // ask again after twelve months

  if (!GA_ID) return;

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      if (c && c.v === VERSION && Date.now() - c.ts < MAX_AGE) return c;
    } catch (e) {}
    return null;
  }
  function save(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ts: Date.now(), analytics: !!analytics })); } catch (e) {}
  }

  // ------------------------------------------------------------- analytics --
  var loaded = false;
  function loadAnalytics() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }
  // Withdrawing consent: tell gtag, delete its cookies on every domain level
  // they may sit on, then reload so the script is gone from the page too.
  function revokeAnalytics() {
    if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
    var host = location.hostname.split('.');
    var domains = [''];
    for (var i = 0; i < host.length - 1; i++) domains.push('; domain=.' + host.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^_ga/.test(name)) return;
      domains.forEach(function (d) { document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d; });
    });
    if (loaded) location.reload();
  }

  // ----------------------------------------------------------------- banner --
  var css = '' +
    '.cc{position:fixed;z-index:90;left:clamp(.75rem,3vw,1.5rem);bottom:clamp(.75rem,3vw,1.5rem);max-width:30rem;' +
      'background:#fff;color:#141414;border:1px solid rgba(20,20,20,.12);border-radius:14px;' +
      'box-shadow:0 18px 50px rgba(0,0,0,.22);padding:1.25rem 1.25rem 1.1rem;font:inherit;font-size:.92rem;line-height:1.55}' +
    '.cc[hidden]{display:none}' +
    '.cc h2{font-size:1rem;margin:0 0 .4rem;font-weight:700;letter-spacing:0;text-transform:none}' +
    '.cc p{margin:0 0 .9rem;color:#4a4a49}' +
    '.cc a{color:#cf2f25;text-decoration:underline}' +
    '.cc__row{display:flex;flex-wrap:wrap;gap:.5rem}' +
    '.cc__btn{flex:1 1 9rem;font:inherit;font-weight:600;font-size:.88rem;padding:.7rem 1rem;border-radius:999px;cursor:pointer;' +
      'border:1.5px solid #141414;background:#141414;color:#fff}' +
    '.cc__btn:hover,.cc__btn:focus-visible{background:#cf2f25;border-color:#cf2f25}' +
    '.cc__link{flex:1 1 100%;background:none;border:0;padding:.35rem 0 0;font:inherit;font-size:.85rem;color:#585857;text-decoration:underline;cursor:pointer}' +
    '.cc__opts{margin:0 0 .9rem;padding:0;list-style:none;border-top:1px solid rgba(20,20,20,.1)}' +
    '.cc__opts li{display:flex;gap:.75rem;align-items:flex-start;padding:.7rem 0;border-bottom:1px solid rgba(20,20,20,.1)}' +
    '.cc__opts input{margin-top:.25rem;width:1.1rem;height:1.1rem;accent-color:#cf2f25;flex:none}' +
    '.cc__opts strong{display:block}' +
    '.cc__opts span{color:#585857;font-size:.85rem}' +
    '[data-consent-open]{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left}' +
    '@media (max-width:560px){.cc{left:.75rem;right:.75rem;max-width:none}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var box = document.createElement('section');
  box.className = 'cc';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-labelledby', 'cc-title');
  box.hidden = true;
  box.innerHTML =
    '<h2 id="cc-title">Cookies &amp; Statistik</h2>' +
    '<p>Wir möchten mit Google Analytics verstehen, wie unsere Website genutzt wird, um sie zu verbessern. ' +
      'Dafür setzen wir Cookies – aber nur mit Ihrer Einwilligung. Sie können sie jederzeit über „Cookie-Einstellungen“ im Footer widerrufen. ' +
      'Mehr dazu in der <a href="/datenschutz">Datenschutzerklärung</a>.</p>' +
    '<ul class="cc__opts" hidden>' +
      '<li><input type="checkbox" checked disabled id="cc-need"><label for="cc-need"><strong>Notwendig</strong><span>Speichert Ihre Auswahl. Immer aktiv.</span></label></li>' +
      '<li><input type="checkbox" id="cc-stats"><label for="cc-stats"><strong>Statistik</strong><span>Google Analytics: pseudonyme Auswertung der Seitenaufrufe.</span></label></li>' +
    '</ul>' +
    '<div class="cc__row">' +
      '<button type="button" class="cc__btn" data-cc="deny">Nur notwendige</button>' +
      '<button type="button" class="cc__btn" data-cc="accept">Alle akzeptieren</button>' +
      '<button type="button" class="cc__btn" data-cc="save" hidden>Auswahl speichern</button>' +
      '<button type="button" class="cc__link" data-cc="settings">Einstellungen</button>' +
    '</div>';

  var opts = box.querySelector('.cc__opts');
  var stats = box.querySelector('#cc-stats');
  var saveBtn = box.querySelector('[data-cc="save"]');
  var settingsBtn = box.querySelector('[data-cc="settings"]');

  function open(withSettings) {
    var c = read();
    stats.checked = !!(c && c.analytics);
    opts.hidden = !withSettings;
    saveBtn.hidden = !withSettings;
    settingsBtn.hidden = !!withSettings;
    box.hidden = false;
  }
  function decide(analytics) {
    var before = read();
    save(analytics);
    box.hidden = true;
    if (analytics) loadAnalytics();
    else if (before && before.analytics) revokeAnalytics();
  }

  box.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cc]');
    if (!b) return;
    var a = b.getAttribute('data-cc');
    if (a === 'accept') decide(true);
    else if (a === 'deny') decide(false);
    else if (a === 'save') decide(stats.checked);
    else if (a === 'settings') open(true);
  });

  function init() {
    document.body.appendChild(box);
    Array.prototype.forEach.call(document.querySelectorAll('[data-consent-open]'), function (el) {
      el.hidden = false;
      el.addEventListener('click', function () { open(true); box.querySelector('button').focus(); });
    });
    var c = read();
    if (!c) open(false);
    else if (c.analytics) loadAnalytics();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
