/* MM Projects Design Studio: one engine for every studio.
   Reads the studio's steps from #studio-config and draws them: option cards with
   pictures, a progress bar, Back / Continue, questions that appear only when they
   apply, progress saved on this device, and a review page. No prices are worked
   out here, and nothing is sent until the customer presses Send on the last step. */
(function () {
  'use strict';
  var root = document.getElementById('studio');
  var cfgEl = document.getElementById('studio-config');
  if (!root || !cfgEl) return;
  var cfg = JSON.parse(cfgEl.textContent);
  var ICON = cfg.icons || {};
  var PREVIEW = root.getAttribute('data-preview') === '1';
  var KEY = 'mm-design-studio:' + cfg.id;
  var VERSION = 1;

  var main = document.getElementById('studio-main');
  var nav = document.getElementById('studio-nav');
  var prevBtn = document.getElementById('studio-prev');
  var nextBtn = document.getElementById('studio-next');
  var hint = document.getElementById('studio-hint');
  var count = document.getElementById('studio-count');
  var bar = document.getElementById('studio-bar');

  // ---------------------------------------------------------------- state
  var state = { v: VERSION, answers: {}, details: {}, step: 0, started: Date.now() };
  var resumed = null;
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.v === VERSION && saved.answers && Object.keys(saved.answers).length) resumed = saved;
  } catch (e) { /* storage blocked: the studio still works, it just won't remember */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function clearSaved() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- helpers
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(name, size) { var p = ICON[name]; return p ? '<svg class="icon" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="' + p + '"/></svg>' : ''; }
  function asList(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
  /** A rule like {"q": "bath_shower", "in": [...]} or {"q": ..., "notIn": [...]}. */
  function passes(rule) {
    if (!rule) return true;
    var given = asList(state.answers[rule.q]);
    if (!given.length) return false;
    if (rule.in) return given.some(function (x) { return rule.in.indexOf(x) !== -1; });
    if (rule.notIn) return given.every(function (x) { return rule.notIn.indexOf(x) === -1; });
    return true;
  }
  function questionsOf(step) {
    return (step.questions || []).filter(function (q) { return passes(q.showIf); }).map(function (q) {
      return { q: q, options: q.options.filter(function (o) { return passes(o.showIf); }) };
    }).filter(function (x) { return x.options.length; });
  }
  function steps() { return cfg.steps.filter(function (s) { return passes(s.showIf) && (s.review || questionsOf(s).length); }); }
  function answered(q) { return asList(state.answers[q.id]).length > 0; }
  function stepComplete(step) { return questionsOf(step).every(function (x) { return !x.q.required || answered(x.q); }); }
  function labelFor(q, id) { for (var i = 0; i < q.options.length; i++) if (q.options[i].id === id) return q.options[i].label; return id; }

  /** Answers that still apply (hidden questions and options are left out). */
  function currentAnswers() {
    var out = [];
    steps().forEach(function (s, si) {
      if (s.review) return;
      var items = [];
      questionsOf(s).forEach(function (x) {
        var ids = asList(state.answers[x.q.id]).filter(function (id) { return x.options.some(function (o) { return o.id === id; }); });
        if (ids.length) items.push({ question: x.q.label, qid: x.q.id, ids: ids, labels: ids.map(function (id) { return labelFor(x.q, id); }) });
      });
      out.push({ index: si, step: s.title, id: s.id, items: items });
    });
    return out;
  }

  // ---------------------------------------------------------------- drawing
  var returnToReview = false;

  function card(q, o, selected) {
    var multi = q.type === 'multi';
    var pic = o.img
      ? '<picture>' + (o.webp ? '<source srcset="' + h(o.webp) + '" type="image/webp">' : '') +
        '<img src="' + h(o.img) + '" alt=""' + (o.w ? ' width="' + o.w + '" height="' + o.h + '"' : '') + ' loading="lazy" decoding="async"></picture>'
      : '<span class="opt__missing">' + svg('image', 28) + '<span>' + (PREVIEW ? 'Image to come' : '') + '</span></span>';
    return '<button type="button" class="opt' + (selected ? ' is-selected' : '') + '" role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="' + selected + '" data-q="' + h(q.id) + '" data-o="' + h(o.id) + '">' +
      '<span class="opt__img">' + pic + '<span class="opt__tick">' + svg('check', 18) + '</span></span>' +
      '<span class="opt__text"><span class="opt__label">' + h(o.label) + '</span>' + (o.desc ? '<span class="opt__desc">' + h(o.desc) + '</span>' : '') + '</span>' +
      '</button>';
  }

  function drawStep(dir) {
    var list = steps();
    if (state.step >= list.length) state.step = list.length - 1;
    if (state.step < 0) state.step = 0;
    var step = list[state.step];
    var n = state.step + 1;
    count.textContent = 'Step ' + n + ' of ' + list.length;
    bar.style.width = Math.round((n / list.length) * 100) + '%';
    var html = '<div class="studio-step' + (dir ? ' studio-step--in-' + dir : '') + '">' +
      '<header class="studio-step__head"><p class="studio-step__kicker">Step ' + n + ' of ' + list.length + '</p>' +
      '<h1 class="studio-step__title" tabindex="-1">' + h(step.title) + '</h1>' + (step.intro ? '<p class="studio-step__intro">' + h(step.intro) + '</p>' : '') + '</header>';
    if (step.review) html += reviewHtml();
    else {
      questionsOf(step).forEach(function (x) {
        var picked = asList(state.answers[x.q.id]);
        html += '<section class="studio-q" aria-labelledby="q-' + h(x.q.id) + '">' +
          '<div class="studio-q__head"><h2 class="studio-q__label" id="q-' + h(x.q.id) + '">' + h(x.q.label) + '</h2>' +
          '<span class="studio-q__hint">' + h(x.q.hint || (x.q.type === 'multi' ? 'Choose any' : 'Choose one')) + '</span></div>' +
          '<div class="studio-q__grid" role="' + (x.q.type === 'multi' ? 'group' : 'radiogroup') + '" aria-labelledby="q-' + h(x.q.id) + '">' +
          x.options.map(function (o) { return card(x.q, o, picked.indexOf(o.id) !== -1); }).join('') +
          '</div></section>';
      });
    }
    html += '</div>';
    main.innerHTML = html;
    nav.hidden = false;
    prevBtn.disabled = state.step === 0;
    prevBtn.style.visibility = state.step === 0 ? 'hidden' : '';
    nextBtn.hidden = !!step.review;
    if (step.review) wireReview();
    updateNext();
    if (dir) {
      var t = main.querySelector('.studio-step__title');
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (t) t.focus({ preventScroll: true });
    }
    var hash = '#' + step.id;
    if (location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash);
  }

  function updateNext() {
    var step = steps()[state.step];
    if (!step || step.review) { hint.textContent = ''; return; }
    var ok = stepComplete(step);
    nextBtn.setAttribute('aria-disabled', String(!ok));
    nextBtn.classList.toggle('is-waiting', !ok);
    nextBtn.querySelector('span').textContent = returnToReview && ok ? 'Back to summary' : 'Continue';
    var missing = questionsOf(step).filter(function (x) { return x.q.required && !answered(x.q); });
    hint.textContent = ok ? '' : (missing.length > 1 ? 'Choose an option for each question' : 'Choose ' + (missing[0] ? missing[0].q.label.toLowerCase() : 'an option') + ' to continue');
  }

  function go(to, dir) {
    var list = steps();
    state.step = Math.max(0, Math.min(list.length - 1, to));
    save();
    drawStep(dir);
  }

  // ---------------------------------------------------------------- choosing
  main.addEventListener('click', function (e) {
    var b = e.target.closest('.opt');
    if (!b) return;
    var qid = b.getAttribute('data-q'); var oid = b.getAttribute('data-o');
    var step = steps()[state.step];
    var x = questionsOf(step).filter(function (y) { return y.q.id === qid; })[0];
    if (!x) return;
    if (x.q.type === 'multi') {
      var cur = asList(state.answers[qid]).slice();
      var i = cur.indexOf(oid);
      if (i === -1) cur.push(oid); else cur.splice(i, 1);
      state.answers[qid] = cur;
    } else {
      state.answers[qid] = oid;
    }
    save();
    // Questions may appear or disappear with this answer, so redraw the step in place.
    var y = window.scrollY;
    drawStep(null);
    window.scrollTo(0, y);
    var again = main.querySelector('.opt[data-q="' + qid + '"][data-o="' + oid + '"]');
    if (again) again.focus({ preventScroll: true });
  });

  // Arrow keys move between options in a single-choice group
  main.addEventListener('keydown', function (e) {
    var b = e.target.closest('.opt[role="radio"]');
    if (!b || ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(e.key) === -1) return;
    var all = Array.prototype.slice.call(b.parentNode.querySelectorAll('.opt'));
    var i = all.indexOf(b) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    if (all[i]) { e.preventDefault(); all[i].focus(); }
  });

  nextBtn.addEventListener('click', function () {
    var step = steps()[state.step];
    if (!stepComplete(step)) {
      var first = questionsOf(step).filter(function (x) { return x.q.required && !answered(x.q); })[0];
      var el = first && document.getElementById('q-' + first.q.id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.closest('.studio-q').classList.add('is-flagged'); setTimeout(function () { el.closest('.studio-q') && el.closest('.studio-q').classList.remove('is-flagged'); }, 1200); }
      return;
    }
    if (returnToReview) { returnToReview = false; go(steps().length - 1, 'fwd'); return; }
    go(state.step + 1, 'fwd');
  });
  prevBtn.addEventListener('click', function () { returnToReview = false; go(state.step - 1, 'back'); });

  // ---------------------------------------------------------------- review and details
  function reviewHtml() {
    var groups = currentAnswers();
    var d = state.details;
    var opts = function (list, val) { return '<option value="">Choose…</option>' + list.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + h(x) + '</option>'; }).join(''); };
    return '<div class="studio-review">' +
      '<section class="studio-summary" aria-label="Your design"><h2 class="studio-summary__title">Your ' + h(cfg.short.toLowerCase()) + ' design</h2>' +
      groups.map(function (g) {
        return '<div class="studio-summary__group"><div class="studio-summary__head"><h3>' + h(g.step) + '</h3>' +
          '<button type="button" class="link-btn" data-edit="' + g.index + '">' + svg('pencil', 16) + 'Change</button></div>' +
          (g.items.length ? '<dl>' + g.items.map(function (it) { return '<div><dt>' + h(it.question) + '</dt><dd>' + h(it.labels.join(', ')) + '</dd></div>'; }).join('') + '</dl>' : '<p class="studio-summary__none">Nothing chosen</p>') +
          '</div>';
      }).join('') + '</section>' +
      '<form class="studio-form card" id="studio-form" novalidate>' +
      '<h2 class="studio-form__title">Your project</h2>' +
      '<div class="studio-form__grid">' +
      field('notes', 'Tell us about your project', '<textarea id="sf-notes" name="notes" rows="4" maxlength="3000" placeholder="Room size, anything you\'d like to keep, access, timings…">' + h(d.notes) + '</textarea>', true) +
      field('budget', 'Budget', '<select id="sf-budget" name="budget">' + opts(cfg.budgets, d.budget) + '</select>') +
      field('timeframe', 'When would you like to start?', '<select id="sf-timeframe" name="timeframe">' + opts(cfg.timeframes, d.timeframe) + '</select>') +
      field('postcode', 'Project postcode', '<input id="sf-postcode" name="postcode" autocomplete="postal-code" maxlength="10" value="' + h(d.postcode) + '">') +
      '<div class="studio-form__field studio-form__field--wide"><span class="studio-form__label">Photos of the room <span class="muted">(optional, up to 8)</span></span>' +
      '<label class="studio-upload" for="sf-photos">' + svg('upload', 22) + '<span><strong>Add photos</strong><small>JPG, PNG or HEIC, up to 10 MB each</small></span></label>' +
      '<input id="sf-photos" name="photos" type="file" accept="image/*" multiple hidden><ul class="studio-thumbs" id="sf-thumbs" role="list"></ul></div>' +
      '</div>' +
      '<h2 class="studio-form__title">Your details</h2>' +
      '<div class="studio-form__grid">' +
      field('name', 'Your name', '<input id="sf-name" name="name" autocomplete="name" maxlength="120" value="' + h(d.name) + '">') +
      field('phone', 'Phone', '<input id="sf-phone" name="phone" type="tel" autocomplete="tel" maxlength="40" value="' + h(d.phone) + '">') +
      field('email', 'Email', '<input id="sf-email" name="email" type="email" autocomplete="email" maxlength="254" value="' + h(d.email) + '">', true) +
      '</div>' +
      '<div class="studio-hp" aria-hidden="true"><label>Leave this empty <input name="company" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="studio-consent"><input type="checkbox" name="consent" id="sf-consent"' + (d.consent ? ' checked' : '') + '><span>I agree to MM Projects using these details and photos to respond to my enquiry, as described in the <a href="privacy.html" target="_blank">privacy notice</a>.</span></label>' +
      '<p class="studio-form__msg" id="sf-msg" role="alert" hidden></p>' +
      '<div class="studio-form__actions"><button type="submit" class="btn btn--primary studio-form__send">Send my design' + svg('arrowRight', 18) + '</button></div>' +
      '<p class="studio-form__note">We\'ll review your design and contact you to talk it through and arrange a visit. No prices are fixed until we\'ve seen the space.</p>' +
      '</form>' +
      '<p class="studio-credit">' + h(cfg.imageCredit) + ' <button type="button" class="link-btn" id="studio-reset">Start again</button></p>' +
      '</div>';
  }
  function field(name, label, control, wide) { return '<div class="studio-form__field' + (wide ? ' studio-form__field--wide' : '') + '"><label class="studio-form__label" for="sf-' + name + '">' + h(label) + '</label>' + control + '</div>'; }

  var photos = [];   // File objects; kept in memory only
  function drawThumbs() {
    var ul = document.getElementById('sf-thumbs'); if (!ul) return;
    ul.innerHTML = photos.map(function (f, i) { return '<li><img alt="" src="' + URL.createObjectURL(f) + '"><button type="button" aria-label="Remove photo" data-rm="' + i + '">' + svg('close', 14) + '</button></li>'; }).join('');
  }

  function wireReview() {
    main.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { returnToReview = true; go(Number(b.getAttribute('data-edit')), 'back'); });
    });
    var f = document.getElementById('studio-form');
    var msg = document.getElementById('sf-msg');
    f.addEventListener('input', function (e) {
      var el = e.target; if (!el.name || el.name === 'photos' || el.name === 'company') return;
      state.details[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      el.classList.remove('invalid');
      save();
    });
    var input = document.getElementById('sf-photos');
    input.addEventListener('change', function () {
      Array.prototype.forEach.call(input.files, function (file) {
        if (photos.length >= 8) return;
        if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) return;
        if (file.size > 10 * 1024 * 1024) { showMsg(file.name + ' is over 10 MB, so it was left out.'); return; }
        photos.push(file);
      });
      input.value = ''; drawThumbs();
    });
    document.getElementById('sf-thumbs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rm]'); if (!b) return;
      photos.splice(Number(b.getAttribute('data-rm')), 1); drawThumbs();
    });
    drawThumbs();
    document.getElementById('studio-reset').addEventListener('click', function () {
      if (!window.confirm('Start again? Your choices on this device will be cleared.')) return;
      clearSaved(); state = { v: VERSION, answers: {}, details: {}, step: 0, started: Date.now() }; photos = []; go(0, 'back');
    });
    function showMsg(t) { msg.textContent = t; msg.hidden = !t; }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = state.details;
      var need = [];
      if (!(d.name || '').trim()) need.push(['name', 'your name']);
      var email = (d.email || '').trim(); var phone = (d.phone || '').replace(/[^\d+]/g, '');
      if (!email && phone.length < 10) need.push(['phone', 'a phone number or email']);
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) need.push(['email', 'a valid email address']);
      if (!(d.postcode || '').trim()) need.push(['postcode', 'the project postcode']);
      if (!d.consent) need.push(['consent', 'your agreement to the privacy notice']);
      f.querySelectorAll('.invalid').forEach(function (x) { x.classList.remove('invalid'); });
      if (need.length) {
        need.forEach(function (n) { var el = document.getElementById('sf-' + n[0]); if (el) el.classList.add('invalid'); });
        showMsg('Please add ' + need.map(function (n) { return n[1]; }).join(', ') + '.');
        var first = document.getElementById('sf-' + need[0][0]); if (first) first.focus();
        return;
      }
      if (PREVIEW || !window.MMStudioSubmit) {
        showMsg('');
        main.querySelector('.studio-form__actions').insertAdjacentHTML('beforebegin', '<p class="studio-preview-note" role="status">' + svg('check', 18) + '<span>Preview: in the live studio this sends your design, details and photos to MM Projects. Nothing has been sent.</span></p>');
        return;
      }
      window.MMStudioSubmit({ studio: cfg.id, answers: currentAnswers(), details: d, photos: photos, started: state.started, form: f });
    });
  }

  // ---------------------------------------------------------------- start
  function startFresh() { drawStep(null); }
  window.addEventListener('popstate', function () {
    var id = location.hash.slice(1);
    var list = steps();
    for (var i = 0; i < list.length; i++) if (list[i].id === id && i !== state.step) { state.step = i; drawStep('back'); return; }
  });
  if (resumed) {
    var done = Object.keys(resumed.answers).length;
    main.innerHTML = '<div class="studio-resume card"><h1 class="studio-step__title">Welcome back</h1>' +
      '<p>You\'ve already made ' + done + ' choice' + (done === 1 ? '' : 's') + ' for your ' + h(cfg.short.toLowerCase()) + '. Pick up where you left off?</p>' +
      '<div class="studio-resume__actions"><button type="button" class="btn btn--primary" id="studio-resume">Continue my design' + svg('arrowRight', 18) + '</button>' +
      '<button type="button" class="btn btn--outline" id="studio-fresh">Start again</button></div></div>';
    count.textContent = '';
    document.getElementById('studio-resume').addEventListener('click', function () { state = resumed; state.details = state.details || {}; startFresh(); });
    document.getElementById('studio-fresh').addEventListener('click', function () { clearSaved(); startFresh(); });
  } else {
    startFresh();
  }
})();
