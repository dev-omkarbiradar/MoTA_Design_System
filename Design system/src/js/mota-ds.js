/*!
 * MoTA Design System - behaviour script
 * Ministry of Tribal Affairs, Government of India
 *
 * One file, no dependencies, no build step. Works with plain HTML, ASP.NET
 * (MVC, Razor Pages, Web Forms, Blazor), Angular, or any other stack.
 *
 * Behaviour is attached through data attributes and event delegation on the
 * document, so markup rendered later (Angular views, Blazor components,
 * UpdatePanels) works without calling anything. Components that need set-up
 * (carousels, counters) are initialised when they appear in the page.
 *
 * Public API (window.MotaDS):
 *   MotaDS.init(root?)                 initialise components inside root
 *   MotaDS.toast(message, options?)    show a toast; options: { type, timeout, action, onAction }
 *   MotaDS.openDialog(idOrElement)     open a <dialog class="ds-dialog">
 *   MotaDS.closeDialog(idOrElement)
 *   MotaDS.setColour(name)             forest-green | burgundy | midnight-purple | classic-blue | chrome-yellow | cinnamon-red
 *   MotaDS.validate(form)              run form validation; returns true when valid
 *   MotaDS.configure({ strings, storage, observe })
 *
 * Configure before the script loads with window.MotaDSConfig = { … }.
 */
