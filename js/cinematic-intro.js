(function () {
  'use strict';

  var STORAGE_KEY = 'f1site-cin-intro-v2';
  var TOTAL_MS = 7200;
  var docEl = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isHome = document.body && document.body.getAttribute('data-page') === 'home';
  var lite = window.matchMedia('(max-width: 768px)').matches;

  var shouldPlay =
    isHome &&
    !reduced &&
    !/(?:\?|&)nointro=1(?:&|$)/.test(window.location.search) &&
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
    requestAnimationFrame(boot);
  });

  function boot() {
    var body = document.body;
    var root = buildStage();
    body.appendChild(root);

    var skipBtn = root.querySelector('.cin-skip');
    var finished = false;
    var timers = [];
    var duration = lite ? 5200 : TOTAL_MS;

    docEl.classList.remove('cin-pending');
    docEl.classList.add('cin-playing');
    root.setAttribute('aria-hidden', 'false');

    function after(ms, fn) {
      timers.push(window.setTimeout(fn, ms));
    }

    function clearTimers() {
      timers.forEach(function (id) {
        clearTimeout(id);
      });
      timers = [];
    }

    function finish(skipped) {
      if (finished) return;
      finished = true;
      clearTimers();

      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch (err) {}

      root.classList.add('is-release');
      root.classList.add('is-done');
      docEl.classList.remove('cin-playing');
      docEl.classList.add('cin-complete');

      window.dispatchEvent(
        new CustomEvent('f1site:intro-done', { detail: { skipped: !!skipped } })
      );

      after(skipped ? 180 : 480, function () {
        if (root.parentNode) root.parentNode.removeChild(root);
      });
    }

    skipBtn.addEventListener('click', function () {
      finish(true);
    });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        finish(true);
      }
    });

    after(40, function () {
      root.classList.add('is-reveal');
      var fade = root.querySelector('.cin-fade');
      if (fade) fade.style.opacity = '0';
    });
    after(lite ? 900 : 1400, function () {
      root.classList.add('is-title');
    });
    after(lite ? 2000 : 2800, function () {
      root.classList.add('is-tag');
    });
    after(lite ? 3800 : 5600, function () {
      root.classList.add('is-release');
    });
    after(duration, function () {
      finish(false);
    });
  }

  function buildStage() {
    var root = document.createElement('div');
    root.className = 'cin-root';
    root.id = 'cinematic-intro';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Cinematic introduction');
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML =
      '<button type="button" class="cin-skip">Skip</button>' +
      '<div class="cin-fade" aria-hidden="true"></div>' +
      '<div class="cin-letterbox cin-letterbox-top" aria-hidden="true"></div>' +
      '<div class="cin-letterbox cin-letterbox-bottom" aria-hidden="true"></div>' +
      '<div class="cin-titles">' +
        '<div>' +
          '<p class="cin-kicker">A design studio</p>' +
          '<h1 class="cin-title">F1site</h1>' +
          '<p class="cin-tagline">Digital experiences built for organizations that demand excellence.</p>' +
        '</div>' +
      '</div>';

    return root;
  }
})();
