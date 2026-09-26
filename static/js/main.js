/* MotionMaestro project page: video cards (lazy + in-view autoplay), switchers (task picker,
   dataset rows, clip and figure strips), video lightbox, strip edge fades, thumbnail loading.
   Vanilla JS, no dependencies. Runs after family.js (nav, hero, tables, disclosures, image
   lightbox, BibTeX), whose helpers it takes from window.Family. */
(function () {
  'use strict';

  var F = window.Family;
  var $ = F.$, $$ = F.$$;
  var reduceMotion = F.reduceMotion;
  var phonePortrait = window.matchMedia ? window.matchMedia('(max-width: 640px) and (orientation: portrait)') : { matches: false };
  var hasIO = 'IntersectionObserver' in window;

  var svg = function (body, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + body + '</svg>';
  };
  var ICON = {
    play: svg('<path d="M7 4.8v14.4L19 12z" fill="currentColor" stroke="none"/>', ' class="i-play"'),
    pause: svg('<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>', ' class="i-pause"'),
    bigPlay: svg('<path d="M7 4.8v14.4L19 12z" fill="currentColor" stroke="none"/>'),
    expand: svg('<path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/>'),
    close: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    fullscreen: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };
  var dialogOpen = function () { return document.documentElement.classList.contains('has-dialog'); };

  /* ------------------------------------------------------------------
     Video cards
        <video data-src data-poster muted loop playsinline preload="none">
        - poster attached ~1200px before the card scrolls in
        - src attached ~300px before (so nothing downloads up front); a clip
          that scrolls out of that zone before it ever played is detached again
        - plays only while >= 15% visible; pauses when scrolled away,
          when its tab/slide is hidden, or when the browser tab is hidden
        - prefers-reduced-motion: never autoplays; a play button is shown
     ------------------------------------------------------------------ */
  var Videos = (function () {
    var inView = new Set();
    var posterIO, loadIO, playIO;

    function cardOf(v) { return v.closest('.vcard'); }
    function attachPoster(v) {
      var p = v.getAttribute('data-poster');
      if (p && !v.getAttribute('poster')) v.setAttribute('poster', p);
    }
    function attachSrc(v) {
      if (v.getAttribute('src') || !v.getAttribute('data-src')) return;
      v.preload = 'auto';
      v.setAttribute('src', v.getAttribute('data-src'));
      var c = cardOf(v);
      if (c) c.classList.add('is-loading');
    }
    // a clip that left the load zone before it ever played: drop the request (fast scrolling)
    function detachSrc(v) {
      if (v.__played || !v.getAttribute('data-src') || !v.getAttribute('src') || v.readyState >= 3) return;
      v.removeAttribute('src');
      v.load();
      var c = cardOf(v);
      if (c) c.classList.remove('is-loading');
    }
    function srcOf(v) { return v.getAttribute('data-src') || v.currentSrc || v.getAttribute('src'); }
    function held(v) { return v.getAttribute('data-hold') === '1'; }
    function canAutoplay(v) {
      return !reduceMotion.matches && !held(v) && !document.hidden && !dialogOpen();
    }
    function play(v) {
      attachPoster(v);
      attachSrc(v);
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay refused: poster stays */ });
    }
    function pause(v) { if (!v.paused) v.pause(); }
    // attach posters of videos that just became visible (skips ones still inside a hidden panel)
    function primePosters(root) { $$('video', root).forEach(function (v) { if (!v.closest('[hidden]')) attachPoster(v); }); }
    function pauseWithin(root) { $$('video', root).forEach(function (v) { pause(v); inView.delete(v); }); }
    function pauseAll() { $$('.vcard video').forEach(pause); }
    function resumeVisible() { inView.forEach(function (v) { if (canAutoplay(v)) play(v); }); }

    function setRate(card, v, rate) {
      v.defaultPlaybackRate = rate;
      v.playbackRate = rate;
      $$('.speed [data-rate]', card).forEach(function (b) {
        b.setAttribute('aria-pressed', String(parseFloat(b.getAttribute('data-rate')) === rate));
      });
    }

    function buildTools(card) {
      var bar = $('.vcard-bar', card);
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'vcard-bar';
        card.appendChild(bar);
      }
      if ($('.vcard-tools', bar)) return;
      var tools = document.createElement('div');
      tools.className = 'vcard-tools';
      tools.innerHTML =
        '<button type="button" class="tool-btn" data-action="toggle" aria-label="Pause video">' + ICON.pause + ICON.play +
        '<span class="lbl-optional" data-label>Pause</span></button>' +
        '<div class="speed" role="group" aria-label="Playback speed">' +
        '<button type="button" data-rate="0.5" aria-pressed="false">0.5×</button>' +
        '<button type="button" data-rate="1" aria-pressed="true">1×</button></div>' +
        '<button type="button" class="tool-btn" data-action="expand" aria-label="Enlarge video">' + ICON.expand +
        '<span>Enlarge</span></button>';
      bar.appendChild(tools);
    }

    function updateToggle(card, v) {
      var btn = $('[data-action="toggle"]', card);
      if (!btn) return;
      var playing = !v.paused;
      btn.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
      var l = $('[data-label]', btn);
      if (l) l.textContent = playing ? 'Pause' : 'Play';
    }

    function setupCard(card) {
      var v = $('video', card);
      if (!v || card.__mmReady) return;
      card.__mmReady = true;
      v.muted = true;
      v.setAttribute('muted', '');
      v.playsInline = true;
      v.loop = true;
      // JS owns playback from here: the autoplay attribute is only a no-JS fallback
      if (v.autoplay || v.hasAttribute('autoplay')) { v.autoplay = false; v.removeAttribute('autoplay'); }
      if (reduceMotion.matches) {
        if (!v.paused) v.pause();
        card.classList.add('is-held');
      }
      buildTools(card);

      var media = $('.vcard-media', card);
      if (media && !$('.vcard-play', media)) {
        var big = document.createElement('button');
        big.type = 'button';
        big.className = 'vcard-play';
        big.setAttribute('aria-label', 'Play video');
        big.innerHTML = ICON.bigPlay;
        media.appendChild(big);
      }

      updateToggle(card, v);
      v.addEventListener('playing', function () { v.__played = true; card.classList.add('is-playing'); card.classList.remove('is-loading'); updateToggle(card, v); });
      v.addEventListener('pause', function () { card.classList.remove('is-playing'); updateToggle(card, v); });
      v.addEventListener('waiting', function () { if (!v.paused) card.classList.add('is-loading'); });
      v.addEventListener('canplay', function () { card.classList.remove('is-loading'); });
      v.addEventListener('error', function () { card.classList.remove('is-loading'); });

      card.addEventListener('click', function (e) {
        var t = e.target;
        var action = t.closest('[data-action]');
        var rateBtn = t.closest('.speed [data-rate]');
        if (t.closest('.vcard-play')) {
          v.setAttribute('data-hold', '0');
          if (!reduceMotion.matches) card.classList.remove('is-held');
          play(v);
          return;
        }
        if (rateBtn) { setRate(card, v, parseFloat(rateBtn.getAttribute('data-rate'))); return; }
        if (action) {
          var a = action.getAttribute('data-action');
          if (a === 'toggle') {
            if (v.paused) {
              v.setAttribute('data-hold', '0');
              if (!reduceMotion.matches) card.classList.remove('is-held');
              play(v);
            } else {
              v.setAttribute('data-hold', '1');
              card.classList.add('is-held');
              pause(v);
            }
          } else if (a === 'expand') {
            openInLightbox(card, v, action);
          }
          return;
        }
        // clicking the picture itself: focus goes back to the Enlarge button on close
        if (t.closest('.vcard-media')) openInLightbox(card, v, $('[data-action="expand"]', card) || t.closest('.vcard-media'));
      });
    }

    function openInLightbox(card, v, trigger) {
      var label = $('.vcard-label', card);
      var prompt = $('.vcard-prompt', card);
      var cap = $('.vcard-caption', card);
      Lightbox.openVideo({
        src: srcOf(v),
        poster: v.getAttribute('poster') || v.getAttribute('data-poster') || '',
        title: card.getAttribute('data-title') || (label ? label.textContent.trim() : ''),
        caption: prompt ? '“' + prompt.textContent.trim() + '”' : (cap ? cap.textContent.trim() : ''),
        time: v.currentTime || 0,
        rate: v.playbackRate || 1,
        trigger: trigger
      });
      // a portrait phone gains almost nothing from the dialog: go fullscreen inside the same tap
      if (phonePortrait.matches) Lightbox.fullscreen(true);
    }

    function init() {
      var cards = $$('.vcard');
      cards.forEach(setupCard);
      var vids = cards.map(function (c) { return $('video', c); }).filter(Boolean);

      if (!hasIO) {
        vids.forEach(function (v) { attachPoster(v); if (!reduceMotion.matches) play(v); });
        return;
      }
      posterIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { attachPoster(e.target); posterIO.unobserve(e.target); } });
      }, { rootMargin: '1200px 0px' });
      loadIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) { if (!reduceMotion.matches && !held(v)) attachSrc(v); }
          else detachSrc(v);
        });
      }, { rootMargin: '300px 0px' });
      playIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting && e.intersectionRatio >= 0.15) {
            inView.add(v);
            if (canAutoplay(v)) play(v);
          } else {
            inView.delete(v);
            pause(v);
          }
        });
      }, { threshold: [0, 0.15, 0.5] });
      vids.forEach(function (v) { posterIO.observe(v); loadIO.observe(v); playIO.observe(v); });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) pauseAll(); else resumeVisible();
      });
    }

    return { init: init, pauseWithin: pauseWithin, primePosters: primePosters, pauseAll: pauseAll, resumeVisible: resumeVisible };
  })();

  /* ------------------------------------------------------------------
     Switchers — one implementation for task tabs, segmented toggles
        and carousels. Markup: [data-switch] > [role=tablist] > [role=tab]
        with aria-controls -> panel id. Optional [data-prev] [data-next]
        [data-count] inside the same [data-switch].
     ------------------------------------------------------------------ */
  function own(root, sel) {
    return $$(sel, root).filter(function (el) { return el.closest('[data-switch]') === root; });
  }
  function keepTabVisible(tab) {
    F.revealInRow(tab.closest('.hscroll, .chip-row, .tablist'), tab, 32);
  }
  function initSwitchers() {
    $$('[data-switch]').forEach(function (root) {
      var list = own(root, '[role="tablist"]')[0];
      if (!list) return;
      var tabs = $$('[role="tab"]', list);
      var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
      var current = 0;
      // a strip placed under its slides (hero gallery): keep it under the finger when the new slide is taller or shorter
      var bar = own(root, '.carousel-nav')[0] || list;
      var barBelow = !!(panels[0] && (bar.compareDocumentPosition(panels[0]) & Node.DOCUMENT_POSITION_PRECEDING));

      function select(i, focus, silent) {
        var y0 = (barBelow && !silent) ? bar.getBoundingClientRect().top : null;
        i = (i + tabs.length) % tabs.length;
        current = i;
        tabs.forEach(function (t, k) {
          var on = k === i;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var p = panels[k];
          if (!p) return;
          if (on) { p.hidden = false; if (!silent) Videos.primePosters(p); }
          else if (!p.hidden) { p.hidden = true; Videos.pauseWithin(p); }
        });
        if (y0 !== null) {
          var dy = bar.getBoundingClientRect().top - y0;
          if (Math.abs(dy) > 1) {
            try { window.scrollBy({ top: dy, left: 0, behavior: 'instant' }); } catch (err) { window.scrollBy(0, dy); }
          }
        }
        if (focus) tabs[i].focus({ preventScroll: true });
        if (!silent) keepTabVisible(tabs[i]);
        own(root, '[data-count]').forEach(function (c) { c.textContent = (i + 1) + ' / ' + tabs.length; });
      }

      tabs.forEach(function (t, k) {
        t.addEventListener('click', function () { select(k); });
        t.addEventListener('keydown', function (e) {
          var n = null;
          if (e.key === 'ArrowRight') n = current + 1;
          else if (e.key === 'ArrowLeft') n = current - 1;
          else if (e.key === 'Home') n = 0;
          else if (e.key === 'End') n = tabs.length - 1;
          if (n !== null) { e.preventDefault(); select(n, true); }
        });
      });
      own(root, '[data-prev]').forEach(function (b) { b.addEventListener('click', function () { select(current - 1); }); });
      own(root, '[data-next]').forEach(function (b) { b.addEventListener('click', function () { select(current + 1); }); });

      var initial = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
      select(initial < 0 ? 0 : initial, false, true);
    });
  }

  /* ------------------------------------------------------------------
     Video lightbox: the family lightbox chrome (bar with title and
     buttons, stage, caption) around a video with controls, a speed
     toggle and fullscreen. Images use the family image lightbox.
     Esc / backdrop / close button all close it.
     ------------------------------------------------------------------ */
  var Lightbox = (function () {
    var dlg, stage, titleEl, capEl, video = null;

    function build() {
      if (dlg) return;
      dlg = document.createElement('dialog');
      dlg.className = 'lightbox lightbox--video';
      dlg.setAttribute('aria-label', 'Video viewer');
      dlg.innerHTML =
        '<div class="lb-bar"><p class="lb-title"></p><div class="lb-actions">' +
        '<div class="speed" role="group" aria-label="Playback speed">' +
        '<button type="button" data-rate="0.5" aria-pressed="false">0.5×</button>' +
        '<button type="button" data-rate="1" aria-pressed="true">1×</button></div>' +
        '<button type="button" class="lb-btn" data-lb="fs" aria-label="Fullscreen">' + ICON.fullscreen + '<span class="lb-btn-text">Fullscreen</span></button>' +
        '<button type="button" class="lb-btn lb-btn--icon" data-lb="close" aria-label="Close">' + ICON.close + '</button>' +
        '</div></div>' +
        '<div class="lb-stage"></div>' +
        '<div class="lb-caption"></div>' +
        '<p class="lb-hint">Turn your phone sideways or tap fullscreen for a larger view.</p>';
      document.body.appendChild(dlg);
      stage = $('.lb-stage', dlg);
      titleEl = $('.lb-title', dlg);
      capEl = $('.lb-caption', dlg);

      dlg.addEventListener('click', function (e) {
        var t = e.target;
        if (t === dlg || t === stage) { close(); return; }
        var b = t.closest('[data-lb]');
        if (b && b.getAttribute('data-lb') === 'close') close();
        if (b && b.getAttribute('data-lb') === 'fs' && video) fullscreen(false);
        var r = t.closest('.speed [data-rate]');
        if (r && video) setRate(parseFloat(r.getAttribute('data-rate')));
      });
      F.wireDialog(dlg, cleanup);
    }

    // auto = entered on open (phones in portrait): leaving fullscreen then also closes the dialog
    function fullscreen(auto) {
      var v = video;
      if (!v) return;
      var done = function () {
        if (screen.orientation && screen.orientation.unlock) { try { screen.orientation.unlock(); } catch (e) { /* ignore */ } }
        if (auto && video === v) close();
      };
      if (v.requestFullscreen) {
        v.requestFullscreen().then(function () {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
          var onChange = function () {
            if (document.fullscreenElement) return;
            document.removeEventListener('fullscreenchange', onChange);
            done();
          };
          document.addEventListener('fullscreenchange', onChange);
        }).catch(function () { /* stays in the dialog */ });
      } else if (v.webkitEnterFullscreen) {
        try {
          v.webkitEnterFullscreen();
          v.addEventListener('webkitendfullscreen', done, { once: true });
        } catch (e) { /* not ready yet (iOS): stays in the dialog */ }
      }
    }

    function setRate(rate) {
      if (video) { video.defaultPlaybackRate = rate; video.playbackRate = rate; }
      $$('.speed [data-rate]', dlg).forEach(function (b) {
        b.setAttribute('aria-pressed', String(parseFloat(b.getAttribute('data-rate')) === rate));
      });
    }

    function openVideo(opts) {
      build();
      stage.innerHTML = '';
      video = document.createElement('video');
      video.controls = true;
      video.loop = true;
      video.muted = true;
      video.setAttribute('muted', '');
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.preload = 'auto';
      if (opts.poster) video.poster = opts.poster;
      var t0 = opts.time || 0;
      if (t0 > 0) video.addEventListener('loadedmetadata', function () { try { video.currentTime = t0; } catch (e) { /* ignore */ } }, { once: true });
      video.src = opts.src;
      stage.appendChild(video);
      setRate(opts.rate || 1);
      titleEl.textContent = opts.title || '';
      capEl.textContent = opts.caption || '';
      F.openDialog(dlg);
      if (opts.trigger) dlg._returnFocus = opts.trigger;
      var c = $('[data-lb="close"]', dlg);
      if (c) c.focus({ preventScroll: true });
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }

    function close() { if (dlg) F.closeDialog(dlg); }

    function cleanup() {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();            // aborts any pending download
        video = null;
      }
      stage.innerHTML = '';
    }

    return { openVideo: openVideo, close: close, fullscreen: fullscreen };
  })();

  /* ------------------------------------------------------------------
     Horizontal scroll edges: thumbnail strips fade at the side that
     has more (tables: family.js)
     ------------------------------------------------------------------ */
  function initScrollEdges() {
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function (es) { es.forEach(function (e) { if (e.target.__edge) e.target.__edge(); }); }) : null;
    $$('.hscroll').forEach(function (sc) {
      var fn = function () {
        var max = sc.scrollWidth - sc.clientWidth;
        sc.classList.toggle('fade-l', max > 2 && sc.scrollLeft > 2);
        sc.classList.toggle('fade-r', max > 2 && sc.scrollLeft < max - 2);
      };
      sc.__edge = fn;
      sc.addEventListener('scroll', fn, { passive: true });
      if (ro) ro.observe(sc);
      window.addEventListener('resize', fn);
      fn();
    });
  }

  /* ------------------------------------------------------------------
     Thumbnail strips: once a strip is near the viewport, load all of
         its thumbnails, including those still scrolled off to the side
     ------------------------------------------------------------------ */
  function initThumbs() {
    var strips = $$('.thumbs');
    var eager = function (strip) { $$('img[loading="lazy"]', strip).forEach(function (img) { img.loading = 'eager'; }); };
    if (!hasIO) { strips.forEach(eager); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { eager(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '400px 0px' });
    strips.forEach(function (s) { io.observe(s); });
  }

  /* ------------------------------------------------------------------
     Hero logo: "Mae" reconstructs halfway from masked tokens (style.css, section 2)
        - starts once the page has painted and the logo is on screen, so a
          slow load or a restored scroll position does not hide it
        - hovering or clicking the logo replays it
     ------------------------------------------------------------------ */
  function initMae() {
    var root = document.documentElement, logo = $('.hero-logo-mae');
    window.__maeArmed = true;
    if (!logo || reduceMotion.matches) { root.classList.add('mae-go'); return; }
    var busy = false, started = false;
    var play = function () {
      if (busy) return;
      busy = true;
      root.classList.remove('mae-go');
      void logo.offsetWidth;
      root.classList.add('mae-go');
      setTimeout(function () { busy = false; }, 2100);
    };
    var start = function () { if (started) return; started = true; requestAnimationFrame(function () { requestAnimationFrame(play); }); };
    var fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1200); })]) : Promise.resolve();
    fontsReady.then(function () {
      if (!hasIO) { start(); return; }
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && document.visibilityState !== 'hidden') { io.disconnect(); start(); }
      }, { threshold: 0.6 });
      io.observe(logo);
      document.addEventListener('visibilitychange', function () { if (!started && document.visibilityState === 'visible') { io.disconnect(); io.observe(logo); } });
    });
    logo.addEventListener('mouseenter', function () { if (started) play(); });
    logo.addEventListener('click', function () { if (started) play(); });
  }

  // an open dialog (family image lightbox or the video lightbox) pauses the clips behind it
  document.addEventListener('family:dialog', function (e) {
    if (e.detail && e.detail.open) Videos.pauseAll(); else Videos.resumeVisible();
  });

  F.onReady(function () {
    initMae();
    Videos.init();
    initSwitchers();
    initScrollEdges();
    initThumbs();
  });
})();
