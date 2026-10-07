/* Documentation site only - not part of the design system.
   Load before mota-ds.js, so the example markup is read before the design
   system script adds its runtime attributes. */
(function () {
  'use strict';

  // ---- Code blocks generated from each live example ----------------------------
  function dedent(text) {
    var lines = text.replace(/^\n+|\s+$/g, '').split('\n');
    var indent = Math.min.apply(null, lines.filter(function (l) { return l.trim(); }).map(function (l) { return l.match(/^\s*/)[0].length; }));
    return lines.map(function (l) { return l.slice(indent); }).join('\n');
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(source) {
    return escapeHtml(source)
      .replace(/&lt;!--[\s\S]*?--&gt;/g, function (m) { return '<span class="c">' + m + '</span>'; })
      .replace(/(&lt;\/?)([a-z0-9-]+)([^&]*?)(\/?&gt;)/gi, function (m, open, tag, attrs, close) {
        attrs = attrs.replace(/([a-z-:]+)(=)("[^"]*")/gi, '<span class="a">$1</span>$2<span class="v">$3</span>')
          .replace(/(\s)([a-z-]+)(?=\s|$)/gi, '$1<span class="a">$2</span>');
        return '<span class="t">' + open + tag + '</span>' + attrs + '<span class="t">' + close + '</span>';
      });
  }

  function copy(text, button) {
    function done(ok) {
      var label = button.textContent;
      button.textContent = ok ? 'Copied' : 'Select and copy';
      setTimeout(function () { button.textContent = label; }, 1600);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      area.remove();
      done(ok);
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.doc-example:not([data-no-code])'), function (example) {
    var source = dedent(example.innerHTML);
    var block = document.createElement('div');
    block.className = 'doc-code';
    block.innerHTML = '<div class="doc-code__bar"><button type="button" data-expand>Expand</button><button type="button" data-copy>Copy code</button></div><pre><code></code></pre>';
    block.querySelector('code').innerHTML = highlight(source);
    block.querySelector('pre').setAttribute('tabindex', '0');
    block.querySelector('pre').setAttribute('aria-label', 'Code example');
    block.querySelector('[data-copy]').addEventListener('click', function (e) { copy(source, e.currentTarget); });
    var expand = block.querySelector('[data-expand]');
    expand.addEventListener('click', function () {
      var open = block.getAttribute('data-expanded') !== 'true';
      block.setAttribute('data-expanded', open ? 'true' : 'false');
      expand.textContent = open ? 'Collapse' : 'Expand';
    });
    example.parentNode.insertBefore(block, example.nextSibling);
  });

  Array.prototype.forEach.call(document.querySelectorAll('pre.doc-pre'), function (pre) {
    pre.setAttribute('tabindex', '0');
    var bar = document.createElement('div');
    bar.className = 'doc-code__bar';
    bar.style.marginBottom = '-2.25rem';
    bar.style.position = 'relative';
    bar.innerHTML = '<button type="button">Copy</button>';
    bar.querySelector('button').addEventListener('click', function (e) { copy(pre.textContent, e.currentTarget); });
    pre.parentNode.insertBefore(bar, pre);
  });

  // ---- Table of contents from the page's sections ----------------------------------
  var toc = document.querySelector('.doc-toc ul');
  if (toc) {
    var links = [];
    Array.prototype.forEach.call(document.querySelectorAll('.doc-section[id] > h2'), function (h2) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h2.parentNode.id;
      a.textContent = h2.textContent;
      li.appendChild(a);
      toc.appendChild(li);
      links.push({ a: a, section: h2.parentNode });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (l) {
            if (l.section === entry.target) l.a.setAttribute('aria-current', 'true');
            else l.a.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      links.forEach(function (l) { io.observe(l.section); });
    }
  }

  // ---- Colour theme dots in the top bar ------------------------------------------------
  function markThemes() {
    var current = document.documentElement.getAttribute('data-ds-colour') || 'forest-green';
    Array.prototype.forEach.call(document.querySelectorAll('[data-doc-theme]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-doc-theme') === current ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-doc-hex]'), function (el) {
      var value = getComputedStyle(document.documentElement).getPropertyValue(el.getAttribute('data-doc-hex')).trim();
      el.textContent = value;
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-doc-theme]');
    if (!b) return;
    window.MotaDS.setColour(b.getAttribute('data-doc-theme'));
    markThemes();
  });
  window.addEventListener('load', markThemes);

  // ---- Icon gallery ----------------------------------------------------------------------
  var gallery = document.getElementById('icon-gallery');
  if (gallery && window.DS_ICONS) {
    var filter = document.getElementById('icon-filter');
    var count = document.getElementById('icon-count');
    var coreOnly = document.getElementById('icon-core');
    var base = gallery.getAttribute('data-base');
    function render() {
      var q = (filter.value || '').trim().toLowerCase();
      var shown = window.DS_ICONS.filter(function (icon) {
        if (coreOnly.checked && !icon.core) return false;
        return !q || icon.name.indexOf(q) !== -1 || icon.title.toLowerCase().indexOf(q) !== -1;
      });
      gallery.innerHTML = shown.map(function (icon) {
        return '<li><button type="button" data-icon="' + icon.name + '" title="Copy the markup for ' + icon.title + '">' +
          '<img src="' + base + icon.name + '.svg" alt="" loading="lazy" width="32" height="32">' +
          '<span>' + icon.title + '</span><small>ds-i-' + icon.name + '</small></button></li>';
      }).join('');
      count.textContent = shown.length + ' of ' + window.DS_ICONS.length + ' icons';
    }
    filter.addEventListener('input', render);
    coreOnly.addEventListener('change', render);
    gallery.addEventListener('click', function (e) {
      var b = e.target.closest('[data-icon]');
      if (!b) return;
      var markup = '<span class="ds-icon ds-i-' + b.getAttribute('data-icon') + '" aria-hidden="true"></span>';
      copy(markup, b.querySelector('span'));
    });
    render();
  }
})();
