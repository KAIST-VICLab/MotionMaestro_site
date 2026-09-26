/* Shared script of the GeoSET, GeoCR and MotionMaestro project pages (identical on the three sites).
 * Vanilla JS, no dependencies. Every module is opt-in through markup and does nothing when its
 * markup is absent: top nav, animated disclosures (abstract, table groups), pending arXiv links,
 * BibTeX copy, image lightbox, tabs, table scroll cues. The page's own main.js runs after this
 * file and uses the helpers exported on window.Family. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var scrollBehavior = function () { return reduceMotion.matches ? 'auto' : 'smooth'; };

  var ICON = {
    close: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    external: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    actual: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8v6M8 11h6"/></svg>'
  };

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Scroll a horizontally-overflowing row just enough to show `el` (with `pad` px to spare).
  function revealInRow(row, el, pad) {
    if (!row || !el || row.scrollWidth <= row.clientWidth) return;
    pad = pad == null ? 24 : pad;
    var l = el.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    var r = l + el.offsetWidth, x = row.scrollLeft;
    if (l - pad < x) row.scrollTo({ left: Math.max(0, l - pad), behavior: scrollBehavior() });
    else if (r + pad > x + row.clientWidth) row.scrollTo({ left: r + pad - row.clientWidth, behavior: scrollBehavior() });
  }

  /* ------------------------------------------------------------------
   * Animated disclosures  <details data-animate> > summary + one body
   *    The native element keeps its semantics (keyboard, screen readers,
   *    find-in-page); a summary click only animates the body's height.
   *    Reduced motion -> the native instant toggle.  A link to an id
   *    inside a closed <details> (or the URL hash) opens it first.
   * ------------------------------------------------------------------ */
  function openDetailsFor(id) {
    var el = id && document.getElementById(id);
    for (var n = el; n; n = n.parentElement) {
      if (n.tagName === 'DETAILS' && !n.open) n.open = true;
    }
  }
  function initAnimatedDetails() {
    $$('details[data-animate]').forEach(function (d) {
      var summary = $('summary', d);
      var body = summary && summary.nextElementSibling;
      if (!body) return;
      var anim = null, closing = false;
      function done() {
        anim = null;
        body.style.height = ''; body.style.overflow = '';
      }
      summary.addEventListener('click', function (e) {
        if (reduceMotion.matches || typeof body.animate !== 'function') return;
        e.preventDefault();
        var from = d.open ? body.getBoundingClientRect().height : 0;
        if (anim) anim.cancel();
        body.style.overflow = 'hidden';
        if (!d.open || closing) {                     // open (or reverse a close)
          closing = false;
          d.open = true;
          var to = body.scrollHeight;
          anim = body.animate({ height: [from + 'px', to + 'px'] }, { duration: 300, easing: 'cubic-bezier(.22,.7,.2,1)' });
          anim.onfinish = done;
        } else {                                      // close
          closing = true;
          anim = body.animate({ height: [from + 'px', '0px'] }, { duration: 240, easing: 'cubic-bezier(.4,0,.2,1)' });
          anim.onfinish = function () { closing = false; d.open = false; done(); };
        }
      });
    });
    // click handlers run before the default fragment scroll, so the target is visible when it scrolls
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a && a.hash.length > 1) openDetailsFor(decodeURIComponent(a.hash.slice(1)));
    });
    function fromHash() { if (location.hash.length > 1) openDetailsFor(decodeURIComponent(location.hash.slice(1))); }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* ------------------------------------------------------------------
   * Top nav: reveal once the hero has scrolled away, highlight the
   * current section.  The top 80 px count as "under the nav", so a jump
   * to the first section also shows the nav.
   * ------------------------------------------------------------------ */
  function initNav() {
    var nav = $('.topnav');
    if (!nav) return;
    var trigger = $('[data-nav-trigger]') || $('.hero');
    if (trigger && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var e = entries[0];
        nav.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0);
      }, { threshold: 0, rootMargin: '-80px 0px 0px 0px' }).observe(trigger);
    } else {
      nav.classList.add('is-visible');
    }

    var row = $('.topnav-links', nav);
    // .is-scrollable fades the row's edges (CSS) while its links overflow it
    function markScrollable() {
      if (!row) return;
      row.classList.remove('is-scrollable');
      row.classList.toggle('is-scrollable', row.scrollWidth > row.clientWidth + 1);
    }
    markScrollable();
    window.addEventListener('resize', markScrollable);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(markScrollable);
    var links = row ? $$('a[href^="#"]', row) : [];
    var items = links.map(function (a) {
      return { link: a, section: document.getElementById(decodeURIComponent(a.hash.slice(1))) };
    }).filter(function (it) { return it.section; });
    if (!items.length) return;

    var current = null;
    function setActive(link) {
      if (link === current) return;
      current = link;
      links.forEach(function (a) {
        var on = a === link;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      if (link) revealInRow(row, link, 30);
    }
    var ticking = false;
    function update() {
      ticking = false;
      var line = (nav.offsetHeight || 56) + window.innerHeight * 0.3;
      var active = null;
      items.forEach(function (it) {
        if (it.section.getBoundingClientRect().top <= line) active = it.link;
      });
      var doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) active = items[items.length - 1].link;
      setActive(active);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------
   * Pending links: any <a> whose href still holds the arXiv placeholder
   * gets a "Coming soon" tip and does not navigate (family.css styles it
   * from the href alone).  Once the placeholder in the HTML is replaced
   * by the real ID, the links behave normally.
   * ------------------------------------------------------------------ */
  var PLACEHOLDER = 'XXXX' + '.XXXXX';
  function initPending() {
    $$('a[href*="' + PLACEHOLDER + '"]').forEach(function (a, i) {
      a.classList.add('is-pending');
      a.setAttribute('aria-disabled', 'true');
      var tip = document.createElement('span');
      tip.className = 'pending-tip';
      tip.id = 'pending-tip-' + i;
      tip.setAttribute('role', 'tooltip');
      tip.textContent = a.getAttribute('data-pending') || 'Coming soon';
      a.appendChild(tip);
      a.setAttribute('aria-describedby', tip.id);
      a.addEventListener('auxclick', function (e) { e.preventDefault(); });
      a.addEventListener('click', function (e) {
        e.preventDefault();
        a.classList.add('is-tip-open');
        clearTimeout(a._pt);
        a._pt = setTimeout(function () { a.classList.remove('is-tip-open'); }, 1800);
      });
      a.addEventListener('blur', function () { a.classList.remove('is-tip-open'); });
    });
  }

  /* ------------------------------------------------------------------
   * Copy buttons  <button class="copy-btn" data-copy="#bibtex-code">
   * ------------------------------------------------------------------ */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }
  function initCopy() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-copy]');
      if (!btn) return;
      var src = $(btn.getAttribute('data-copy'));
      if (!src) return;
      var labelEl = $('.copy-label', btn) || btn;
      var original = btn._label || (btn._label = labelEl.textContent);
      copyText(src.textContent.replace(/\s+$/, '')).then(function () {
        btn.classList.add('is-copied');
        labelEl.textContent = 'Copied';
      }, function () {
        labelEl.textContent = 'Press Ctrl+C';
        var r = document.createRange(); r.selectNodeContents(src);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }).then(function () {
        clearTimeout(btn._t);
        btn._t = setTimeout(function () { btn.classList.remove('is-copied'); labelEl.textContent = original; }, 1800);
      });
    });
  }

  /* ------------------------------------------------------------------
   * Dialog helpers (native <dialog>: focus trap, Esc, top layer).
   * Opening or closing one fires "family:dialog" on the document
   * (detail.open), so a page can pause and resume its media.
   * ------------------------------------------------------------------ */
  function announce(open) {
    var ev;
    try { ev = new CustomEvent('family:dialog', { detail: { open: open } }); }
    catch (err) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('family:dialog', false, false, { open: open }); }
    document.dispatchEvent(ev);
  }
  function openDialog(dlg) {
    dlg._returnFocus = document.activeElement;
    document.documentElement.classList.add('has-dialog');
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    announce(true);
  }
  function wireDialog(dlg, onClose) {
    dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('has-dialog');
      if (onClose) onClose();
      var f = dlg._returnFocus;
      dlg._returnFocus = null;
      if (f && typeof f.focus === 'function') f.focus({ preventScroll: true });
      announce(false);
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDialog(dlg); });
  }
  function closeDialog(dlg) {
    if (typeof dlg.close === 'function' && dlg.open) dlg.close();
    else { dlg.removeAttribute('open'); dlg.dispatchEvent(new Event('close')); }
  }

  /* ------------------------------------------------------------------
   * Image lightbox for <a class="zoom" href="full-res.jpg"><img></a>
   *    Fit-to-screen by default; click / "1:1" shows native pixels and
   *    the stage scrolls (wheel, trackpad, touch) or drag-pans (mouse).
   *    Title: the link's data-title, else the caption's bold title.
   * ------------------------------------------------------------------ */
  var lightbox = null;
  function buildLightbox() {
    var d = document.createElement('dialog');
    d.className = 'lightbox';
    d.setAttribute('aria-label', 'Image viewer');
    d.innerHTML =
      '<div class="lb-bar">' +
        '<p class="lb-title"></p>' +
        '<div class="lb-actions">' +
          '<button type="button" class="lb-btn lb-toggle" aria-pressed="false" title="Toggle actual size">' + ICON.actual + '<span class="lb-btn-text">1:1</span></button>' +
          '<a class="lb-btn lb-open" target="_blank" rel="noopener" title="Open the original file">' + ICON.external + '<span class="lb-btn-text">Original</span></a>' +
          '<button type="button" class="lb-btn lb-btn--icon lb-close" aria-label="Close">' + ICON.close + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div>' +
      '<div class="lb-caption"></div>';
    document.body.appendChild(d);

    var stage = $('.lb-stage', d), img = $('.lb-img', d), toggle = $('.lb-toggle', d);
    var lb = { dlg: d, stage: stage, img: img, toggle: toggle, title: $('.lb-title', d),
               caption: $('.lb-caption', d), open: $('.lb-open', d), actual: false, token: 0 };

    function canActual() {
      var r = img.getBoundingClientRect();
      return img.naturalWidth > r.width + 2 || img.naturalHeight > r.height + 2;
    }
    function refreshToggle() {
      var enabled = lb.actual || (img.naturalWidth && canActual());
      toggle.disabled = !enabled;
      stage.classList.toggle('is-fit-only', !enabled);
    }
    lb.refreshToggle = refreshToggle;
    function setActual(on, cx, cy) {
      if (on === lb.actual) return;
      var r = img.getBoundingClientRect();
      var fx = cx == null ? 0.5 : Math.min(1, Math.max(0, (cx - r.left) / r.width));
      var fy = cy == null ? 0.5 : Math.min(1, Math.max(0, (cy - r.top) / r.height));
      lb.actual = on;
      stage.classList.toggle('is-actual', on);
      toggle.setAttribute('aria-pressed', String(on));
      if (on) {
        stage.scrollLeft = fx * img.naturalWidth - stage.clientWidth / 2;
        stage.scrollTop = fy * img.naturalHeight - stage.clientHeight / 2;
      } else {
        stage.scrollLeft = 0; stage.scrollTop = 0;
      }
      refreshToggle();
    }
    toggle.addEventListener('click', function () { setActual(!lb.actual); });
    $('.lb-close', d).addEventListener('click', function () { closeDialog(d); });

    // drag-to-pan (mouse) + click semantics
    var drag = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, moved: false,
               mouse: e.pointerType === 'mouse', onImg: e.target === img };
      if (lb.actual && drag.mouse) { stage.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (lb.actual && drag.mouse && drag.moved) {
        stage.classList.add('is-panning');
        stage.scrollLeft = drag.sl - dx;
        stage.scrollTop = drag.st - dy;
      }
    });
    function endDrag(e) {
      if (!drag) return;
      var d0 = drag; drag = null;
      stage.classList.remove('is-panning');
      if (e.type === 'pointercancel' || d0.moved) return;
      if (d0.onImg) {
        if (lb.actual) setActual(false);
        else if (canActual()) setActual(true, e.clientX, e.clientY);
      } else if (!lb.actual) {
        closeDialog(d);                       // click on the dark backdrop area
      }
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', function () { if (d.open) refreshToggle(); });

    wireDialog(d, function () { lb.token++; img.removeAttribute('src'); });
    return lb;
  }

  function openLightbox(link) {
    if (!lightbox) lightbox = buildLightbox();
    var lb = lightbox, token = ++lb.token;
    var thumb = $('img', link);
    var full = link.getAttribute('href');
    var fig = link.closest('figure');
    var cap = fig ? $('figcaption', fig) : null;
    var capTitle = cap ? $('b', cap) : null;
    var title = link.getAttribute('data-title') ||
      (capTitle ? capTitle.textContent.replace(/[.\s]+$/, '') : '') || (thumb && thumb.alt) || '';

    lb.title.textContent = title;
    lb.caption.innerHTML = cap ? cap.innerHTML : '';
    lb.open.href = full;
    lb.actual = false;
    lb.stage.classList.remove('is-actual', 'is-panning');
    lb.toggle.setAttribute('aria-pressed', 'false');
    lb.img.alt = thumb ? thumb.alt : '';
    // show the already-loaded preview immediately, then swap in the full file
    lb.img.src = thumb ? (thumb.currentSrc || thumb.src) : full;
    openDialog(lb.dlg);
    $('.lb-close', lb.dlg).focus({ preventScroll: true });
    lb.refreshToggle();
    if (full && (!thumb || full !== (thumb.currentSrc || thumb.src))) {
      var pre = new Image();
      pre.onload = function () {
        if (token !== lb.token) return;
        lb.img.src = full;
        (lb.img.decode ? lb.img.decode() : Promise.resolve()).catch(function () {}).then(function () {
          if (token === lb.token) lb.refreshToggle();
        });
      };
      pre.src = full;
    }
  }

  function initLightbox() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.zoom');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openLightbox(a);
    });
  }

  /* ------------------------------------------------------------------
   * Tabs  [role=tablist] > [role=tab][aria-controls]  (+ panels)
   *    Arrow keys / Home / End move and activate; roving tabindex.
   *    A selection fires "family:tabselect" on the tab list.  Lists
   *    inside a page's own switcher ([data-switch]) are left to it.
   * ------------------------------------------------------------------ */
  function initTabs() {
    $$('[role="tablist"]').forEach(function (list) {
      if (list.closest('[data-switch]')) return;
      var tabs = $$('[role="tab"]', list);
      if (!tabs.length) return;
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus({ preventScroll: true });
        revealInRow(list, tab, 16);
        if (tab.parentElement !== list) revealInRow(tab.parentElement, tab, 16);   // grouped rows that scroll on phones
        var ev;
        try { ev = new CustomEvent('family:tabselect', { bubbles: true, detail: { tab: tab } }); }
        catch (err) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('family:tabselect', true, false, { tab: tab }); }
        list.dispatchEvent(ev);
      }
      list.addEventListener('click', function (e) {
        var t = e.target.closest('[role="tab"]');
        if (t && list.contains(t)) select(t);
      });
      list.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n === null) return;
        e.preventDefault();
        select(tabs[n], true);
      });
      var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
      select(initial, false);
      if (!list.classList.contains('tablist')) return;
      function fades() {
        var max = list.scrollWidth - list.clientWidth;
        list.classList.toggle('fade-l', max > 1 && list.scrollLeft > 1);
        list.classList.toggle('fade-r', max > 1 && list.scrollLeft < max - 1);
      }
      list.addEventListener('scroll', fades, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(fades).observe(list);
      else window.addEventListener('resize', fades);
      fades();
    });
  }

  /* ------------------------------------------------------------------
   * Table overflow cues: .table-frame > .table-scroll > table
   *    The frame fades at the right edge while more columns are hidden;
   *    the .table-meta row above shows "Scroll for more columns".
   *    A table:update event on the scroller re-measures (view toggles).
   * ------------------------------------------------------------------ */
  function initTables() {
    $$('.table-scroll').forEach(function (sc) {
      var frame = sc.closest('.table-frame') || sc.parentNode;
      var fig = frame.closest('.table-figure') || frame.parentNode;
      // the meta row next to this frame (sub-tables have their own), else the figure's
      var scope = $(':scope > .table-meta', frame.parentNode) ? frame.parentNode : fig;
      var meta = scope ? $(':scope > .table-meta', scope) : null;
      var table = $('table', sc), stickyTh = table ? $('thead .col-method', table) : null;
      function update() {
        if (stickyTh) table.style.setProperty('--sticky-w', stickyTh.offsetWidth + 'px');
        var max = sc.scrollWidth - sc.clientWidth;
        var can = max > 1;
        frame.classList.toggle('can-scroll', can);
        frame.classList.toggle('is-scrolled', can && sc.scrollLeft > 1);
        frame.classList.toggle('at-end', !can || sc.scrollLeft >= max - 1);
        if (meta) {
          meta.classList.toggle('can-scroll', $$('.table-frame', scope).some(function (f) {
            return f === frame ? can : f.classList.contains('can-scroll');
          }));
        }
      }
      sc.addEventListener('scroll', update, { passive: true });
      sc.addEventListener('table:update', update);
      if ('ResizeObserver' in window) {
        // watch the table too: a web-font swap can change its width while the scroller keeps its size
        var ro = new ResizeObserver(update);
        ro.observe(sc);
        if (table) ro.observe(table);
      } else window.addEventListener('resize', update);
      update();
    });
  }

  window.Family = {
    $: $, $$: $$, reduceMotion: reduceMotion, scrollBehavior: scrollBehavior, onReady: onReady,
    revealInRow: revealInRow, openDialog: openDialog, wireDialog: wireDialog, closeDialog: closeDialog,
    openLightbox: openLightbox, copyText: copyText
  };

  onReady(function () {
    initAnimatedDetails();
    initPending();
    initNav();
    initLightbox();
    initTabs();
    initTables();
    initCopy();
  });
})();
