(function () {
  'use strict';

  var STORAGE_KEY = 'f1site-cin-intro-v1';
  var TOTAL_MS = 6500;
  var docEl = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isHome = document.body && document.body.getAttribute('data-page') === 'home';
  var lite =
    window.matchMedia('(max-width: 768px)').matches ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);

  // Decide as early as possible whether this page will play the intro.
  var shouldPlay =
    isHome &&
    !reduced &&
    !/(\?|&)nointro=1(?:&|$)/.test(window.location.search) &&
    sessionStorage.getItem(STORAGE_KEY) !== '1';

  if (shouldPlay) {
    docEl.classList.add('cin-pending');
  } else {
    docEl.classList.add('cin-skip-intro');
    return;
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    // Wait a frame so layout.js has injected header/logo/footer.
    requestAnimationFrame(function () {
      requestAnimationFrame(boot);
    });
  });

  function boot() {
    var body = document.body;
    var world = ensureSiteWorld(body);
    var root = buildStage(lite);
    body.appendChild(root);

    var portal = root.querySelector('.cin-screen-portal');
    var skipBtn = root.querySelector('.cin-skip');
    var canvas = root.querySelector('.cin-particles');
    var finished = false;
    var timers = [];

    // Mount the live site into the monitor screen (seamless portal).
    portal.appendChild(world);
    docEl.classList.remove('cin-pending');
    docEl.classList.add('cin-playing');
    root.setAttribute('aria-hidden', 'false');

    if (canvas && !lite) {
      startParticles(canvas);
    }

    function after(ms, fn) {
      timers.push(window.setTimeout(fn, ms));
    }

    function clearTimers() {
      timers.forEach(function (id) {
        clearTimeout(id);
      });
      timers = [];
    }

    var camera = root.querySelector('.cin-camera');
    var cameraAnim = null;
    var duration = lite ? 3800 : TOTAL_MS;
    var handedOff = false;

    function handoffSite() {
      if (handedOff) return;
      handedOff = true;
      restoreSiteWorld(body, world);
      docEl.classList.add('cin-handoff');
    }

    function finish(skipped) {
      if (finished) return;
      finished = true;
      clearTimers();
      if (cameraAnim) {
        try { cameraAnim.cancel(); } catch (err) {}
      }

      sessionStorage.setItem(STORAGE_KEY, '1');
      handoffSite();
      root.classList.add('is-through');
      root.classList.add('is-done');
      docEl.classList.remove('cin-playing');
      docEl.classList.add('cin-complete');

      after(skipped ? 200 : 420, function () {
        if (root.parentNode) root.parentNode.removeChild(root);
        window.dispatchEvent(
          new CustomEvent('f1site:intro-done', { detail: { skipped: !!skipped } })
        );
      });
    }

    function skip() {
      finish(true);
    }

    skipBtn.addEventListener('click', skip);
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        skip();
      }
    });

    cameraAnim = camera.animate(
      [
        {
          offset: 0,
          opacity: 0,
          filter: 'blur(10px)',
          transform: 'translate3d(0, 48px, -520px) rotateX(16deg) scale(0.68)'
        },
        {
          offset: lite ? 0.28 : 0.3,
          opacity: 1,
          filter: 'blur(0px)',
          transform: 'translate3d(0, 10px, -180px) rotateX(8deg) scale(0.88)'
        },
        {
          offset: lite ? 0.55 : 0.6,
          opacity: 1,
          filter: 'blur(0.2px)',
          transform: 'translate3d(0, -6px, 40px) rotateX(3deg) scale(1.05)'
        },
        {
          offset: lite ? 0.78 : 0.82,
          opacity: 1,
          filter: 'blur(0.8px)',
          transform: 'translate3d(0, -18px, 320px) rotateX(0.4deg) scale(1.72)'
        },
        {
          offset: 1,
          opacity: 0,
          filter: 'blur(5px)',
          transform: 'translate3d(0, -26px, 780px) rotateX(0deg) scale(3.1)'
        }
      ],
      {
        duration: duration,
        easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
        fill: 'forwards'
      }
    );

    root.classList.add('is-reveal');
    if (lite) root.classList.add('is-lite');

    after(lite ? 1100 : 2000, function () {
      root.classList.add('is-approach');
    });
    after(lite ? 2200 : 4000, function () {
      root.classList.add('is-accelerate');
    });
    // Pass-through: place the real page under the overlay, then dissolve chrome.
    after(lite ? 3000 : 5200, function () {
      root.classList.add('is-through');
      handoffSite();
    });

    if (cameraAnim && cameraAnim.finished) {
      cameraAnim.finished.then(function () {
        finish(false);
      }).catch(function () {});
    }

    after(duration + 120, function () {
      finish(false);
    });
  }

  function ensureSiteWorld(body) {
    var existing = document.getElementById('site-world');
    if (existing) return existing;

    var world = document.createElement('div');
    world.id = 'site-world';

    var children = Array.prototype.slice.call(body.children);
    children.forEach(function (el) {
      if (el.tagName === 'SCRIPT') return;
      if (el.id === 'cinematic-intro') return;
      world.appendChild(el);
    });
    body.insertBefore(world, body.firstChild);
    return world;
  }

  function restoreSiteWorld(body, world) {
    // Unwrap: put children back on body, remove wrapper.
    if (!world || world.id !== 'site-world') return;
    var parent = world.parentNode;
    if (!parent) return;

    // If still inside portal, move wrapper to body first.
    if (parent !== body) {
      body.insertBefore(world, body.firstChild);
    }

    while (world.firstChild) {
      body.insertBefore(world.firstChild, world);
    }
    if (world.parentNode) world.parentNode.removeChild(world);
  }

  function buildStage(isLite) {
    var root = document.createElement('div');
    root.className = 'cin-root';
    root.id = 'cinematic-intro';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Cinematic introduction');
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML =
      '<button type="button" class="cin-skip">Skip</button>' +
      '<div class="cin-atmosphere" aria-hidden="true"></div>' +
      (isLite ? '' : '<canvas class="cin-particles" width="1920" height="1080" aria-hidden="true"></canvas>') +
      '<div class="cin-viewport">' +
        '<div class="cin-camera">' +
          '<div class="cin-desk" aria-hidden="true"></div>' +
          '<div class="cin-monitor">' +
            '<div class="cin-monitor-glow"></div>' +
            '<div class="cin-bezel">' +
              '<div class="cin-screen-frame">' +
                '<div class="cin-screen-portal"></div>' +
                '<div class="cin-screen-glass"></div>' +
              '</div>' +
            '</div>' +
            '<div class="cin-stand-neck"></div>' +
            '<div class="cin-stand-base"></div>' +
          '</div>' +
          '<div class="cin-keyboard" aria-hidden="true"></div>' +
          '<div class="cin-mouse" aria-hidden="true"></div>' +
        '</div>' +
      '</div>' +
      '<div class="cin-bloom" aria-hidden="true"></div>' +
      '<div class="cin-vignette" aria-hidden="true"></div>' +
      (isLite ? '' : '<div class="cin-grain" aria-hidden="true"></div>');

    return root;
  }

  function startParticles(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.min(48, Math.floor((w * h) / 35000));
    var dots = [];
    var i;
    for (i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        s: Math.random() * 0.25 + 0.05,
        a: Math.random() * 0.35 + 0.08
      });
    }

    var running = true;
    var raf;

    function frame() {
      if (!running || !canvas.isConnected) return;
      ctx.clearRect(0, 0, w, h);
      for (i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.y -= d.s;
        if (d.y < -4) {
          d.y = h + 4;
          d.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,' + d.a.toFixed(3) + ')';
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    // Auto-stop when intro root is removed.
    var obs = new MutationObserver(function () {
      if (!canvas.isConnected) {
        running = false;
        cancelAnimationFrame(raf);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
})();
