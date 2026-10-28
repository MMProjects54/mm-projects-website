/* MM Projects — site behaviour (no libraries). */
(function () {
  'use strict';
  var doc = document;

  /* ---------- Mobile menu ---------- */
  var toggle = doc.querySelector('.menu-toggle');
  var menu = doc.getElementById('mobile-menu');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 1140px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ---------- Highlight the current section in the main nav ---------- */
  var navLinks = doc.querySelectorAll('.main-nav a[data-nav]');
  if (doc.body.classList.contains('page-home') && 'IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.dataset.nav] = a; });
    var sectionFor = { top: 'top', services: 'services', projects: 'projects', about: 'about', quote: 'quote', reviews: 'quote', contact: 'contact' };
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var key = sectionFor[entry.target.id];
        if (!byId[key]) return;
        navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        byId[key].setAttribute('aria-current', key === 'top' ? 'page' : 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'services', 'projects', 'about', 'quote', 'reviews'].forEach(function (id) {
      var el = doc.getElementById(id); if (el) observer.observe(el);
    });
  }

  /* ---------- "View All Services" on phones ---------- */
  var showAll = doc.querySelector('[data-show-all-services]');
  if (showAll) {
    showAll.addEventListener('click', function () {
      var section = showAll.closest('.services');
      section.classList.add('is-expanded');
      showAll.setAttribute('aria-expanded', 'true');
      var firstExtra = section.querySelector('.service-card.is-extra a');
      if (firstExtra) firstExtra.focus({ preventScroll: true });
    });
  }

  /* ---------- Before / after sliders ---------- */
  doc.querySelectorAll('[data-ba]').forEach(function (fig) {
    var frame = fig.querySelector('.ba__frame');
    var range = fig.querySelector('.ba__range');
    function update() { frame.style.setProperty('--pos', range.value + '%'); }
    range.addEventListener('input', update);
    update();
  });

  /* ---------- Tally embeds (loaded only when needed) ---------- */
  var TALLY_SRC = 'https://tally.so/widgets/embed.js';
  var tallyRequested = false;
  function loadTally() {
    var run = function () {
      if (typeof window.Tally !== 'undefined') { window.Tally.loadEmbeds(); }
      else {
        doc.querySelectorAll('iframe[data-tally-src]:not([src])').forEach(function (f) { f.src = f.dataset.tallySrc; });
      }
    };
    if (typeof window.Tally !== 'undefined') return run();
    if (tallyRequested) return;
    tallyRequested = true;
    var s = doc.createElement('script');
    s.src = TALLY_SRC; s.async = true; s.onload = run; s.onerror = run;
    doc.body.appendChild(s);
  }
  if (doc.querySelector('iframe[data-tally-src]')) {
    var quote = doc.getElementById('quote');
    if (quote && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { loadTally(); io.disconnect(); }
      }, { rootMargin: '600px 0px' });
      io.observe(quote);
    } else {
      loadTally();
    }
  }

  /* ---------- Dialogs ---------- */
  function openDialog(dialog) {
    if (!dialog || typeof dialog.showModal !== 'function') return false;
    dialog.showModal();
    doc.body.classList.add('has-dialog');
    if (dialog.querySelector('iframe[data-tally-src]')) loadTally();
    return true;
  }
  doc.querySelectorAll('dialog').forEach(function (dialog) {
    dialog.addEventListener('close', function () { doc.body.classList.remove('has-dialog'); });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog && dialog.classList.contains('dialog')) dialog.close(); // click on backdrop
      if (e.target.closest('[data-close-dialog]')) dialog.close();
    });
  });
  doc.querySelectorAll('[data-open-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (openDialog(doc.getElementById(btn.dataset.openDialog))) e.preventDefault();
    });
  });

  /* ---------- Project lightbox ---------- */
  var lightbox = doc.getElementById('lightbox');
  var dataEl = doc.getElementById('gallery-data');
  if (lightbox && dataEl) {
    var items = JSON.parse(dataEl.textContent);
    var img = lightbox.querySelector('img');
    var cap = lightbox.querySelector('figcaption');
    var current = 0;
    var show = function (i) {
      current = (i + items.length) % items.length;
      img.src = items[current].src; img.alt = items[current].alt; cap.textContent = items[current].caption;
    };
    doc.querySelectorAll('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function () { show(Number(btn.dataset.lightbox)); openDialog(lightbox); });
    });
    lightbox.querySelector('[data-lightbox-prev]').addEventListener('click', function () { show(current - 1); });
    lightbox.querySelector('[data-lightbox-next]').addEventListener('click', function () { show(current + 1); });
    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox || e.target.classList.contains('lightbox__figure')) lightbox.close(); });
    if (items.length < 2) lightbox.querySelectorAll('.lightbox__nav').forEach(function (b) { b.hidden = true; });
  }
})();