(function (window, document) {
  'use strict';

  if (window.MotaDS) return;

  var config = {
    observe: true,      // initialise components added to the page later
    storage: true,      // remember accessibility and colour choices
    strings: {
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      pause: 'Pause',
      play: 'Play',
      slide: 'Slide',
      of: 'of',
      close: 'Close',
      dismiss: 'Dismiss',
      externalTitle: 'You are leaving this website',
      externalMessage: 'This link opens {site}, a website outside this one, in a new tab.',
      externalDisclaimer: 'The Ministry is not responsible for the content or privacy practices of other websites.',
      externalContinue: 'Continue',
      externalCancel: 'Cancel',
      errorSummary: 'There is a problem',
      required: 'Enter {label}',
      requiredChoice: 'Select {label}',
      requiredFile: 'Choose {label}',
      invalidEmail: 'Enter an email address in the correct format, like name@example.gov.in',
      invalidPattern: 'Enter {label} in the correct format',
      tooShort: '{label} must be at least {min} characters',
      tooLong: '{label} must be {max} characters or fewer',
      rangeUnder: '{label} must be {min} or more',
      rangeOver: '{label} must be {max} or less',
      charsLeft: '{n} characters left',
      charsOver: '{n} characters too many',
      fileSelected: 'Selected: {name}',
      strength: ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'],
      sortedAsc: 'sorted ascending',
      sortedDesc: 'sorted descending'
    }
  };

  var user = window.MotaDSConfig || {};
  if (user.strings) Object.keys(user.strings).forEach(function (k) { config.strings[k] = user.strings[k]; });
  if ('observe' in user) config.observe = !!user.observe;
  if ('storage' in user) config.storage = !!user.storage;

  var root = document.documentElement;
  var KEY_A11Y = 'mota-ds:a11y';
  var KEY_COLOUR = 'mota-ds:colour';
  var KEY_RAIL = 'mota-ds:app-collapsed';

  // ---- helpers ---------------------------------------------------------------
  function t(key, vars) {
    var s = config.strings[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  function byId(idOrEl) {
    return typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  }

  function store(key, value) {
    if (!config.storage) return null;
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) { /* storage blocked: choices last for this page only */ }
    return null;
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isDesktop() {
    return window.matchMedia('(min-width: 1200px)').matches;
  }

  function each(scope, selector, fn) {
    Array.prototype.forEach.call(scope.querySelectorAll(selector), fn);
  }

  function labelOf(control) {
    var label = control.id && document.querySelector('label[for="' + control.id + '"]');
    var text = control.getAttribute('data-ds-label') ||
      (label && label.textContent) ||
      control.getAttribute('aria-label') ||
      (control.closest('fieldset') && control.closest('fieldset').querySelector('legend') && control.closest('fieldset').querySelector('legend').textContent) ||
      control.name || '';
    return text.replace(/\*/g, '').replace(/\(optional\)/i, '').trim().toLowerCase();
  }

  // ---- Popovers and mega menus ---------------------------------------------------
  // <button aria-expanded="false" aria-controls="id" data-ds-popover>  (or data-ds-megamenu)
  var openTrigger = null;

  function closeOpen(returnFocus) {
    if (!openTrigger) return;
    var panel = byId(openTrigger.getAttribute('aria-controls'));
    openTrigger.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
    if (returnFocus) openTrigger.focus();
    openTrigger = null;
  }

  function toggleTrigger(btn) {
    var wasOpen = btn === openTrigger;
    closeOpen(false);
    if (wasOpen) return;
    var panel = byId(btn.getAttribute('aria-controls'));
    if (!panel) return;
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    openTrigger = btn;
  }

  // ---- Dialogs ---------------------------------------------------------------------
  function openDialog(idOrEl, opener) {
    var dlg = byId(idOrEl);
    if (!dlg) return;
    dlg._dsOpener = opener || document.activeElement;
    if (typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.setAttribute('open', '');
    }
  }

  function closeDialog(idOrEl, value) {
    var dlg = byId(idOrEl);
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close(value);
    else dlg.removeAttribute('open');
  }

  document.addEventListener('close', function (e) {
    var dlg = e.target;
    if (dlg && dlg._dsOpener && document.contains(dlg._dsOpener)) {
      dlg._dsOpener.focus();
      dlg._dsOpener = null;
    }
  }, true);

  // ---- Tabs --------------------------------------------------------------------------
  function selectTab(tab, focus) {
    var list = tab.closest('[role="tablist"]');
    if (!list) return;
    each(list, '[role="tab"]', function (other) {
      var selected = other === tab;
      other.setAttribute('aria-selected', selected ? 'true' : 'false');
      other.tabIndex = selected ? 0 : -1;
      var panel = byId(other.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  }

  function tabKeydown(e, tab) {
    var tabs = Array.prototype.slice.call(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    var i = tabs.indexOf(tab);
    var next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      selectTab(next, true);
    }
  }

  // ---- Colour theme ---------------------------------------------------------------------
  function setColour(name, remember) {
    if (name) root.setAttribute('data-ds-colour', name);
    else root.removeAttribute('data-ds-colour');
    if (remember !== false) store(KEY_COLOUR, name || null);
    each(document, '[data-ds-colour-option]', function (opt) {
      opt.setAttribute('aria-pressed', opt.getAttribute('data-ds-colour-option') === (name || 'forest-green') ? 'true' : 'false');
    });
  }

  // ---- Accessibility panel ------------------------------------------------------------------
  var A11Y_CLASSES = {
    contrast: 'ds-a11y-contrast',
    invert: 'ds-a11y-invert',
    saturation: 'ds-a11y-saturation',
    links: 'ds-a11y-links',
    'hide-images': 'ds-a11y-hide-images',
    cursor: 'ds-a11y-cursor',
    spacing: 'ds-a11y-spacing'
  };

  function a11yState() {
    var state = { scale: 0, modes: [] };
    try { state = JSON.parse(store(KEY_A11Y)) || state; } catch (e) { /* ignore */ }
    return state;
  }

  function applyA11y(state) {
    if (state.scale) root.setAttribute('data-ds-font-scale', String(state.scale));
    else root.removeAttribute('data-ds-font-scale');
    Object.keys(A11Y_CLASSES).forEach(function (mode) {
      root.classList.toggle(A11Y_CLASSES[mode], state.modes.indexOf(mode) !== -1);
    });
    each(document, '[data-ds-a11y]', function (btn) {
      var action = btn.getAttribute('data-ds-a11y');
      if (A11Y_CLASSES[action]) btn.setAttribute('aria-pressed', state.modes.indexOf(action) !== -1 ? 'true' : 'false');
      if (action === 'font-reset') btn.setAttribute('aria-pressed', state.scale === 0 ? 'true' : 'false');
      if (action === 'font-up') btn.disabled = state.scale >= 2;
      if (action === 'font-down') btn.disabled = state.scale <= -1;
    });
  }

  function a11yAction(action) {
    var state = a11yState();
    if (action === 'font-up') state.scale = Math.min(2, state.scale + 1);
    else if (action === 'font-down') state.scale = Math.max(-1, state.scale - 1);
    else if (action === 'font-reset') state.scale = 0;
    else if (action === 'reset') state = { scale: 0, modes: [] };
    else if (A11Y_CLASSES[action]) {
      var i = state.modes.indexOf(action);
      if (i === -1) {
        // contrast, invert and saturation are alternatives
        if (['contrast', 'invert', 'saturation'].indexOf(action) !== -1) {
          state.modes = state.modes.filter(function (m) { return ['contrast', 'invert', 'saturation'].indexOf(m) === -1; });
        }
        state.modes.push(action);
      } else {
        state.modes.splice(i, 1);
      }
    }
    store(KEY_A11Y, JSON.stringify(state));
    applyA11y(state);
  }

  // ---- Password visibility -------------------------------------------------------------------
  function togglePassword(btn) {
    var input = byId(btn.getAttribute('aria-controls')) ||
      (btn.closest('.ds-input-group') && btn.closest('.ds-input-group').querySelector('input'));
    if (!input) return;
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', show ? 'true' : 'false');
    btn.setAttribute('aria-label', show ? t('hidePassword') : t('showPassword'));
    var icon = btn.querySelector('.ds-icon');
    if (icon) {
      icon.classList.toggle('ds-i-view', !show);
      icon.classList.toggle('ds-i-hide', show);
    }
  }

  // ---- External link notice (GIGW 3.0) ----------------------------------------------------------
  // Opt in with <body data-ds-external-notice>. Links to other hosts show a
  // notice first; data-ds-external-notice="off" on a link skips it.
  var externalDialog = null;

  function externalNotice(link) {
    var host = link.hostname.replace(/^www\./, '');
    if (!externalDialog) {
      externalDialog = document.createElement('dialog');
      externalDialog.className = 'ds-dialog ds-dialog--sm';
      externalDialog.setAttribute('aria-labelledby', 'ds-ext-title');
      externalDialog.innerHTML =
        '<div class="ds-dialog__header"><h2 id="ds-ext-title"></h2>' +
        '<button type="button" class="ds-dialog__close" data-ds-close><span class="ds-icon ds-i-close" aria-hidden="true"></span><span class="ds-sr-only"></span></button></div>' +
        '<div class="ds-dialog__body"><p class="ds-ext-msg"></p><p class="ds-text-sm ds-text-muted ds-ext-disc"></p></div>' +
        '<div class="ds-dialog__footer"><button type="button" class="ds-btn ds-btn--outline" data-ds-close></button>' +
        '<button type="button" class="ds-btn ds-ext-go"></button></div>';
      document.body.appendChild(externalDialog);
      externalDialog.querySelector('.ds-ext-go').addEventListener('click', function () {
        var href = externalDialog._dsHref;
        closeDialog(externalDialog);
        window.open(href, '_blank', 'noopener,noreferrer');
      });
    }
    externalDialog.querySelector('#ds-ext-title').textContent = t('externalTitle');
    externalDialog.querySelector('.ds-dialog__close .ds-sr-only').textContent = t('close');
    externalDialog.querySelector('.ds-ext-msg').textContent = t('externalMessage', { site: host });
    externalDialog.querySelector('.ds-ext-disc').textContent = t('externalDisclaimer');
    externalDialog.querySelector('[data-ds-close].ds-btn').textContent = t('externalCancel');
    externalDialog.querySelector('.ds-ext-go').textContent = t('externalContinue');
    externalDialog._dsHref = link.href;
    openDialog(externalDialog, link);
  }

  function isExternal(link) {
    if (!link.href || !/^https?:$/.test(link.protocol)) return false;
    return link.hostname !== window.location.hostname;
  }

  // ---- Toasts ------------------------------------------------------------------------------------
  function toastRegion() {
    var region = document.querySelector('.ds-toasts');
    if (!region) {
      region = document.createElement('div');
      region.className = 'ds-toasts';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    return region;
  }

  function toast(message, options) {
    options = options || {};
    var el = document.createElement('div');
    el.className = 'ds-toast' + (options.type ? ' ds-toast--' + options.type : '');
    var p = document.createElement('p');
    p.textContent = message;
    el.appendChild(p);
    if (options.action) {
      var act = document.createElement('button');
      act.type = 'button';
      act.textContent = options.action;
      act.addEventListener('click', function () {
        if (options.onAction) options.onAction();
        el.remove();
      });
      el.appendChild(act);
    }
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', t('dismiss'));
    close.innerHTML = '<span class="ds-icon ds-i-close ds-icon--sm" aria-hidden="true"></span>';
    close.addEventListener('click', function () { el.remove(); });
    el.appendChild(close);
    toastRegion().appendChild(el);
    var timeout = options.timeout === undefined ? 6000 : options.timeout;
    if (timeout) {
      var timer = setTimeout(function () { el.remove(); }, timeout);
      // keep it while the pointer or focus is on it (WCAG 2.2.1)
      el.addEventListener('mouseenter', function () { clearTimeout(timer); });
      el.addEventListener('focusin', function () { clearTimeout(timer); });
    }
    return el;
  }

  // ---- Form validation -------------------------------------------------------------------------------
  // <form data-ds-validate novalidate>. Messages: data-ds-error-required,
  // data-ds-error-format on a control override the defaults.
  function messageFor(control) {
    var v = control.validity;
    var label = labelOf(control);
    if (v.valueMissing) {
      return control.getAttribute('data-ds-error-required') ||
        t(control.type === 'file' ? 'requiredFile' :
          control.type === 'radio' || control.type === 'checkbox' || control.tagName === 'SELECT' ? 'requiredChoice' : 'required', { label: label });
    }
    var custom = control.getAttribute('data-ds-error-format');
    if (v.typeMismatch && control.type === 'email') return custom || t('invalidEmail');
    if (v.typeMismatch || v.patternMismatch || v.badInput) return custom || t('invalidPattern', { label: label });
    if (v.tooShort) return t('tooShort', { label: capital(label), min: control.minLength });
    if (v.tooLong) return t('tooLong', { label: capital(label), max: control.maxLength });
    if (v.rangeUnderflow) return t('rangeUnder', { label: capital(label), min: control.min });
    if (v.rangeOverflow) return t('rangeOver', { label: capital(label), max: control.max });
    return control.validationMessage;
  }

  function capital(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function fieldOf(control) {
    return control.closest('.ds-field, fieldset') || control.parentElement;
  }

  function setError(control, message) {
    var field = fieldOf(control);
    var group = control.type === 'radio' || control.type === 'checkbox'
      ? field.querySelectorAll('input[name="' + control.name + '"]')
      : [control];
    var key = control.type === 'radio' ? control.name : (control.id || control.name);
    var errId = 'ds-err-' + key;
    var err = document.getElementById(errId);
    if (message) {
      if (!err) {
        err = document.createElement('p');
        err.className = 'ds-field-error';
        err.id = errId;
        var anchor = field.querySelector('.ds-label, legend');
        if (anchor && anchor.nextSibling) anchor.parentNode.insertBefore(err, anchor.nextSibling);
        else field.insertBefore(err, field.firstChild);
      }
      err.textContent = message;
    } else if (err) {
      err.remove();
    }
    Array.prototype.forEach.call(group, function (c) {
      if (message) c.setAttribute('aria-invalid', 'true');
      else c.removeAttribute('aria-invalid');
      var described = (c.getAttribute('aria-describedby') || '').split(' ').filter(function (id) { return id && id !== errId; });
      if (message) described.unshift(errId);
      if (described.length) c.setAttribute('aria-describedby', described.join(' '));
      else c.removeAttribute('aria-describedby');
    });
  }

  function validate(form) {
    var errors = [];
    var seen = {};
    each(form, 'input, select, textarea', function (control) {
      if (control.disabled || control.type === 'hidden' || control.type === 'submit' || control.type === 'button') return;
      if (control.type === 'radio' || control.type === 'checkbox') {
        if (seen[control.name]) return;
        seen[control.name] = true;
      }
      var valid = control.checkValidity();
      var message = valid ? '' : messageFor(control);
      setError(control, message);
      if (message) errors.push({ control: control, message: message });
    });

    var summary = form.querySelector('[data-ds-error-summary]');
    if (!summary) {
      summary = document.createElement('div');
      summary.setAttribute('data-ds-error-summary', '');
      summary.className = 'ds-error-summary';
      summary.hidden = true;
      form.insertBefore(summary, form.firstChild);
    }
    if (!errors.length) {
      summary.hidden = true;
      return true;
    }
    summary.className = 'ds-error-summary';
    summary.setAttribute('tabindex', '-1');
    summary.setAttribute('role', 'alert');
    summary.innerHTML = '<h2 class="ds-error-summary__title"></h2><ul></ul>';
    summary.querySelector('h2').textContent = t('errorSummary');
    var list = summary.querySelector('ul');
    errors.forEach(function (e) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + (e.control.id || '');
      a.textContent = e.message;
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        e.control.focus();
      });
      li.appendChild(a);
      list.appendChild(li);
    });
    summary.hidden = false;
    summary.focus();
    return false;
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.hasAttribute || !form.hasAttribute('data-ds-validate')) return;
    if (!validate(form)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // Clear a field's error as soon as it becomes valid
  document.addEventListener('input', onEdit, true);
  document.addEventListener('change', onEdit, true);

  function onEdit(e) {
    var control = e.target;
    if (!control.form || !control.form.hasAttribute('data-ds-validate')) return;
    if (control.getAttribute('aria-invalid') === 'true' && control.checkValidity()) setError(control, '');
  }

  // ---- Character counter: <textarea maxlength="500" data-ds-counter> ----------------------------------
  function updateCounter(control) {
    var field = fieldOf(control);
    var out = field.querySelector('.ds-counter');
    if (!out) {
      out = document.createElement('p');
      out.className = 'ds-counter';
      out.setAttribute('aria-live', 'polite');
      field.appendChild(out);
    }
    var max = parseInt(control.getAttribute('maxlength') || control.getAttribute('data-ds-counter'), 10);
    if (!max) return;
    var left = max - control.value.length;
    out.textContent = left >= 0 ? t('charsLeft', { n: left }) : t('charsOver', { n: -left });
  }

  // ---- File input ------------------------------------------------------------------------------------
  function showFileName(input) {
    var box = input.closest('.ds-file');
    if (!box) return;
    var out = box.querySelector('.ds-file__name');
    if (!out) {
      out = document.createElement('span');
      out.className = 'ds-file__name';
      out.setAttribute('aria-live', 'polite');
      box.appendChild(out);
    }
    var names = Array.prototype.map.call(input.files || [], function (f) { return f.name; }).join(', ');
    out.textContent = names ? t('fileSelected', { name: names }) : '';
  }

  // ---- Password strength: <div class="ds-strength" data-ds-strength-for="password"> --------------------
  function updateStrength(input) {
    each(document, '[data-ds-strength-for="' + input.id + '"]', function (meter) {
      var v = input.value;
      var score = 0;
      if (v.length >= 8) score++;
      if (v.length >= 12) score++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
      if (/\d/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      var level = v ? Math.max(1, Math.min(4, score - 1)) : 0;
      meter.setAttribute('data-level', String(level));
      var out = meter.querySelector('output');
      if (out) out.textContent = v ? t('strength')[level] : '';
    });
  }

  // ---- Table sorting: <table class="ds-table" data-ds-sortable> + <button class="ds-sort"> ----------------
  function sortTable(btn) {
    var th = btn.closest('th');
    var table = btn.closest('table');
    var tbody = table.tBodies[0];
    if (!th || !tbody) return;
    var index = Array.prototype.indexOf.call(th.parentNode.children, th);
    var dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    each(table, 'thead th', function (other) { other.removeAttribute('aria-sort'); });
    th.setAttribute('aria-sort', dir);
    var rows = Array.prototype.slice.call(tbody.rows);
    function value(row) {
      var cell = row.cells[index];
      if (!cell) return '';
      var raw = cell.getAttribute('data-sort-value') || cell.textContent.trim();
      var num = parseFloat(raw.replace(/[₹,\s%]/g, ''));
      return isNaN(num) || /[a-z]/i.test(raw.replace(/e/gi, '')) ? raw.toLowerCase() : num;
    }
    rows.sort(function (a, b) {
      var x = value(a), y = value(b);
      var r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
      return dir === 'ascending' ? r : -r;
    });
    rows.forEach(function (row) { tbody.appendChild(row); });
  }

  // ---- Carousel ----------------------------------------------------------------------------------------
  function initCarousel(el) {
    if (el._dsCarousel) return;
    var track = el.querySelector('.ds-carousel__track');
    var slides = track ? track.children : [];
    if (slides.length < 2) return;
    var dotsBox = el.querySelector('.ds-carousel__dots');
    var pauseBtn = el.querySelector('.ds-carousel__pause');
    var interval = parseInt(el.getAttribute('data-interval') || '6000', 10);
    var state = { index: 0, timer: null, paused: reducedMotion(), hover: false };
    el._dsCarousel = state;

    if (dotsBox && !dotsBox.children.length) {
      Array.prototype.forEach.call(slides, function (s, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ds-carousel__dot';
        b.setAttribute('aria-label', t('slide') + ' ' + (i + 1) + ' ' + t('of') + ' ' + slides.length);
        b.addEventListener('click', function () { go(i); });
        dotsBox.appendChild(b);
      });
    }

    function go(i) {
      state.index = (i + slides.length) % slides.length;
      el.style.setProperty('--ds-slide', String(state.index));
      Array.prototype.forEach.call(slides, function (s, n) {
        var current = n === state.index;
        s.setAttribute('aria-hidden', current ? 'false' : 'true');
        each(s, 'a, button, input, select, textarea', function (f) { f.tabIndex = current ? 0 : -1; });
      });
      if (dotsBox) Array.prototype.forEach.call(dotsBox.children, function (d, n) {
        if (n === state.index) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    function tick() {
      clearInterval(state.timer);
      if (!state.paused && !state.hover) state.timer = setInterval(function () { go(state.index + 1); }, interval);
    }

    function renderPause() {
      if (!pauseBtn) return;
      pauseBtn.setAttribute('aria-label', state.paused ? t('play') : t('pause'));
      pauseBtn.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
      var icon = pauseBtn.querySelector('.ds-icon');
      if (icon) {
        icon.classList.toggle('ds-i-pause', !state.paused);
        icon.classList.toggle('ds-i-play-2', state.paused);
      }
    }

    var prev = el.querySelector('.ds-carousel__nav--prev');
    var next = el.querySelector('.ds-carousel__nav--next');
    if (prev) prev.addEventListener('click', function () { go(state.index - 1); });
    if (next) next.addEventListener('click', function () { go(state.index + 1); });
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      state.paused = !state.paused;
      renderPause();
      tick();
    });
    el.addEventListener('mouseenter', function () { state.hover = true; tick(); });
    el.addEventListener('mouseleave', function () { state.hover = false; tick(); });
    el.addEventListener('focusin', function () { state.hover = true; tick(); });
    el.addEventListener('focusout', function () { state.hover = false; tick(); });

    go(0);
    renderPause();
    tick();
  }

  // ---- Ticker -------------------------------------------------------------------------------------------
  function initTicker(el) {
    if (el._dsTicker) return;
    el._dsTicker = true;
    var track = el.querySelector('.ds-ticker__track');
    if (track && !track.hasAttribute('data-ds-cloned')) {
      // repeat the items once so the loop is seamless; the copy is hidden from screen readers
      Array.prototype.slice.call(track.children).forEach(function (item) {
        var copy = item.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        each(copy, 'a, button', function (f) { f.tabIndex = -1; });
        track.appendChild(copy);
      });
      track.setAttribute('data-ds-cloned', '');
    }
    if (reducedMotion()) el.setAttribute('data-paused', 'true');
  }

  // ---- Masthead, scroll progress, back to top ------------------------------------------------------------
  var masthead = null;
  var progress = null;
  var backToTop = null;

  function measureMasthead() {
    masthead = document.querySelector('.ds-masthead');
    progress = document.querySelector('.ds-scroll-progress');
    backToTop = document.querySelector('.ds-back-to-top');
    if (!masthead) return;
    var bar = masthead.querySelector('.ds-menubar');
    var brand = masthead.querySelector('.ds-brandbar');
    // desktop: the brand bar scrolls away and the menu bar stays; phones: nothing sticks
    var offset = bar && bar.offsetHeight && brand ? brand.offsetHeight : masthead.offsetHeight;
    masthead.style.setProperty('--ds-masthead-top', -offset + 'px');
    root.style.setProperty('--ds-header-offset', ((bar && bar.offsetHeight) || 0) + 16 + 'px');
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.setProperty('--ds-scroll', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
      if (masthead) masthead.setAttribute('data-scrolled', y > 8 ? 'true' : 'false');
      if (backToTop) backToTop.setAttribute('data-visible', y > 600 ? 'true' : 'false');
    });
  }

  // ---- Application shell ------------------------------------------------------------------------------------
  function toggleApp(btn) {
    var app = btn.closest('.ds-app') || document.querySelector('.ds-app');
    if (!app) return;
    if (isDesktop()) {
      var collapsed = app.getAttribute('data-collapsed') !== 'true';
      app.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
      if (btn.hasAttribute('aria-pressed')) {
        btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
        btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      } else {
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      }
      store(KEY_RAIL, collapsed ? '1' : null);
    } else {
      var open = app.getAttribute('data-drawer') !== 'open';
      app.setAttribute('data-drawer', open ? 'open' : 'closed');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var first = app.querySelector('.ds-app__side a, .ds-app__side button');
        if (first) first.focus();
      }
    }
  }

  function closeAppDrawer(focusToggle) {
    var app = document.querySelector('.ds-app[data-drawer="open"]');
    if (!app) return false;
    app.setAttribute('data-drawer', 'closed');
    var btn = app.querySelector('.ds-app__menu[data-ds-app-toggle]') || app.querySelector('[data-ds-app-toggle]');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      if (focusToggle) btn.focus();
    }
    return true;
  }

  // ---- Delegated events --------------------------------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;

    var trigger = target.closest('[data-ds-popover], [data-ds-megamenu]');
    if (trigger) {
      e.preventDefault();
      toggleTrigger(trigger);
      return;
    }
    // click outside an open popover closes it
    if (openTrigger) {
      var panel = byId(openTrigger.getAttribute('aria-controls'));
      if (!panel || !panel.contains(target)) closeOpen(false);
      else if (target.closest('a[href]')) closeOpen(false);
    }

    var opener = target.closest('[data-ds-open]');
    if (opener) {
      e.preventDefault();
      openDialog(opener.getAttribute('data-ds-open'), opener);
      return;
    }

    var closer = target.closest('[data-ds-close]');
    if (closer) {
      var dlg = closer.closest('dialog');
      if (dlg) closeDialog(dlg, closer.getAttribute('data-ds-close') || '');
      return;
    }

    // click on the backdrop of a modal dialog or drawer
    if (target.tagName === 'DIALOG' && target.open) {
      var r = target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(target);
      return;
    }

    var tab = target.closest('[role="tab"]');
    if (tab && tab.closest('[role="tablist"]')) {
      e.preventDefault();
      selectTab(tab, false);
      return;
    }

    var colour = target.closest('[data-ds-colour-option]');
    if (colour) {
      setColour(colour.getAttribute('data-ds-colour-option'));
      return;
    }

    var a11y = target.closest('[data-ds-a11y]');
    if (a11y) {
      a11yAction(a11y.getAttribute('data-ds-a11y'));
      return;
    }

    var pw = target.closest('[data-ds-password-toggle]');
    if (pw) {
      togglePassword(pw);
      return;
    }

    var tickerBtn = target.closest('[data-ds-ticker-toggle]');
    if (tickerBtn) {
      var ticker = tickerBtn.closest('.ds-ticker');
      var paused = ticker.getAttribute('data-paused') !== 'true';
      ticker.setAttribute('data-paused', paused ? 'true' : 'false');
      tickerBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      tickerBtn.setAttribute('aria-label', paused ? t('play') : t('pause'));
      var ti = tickerBtn.querySelector('.ds-icon');
      if (ti) {
        ti.classList.toggle('ds-i-pause', !paused);
        ti.classList.toggle('ds-i-play-2', paused);
      }
      return;
    }

    var appToggle = target.closest('[data-ds-app-toggle]');
    if (appToggle) {
      toggleApp(appToggle);
      return;
    }

    if (target.closest('[data-ds-app-close]')) {
      closeAppDrawer(true);
      return;
    }

    var clear = target.closest('.ds-search__clear');
    if (clear) {
      var input = clear.closest('.ds-search').querySelector('input');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      }
      return;
    }

    var sortBtn = target.closest('table[data-ds-sortable] .ds-sort');
    if (sortBtn) {
      sortTable(sortBtn);
      return;
    }

    if (target.closest('.ds-back-to-top')) {
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      var skipTarget = document.querySelector('.ds-skip-link');
      if (skipTarget) skipTarget.focus({ preventScroll: true });
      return;
    }

    var link = target.closest('a[href]');
    if (link && document.body.hasAttribute('data-ds-external-notice') &&
        link.getAttribute('data-ds-external-notice') !== 'off' &&
        isExternal(link) && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      externalNotice(link);
    }
  });

  document.addEventListener('keydown', function (e) {
    var target = e.target;
    if (e.key === 'Escape') {
      if (openTrigger) {
        closeOpen(true);
        return;
      }
      if (closeAppDrawer(true)) return;
    }
    if (target instanceof Element && target.getAttribute('role') === 'tab' && target.closest('[role="tablist"]')) {
      tabKeydown(e, target);
    }
    // Ctrl+K or "/" focuses the search box marked data-ds-search-shortcut
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && !target.isContentEditable)) {
      var search = document.querySelector('[data-ds-search-shortcut]');
      if (search && search.offsetParent !== null) {
        e.preventDefault();
        search.focus();
      }
    }
    // OTP boxes: Backspace on an empty box moves back
    if (e.key === 'Backspace' && target.closest && target.closest('.ds-otp') && !target.value) {
      var prevBox = target.previousElementSibling;
      if (prevBox) prevBox.focus();
    }
  });

  document.addEventListener('input', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (target.hasAttribute('data-ds-counter')) updateCounter(target);
    if (target.id && document.querySelector('[data-ds-strength-for="' + target.id + '"]')) updateStrength(target);
    var search = target.closest('.ds-search');
    if (search) {
      var clearBtn = search.querySelector('.ds-search__clear');
      if (clearBtn) clearBtn.hidden = !target.value;
    }
    // OTP boxes: move to the next box after a digit
    if (target.closest('.ds-otp') && target.value.length >= 1) {
      var nextBox = target.nextElementSibling;
      if (nextBox) nextBox.focus();
    }
  });

  document.addEventListener('change', function (e) {
    var target = e.target;
    if (target instanceof Element && target.matches('.ds-file input[type="file"]')) showFileName(target);
  });

  ['dragenter', 'dragover'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      var box = e.target instanceof Element && e.target.closest('.ds-file');
      if (box) box.setAttribute('data-dragover', 'true');
    });
  });
  ['dragleave', 'drop'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      var box = e.target instanceof Element && e.target.closest('.ds-file');
      if (box) box.removeAttribute('data-dragover');
    });
  });

  // ---- Initialisation ------------------------------------------------------------------------------------------
  function init(scope) {
    scope = scope || document;
    each(scope, '[data-ds-carousel]', initCarousel);
    each(scope, '.ds-ticker', initTicker);
    each(scope, '[data-ds-counter]', updateCounter);
    each(scope, '[role="tablist"]', function (list) {
      var selected = list.querySelector('[role="tab"][aria-selected="true"]') || list.querySelector('[role="tab"]');
      if (selected && !list._dsTabs) {
        list._dsTabs = true;
        selectTab(selected, false);
      }
    });
    each(scope, '.ds-search', function (search) {
      var input = search.querySelector('input');
      var clearBtn = search.querySelector('.ds-search__clear');
      if (input && clearBtn) clearBtn.hidden = !input.value;
    });
    if (scope === document) {
      applyA11y(a11yState());
      setColour(store(KEY_COLOUR) || root.getAttribute('data-ds-colour'), false);
      var app = document.querySelector('.ds-app');
      if (app && store(KEY_RAIL) === '1' && !app.hasAttribute('data-collapsed-fixed')) app.setAttribute('data-collapsed', 'true');
      measureMasthead();
      onScroll();
    }
  }

  // Apply stored preferences immediately, before first paint where possible
  applyA11y(a11yState());
  var storedColour = store(KEY_COLOUR);
  if (storedColour) root.setAttribute('data-ds-colour', storedColour);

  function start() {
    init(document);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      measureMasthead();
      onScroll();
    });
    if (config.observe && 'MutationObserver' in window) {
      var pending = false;
      new MutationObserver(function (mutations) {
        if (pending) return;
        var added = mutations.some(function (m) { return m.addedNodes.length; });
        if (!added) return;
        pending = true;
        window.requestAnimationFrame(function () {
          pending = false;
          init(document.body);
          if (!masthead || !document.contains(masthead)) measureMasthead();
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.MotaDS = {
    version: '1.0.0',
    init: init,
    toast: toast,
    openDialog: function (id) { openDialog(id); },
    closeDialog: closeDialog,
    setColour: function (name) { setColour(name, true); },
    validate: validate,
    configure: function (options) {
      options = options || {};
      if (options.strings) Object.keys(options.strings).forEach(function (k) { config.strings[k] = options.strings[k]; });
      if ('storage' in options) config.storage = !!options.storage;
    }
  };
})(window, document);
