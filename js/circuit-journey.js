/**
 * Circuit Journey — scroll-driven F1 path animation
 * Works on all main site pages with per-page track layouts.
 */
(function () {
  'use strict';

  var body = document.body;
  if (!body) return;

  var page = body.getAttribute('data-page') || '';
  var ALLOWED = {
    home: true,
    about: true,
    services: true,
    process: true,
    work: true,
    contact: true
  };
  if (!ALLOWED[page]) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 768px)').matches;

  body.classList.add('has-circuit');
  body.classList.add('circuit-page-' + page);

  /* Per-page track geometries — same language, different routes */
  var PATHS = {
    home:
      'M 140 160 C 380 140 640 160 820 240 C 980 320 1040 460 980 600 C 910 760 720 820 540 800 C 360 780 260 880 280 1040 C 305 1240 480 1340 680 1380 C 900 1425 1040 1560 1000 1740 C 960 1920 780 2020 560 2060 C 360 2095 240 2220 280 2360',
    about:
      'M 200 180 C 480 160 780 200 960 320 C 1100 420 1080 600 940 720 C 780 860 520 900 360 1040 C 220 1160 240 1380 400 1520 C 580 1680 860 1740 1000 1920 C 1100 2050 1040 2240 860 2340 C 680 2440 420 2420 300 2280',
    services:
      'M 160 200 C 420 140 760 160 980 280 C 1120 380 1100 560 960 680 C 800 820 560 860 420 1000 C 280 1140 300 1360 480 1480 C 680 1620 940 1680 1040 1880 C 1120 2040 1040 2220 860 2300 C 640 2400 360 2360 260 2180',
    process:
      'M 220 140 C 500 120 820 180 1000 300 C 1120 400 1060 580 900 700 C 720 840 480 880 340 1040 C 200 1200 240 1440 420 1580 C 620 1740 900 1800 1020 1980 C 1120 2120 1060 2300 880 2380 C 660 2480 380 2440 280 2260',
    work:
      'M 180 200 C 460 120 800 140 1020 260 C 1140 360 1100 540 940 680 C 760 840 500 900 360 1080 C 240 1220 280 1460 460 1600 C 660 1760 940 1820 1060 2000 C 1140 2140 1080 2320 900 2400 C 680 2500 400 2460 280 2280',
    contact:
      'M 240 160 C 560 140 880 200 1040 340 C 1140 440 1100 620 940 760 C 760 920 480 980 340 1160 C 220 1300 260 1540 440 1680 C 640 1840 920 1900 1040 2080 C 1120 2220 1060 2380 880 2440 C 640 2520 360 2460 260 2280'
  };

  var PATH_D = PATHS[page] || PATHS.home;

  var CAR_SRC = 'assets/circuit/mclaren-f1-web.png';
  var VIDEO_SRC = 'assets/circuit/ocean-waves-fast.mp4';
  var POSTER_SRC = 'assets/circuit/ocean-poster.jpg';

  var CAR_HEADING_OFFSET = 0;
  var SMOOTH = mobile ? 0.14 : 0.1;

  var ocean;
  var stage;
  var camera;
  var pathEl;
  var car;
  var carBob;
  var progressBar;
  var loader;
  var pathLength = 1;
  var targetProgress = 0;
  var currentProgress = 0;
  var lastProgress = 0;
  var raf = 0;
  var live = false;
  var resizeTimer = 0;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function buildDOM() {
    if (page === 'home' && !reduced && !document.documentElement.classList.contains('cin-pending')) {
      loader = document.createElement('div');
      loader.className = 'circuit-loader';
      loader.setAttribute('aria-hidden', 'true');
      loader.innerHTML =
        '<div class="circuit-loader-inner">' +
        '<div class="circuit-loader-label">Ignition</div>' +
        '<div class="circuit-loader-line"><span></span></div>' +
        '</div>';
      body.appendChild(loader);
    }

    ocean = document.createElement('div');
    ocean.className = 'circuit-ocean';
    ocean.setAttribute('aria-hidden', 'true');
    ocean.innerHTML =
      '<div class="circuit-ocean-poster" style="background-image:url(\'' + POSTER_SRC + '\')"></div>' +
      '<video muted loop autoplay playsinline webkit-playsinline disablePictureInPicture ' +
      'controlsList="nodownload nofullscreen noremoteplayback" preload="auto">' +
      '<source src="' + VIDEO_SRC + '" type="video/mp4">' +
      '</video>' +
      '<div class="circuit-ocean-veil"></div>';
    body.insertBefore(ocean, body.firstChild);

    stage = document.createElement('div');
    stage.className = 'circuit-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML =
      '<div class="circuit-camera">' +
      '<svg class="circuit-svg" viewBox="0 0 1200 2500" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
      '<linearGradient id="trackSheen-' + page + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="rgba(255,255,255,0.10)"/>' +
      '<stop offset="55%" stop-color="rgba(255,255,255,0.03)"/>' +
      '<stop offset="100%" stop-color="rgba(0,0,0,0.22)"/>' +
      '</linearGradient>' +
      '</defs>' +
      '<path class="track-asphalt" d="' + PATH_D + '"/>' +
      '<path class="track-asphalt-sheen" d="' + PATH_D + '" stroke="url(#trackSheen-' + page + ')"/>' +
      '<path class="track-racing" d="' + PATH_D + '"/>' +
      '<path id="circuitDrivePath" class="track-center" d="' + PATH_D + '"/>' +
      '</svg>' +
      '</div>' +
      '<div class="circuit-car">' +
      '<span class="circuit-car-glow"></span>' +
      '<span class="circuit-car-bob">' +
      '<img src="' + CAR_SRC + '" alt="" width="900" height="392" decoding="async"/>' +
      '</span>' +
      '</div>';
    body.insertBefore(stage, ocean.nextSibling);

    camera = stage.querySelector('.circuit-camera');
    pathEl = stage.querySelector('#circuitDrivePath');
    car = stage.querySelector('.circuit-car');
    carBob = stage.querySelector('.circuit-car-bob');

    progressBar = document.createElement('div');
    progressBar.className = 'circuit-progress';
    progressBar.innerHTML = '<span></span>';
    progressBar.setAttribute('aria-hidden', 'true');
    body.appendChild(progressBar);

    pathLength = pathEl.getTotalLength() || 1;
  }

  function insertMomentSection() {
    if (page !== 'home') return;
    var main = document.querySelector('main');
    var services = main && main.querySelector('.section.services');
    if (!main || !services) return;

    var section = document.createElement('section');
    section.className = 'circuit-moment';
    section.setAttribute('aria-label', 'Circuit journey');
    section.innerHTML =
      '<div class="container">' +
      '<div class="circuit-moment-panel">' +
      '<p class="section-eyebrow">The circuit</p>' +
      '<h2 class="section-title">One continuous line from brief to launch</h2>' +
      '<p class="section-desc">Scroll to drive. The track connects every stage of the work — discovery, design, build, and the long straight of maintenance.</p>' +
      '</div>' +
      '</div>';
    main.insertBefore(section, services);
  }

  function setLoaderProgress(p) {
    if (!loader) return;
    var bar = loader.querySelector('.circuit-loader-line > span');
    if (bar) bar.style.width = clamp(p, 0, 1) * 100 + '%';
  }

  function finishLoader() {
    if (!loader) return;
    setLoaderProgress(1);
    window.setTimeout(function () {
      loader.classList.add('is-done');
    }, 180);
  }

  function setupVideo() {
    var video = ocean.querySelector('video');
    if (!video) {
      ocean.classList.add('is-ready');
      return Promise.resolve();
    }

    ocean.classList.add('is-ready');

    if (reduced) {
      return Promise.resolve();
    }

    // Prefer a direct src — more reliable autoplay than nested <source> on refresh.
    if (!video.getAttribute('src')) {
      video.setAttribute('src', VIDEO_SRC);
    }

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.removeAttribute('controls');
    video.removeAttribute('poster');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('disablePictureInPicture', '');
    video.preload = 'auto';

    var unlockBound = false;
    var playTimer = 0;
    var pauseTimer = 0;
    var trying = false;

    function markPlaying() {
      if (!video.paused && !video.ended) {
        ocean.classList.add('is-playing');
      }
      if (playTimer) {
        window.clearInterval(playTimer);
        playTimer = 0;
      }
    }

    function tryPlay() {
      if (!video || trying) return;
      if (!video.paused && !video.ended) {
        markPlaying();
        return;
      }

      trying = true;
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;

      var attempt;
      try {
        attempt = video.play();
      } catch (err) {
        trying = false;
        bindUnlock();
        return;
      }

      if (attempt && attempt.then) {
        attempt
          .then(function () {
            trying = false;
            markPlaying();
          })
          .catch(function () {
            trying = false;
            bindUnlock();
          });
      } else {
        trying = false;
        if (!video.paused) markPlaying();
        else bindUnlock();
      }
    }

    function bindUnlock() {
      if (unlockBound) return;
      unlockBound = true;
      var events = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll', 'click'];
      var unlock = function () {
        tryPlay();
        if (!video.paused) {
          events.forEach(function (name) {
            window.removeEventListener(name, unlock, true);
          });
        }
      };
      events.forEach(function (name) {
        window.addEventListener(name, unlock, { capture: true, passive: true });
      });
    }

    function startWatchdog() {
      if (playTimer) window.clearInterval(playTimer);
      playTimer = window.setInterval(function () {
        if (video.paused || video.ended) tryPlay();
        else markPlaying();
      }, 900);
      window.setTimeout(function () {
        if (playTimer) {
          window.clearInterval(playTimer);
          playTimer = 0;
        }
      }, 60000);
    }

    video.addEventListener('playing', markPlaying);
    video.addEventListener('timeupdate', function () {
      if (!video.paused && video.currentTime > 0.05) markPlaying();
    });
    video.addEventListener('pause', function () {
      // Ignore transient pauses during load/seek — only drop the playing
      // state if it stays paused.
      if (pauseTimer) window.clearTimeout(pauseTimer);
      pauseTimer = window.setTimeout(function () {
        if (video.paused) {
          ocean.classList.remove('is-playing');
          if (!document.hidden) tryPlay();
        }
      }, 250);
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) tryPlay();
    });

    window.addEventListener('pageshow', function () {
      tryPlay();
      startWatchdog();
    });

    window.addEventListener('focus', tryPlay);

    var navObserver = new MutationObserver(function () {
      if (!document.body.classList.contains('nav-open')) tryPlay();
    });
    navObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return new Promise(function (resolve) {
      var settled = false;
      function done() {
        if (settled) return;
        settled = true;
        tryPlay();
        bindUnlock();
        startWatchdog();
        resolve();
      }

      video.addEventListener('loadeddata', function () {
        tryPlay();
        done();
      }, { once: true });
      video.addEventListener('canplay', tryPlay);
      video.addEventListener('canplaythrough', tryPlay);
      video.addEventListener('error', done, { once: true });
      window.setTimeout(done, 1800);

      try {
        video.load();
      } catch (err) {}
      tryPlay();
    });
  }

  function preloadCar() {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = CAR_SRC;
      window.setTimeout(resolve, 2000);
    });
  }

  function scrollProgress() {
    var el = document.documentElement;
    var max = Math.max(1, el.scrollHeight - window.innerHeight);
    return clamp(window.scrollY / max, 0, 1);
  }

  function pointAt(p) {
    var dist = clamp(p, 0, 1) * pathLength;
    var pt = pathEl.getPointAtLength(dist);
    var look = pathEl.getPointAtLength(Math.min(pathLength, dist + 8));
    var angle = (Math.atan2(look.y - pt.y, look.x - pt.x) * 180) / Math.PI;
    return { x: pt.x, y: pt.y, angle: angle };
  }

  function svgPointToScreen(pt) {
    var ctm = pathEl.getScreenCTM();
    if (!ctm) {
      return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.55 };
    }
    return {
      x: ctm.a * pt.x + ctm.c * pt.y + ctm.e,
      y: ctm.b * pt.x + ctm.d * pt.y + ctm.f
    };
  }

  function applyFrame(p, velocity) {
    var sample = pointAt(p);

    camera.style.transform = 'translate3d(0,0,0)';
    var raw = svgPointToScreen(sample);
    var focusX = window.innerWidth * (mobile ? 0.5 : 0.58);
    var focusY = window.innerHeight * (mobile ? 0.58 : 0.62);
    var camX = (focusX - raw.x) * (mobile ? 0.38 : 0.58);
    var camY = (focusY - raw.y) * (mobile ? 0.3 : 0.5);
    camX = clamp(camX, -window.innerWidth * 0.2, window.innerWidth * 0.2);
    camY = clamp(camY, -window.innerHeight * 0.22, window.innerHeight * 0.14);
    camera.style.transform = 'translate3d(' + camX.toFixed(2) + 'px,' + camY.toFixed(2) + 'px,0)';

    var screen = svgPointToScreen(sample);
    var stageRect = stage.getBoundingClientRect();
    var localX = screen.x - stageRect.left;
    var localY = screen.y - stageRect.top;
    var rot = sample.angle + CAR_HEADING_OFFSET;

    car.style.transform =
      'translate3d(' +
      localX.toFixed(2) +
      'px,' +
      localY.toFixed(2) +
      'px,0) translate(-50%, -50%) rotate(' +
      rot.toFixed(2) +
      'deg)';

    var bob = Math.sin(p * Math.PI * 18) * (0.4 + Math.min(1.0, Math.abs(velocity) * 30));
    carBob.style.transform = 'translate3d(0,' + bob.toFixed(2) + 'px,0)';

    if (Math.abs(velocity) > 0.012) car.classList.add('is-fast');
    else car.classList.remove('is-fast');

    if (progressBar) {
      var fill = progressBar.firstElementChild;
      if (fill) fill.style.width = (p * 100).toFixed(2) + '%';
    }
  }

  function tick() {
    raf = 0;
    if (!live) return;

    targetProgress = scrollProgress();
    currentProgress = lerp(currentProgress, targetProgress, reduced ? 1 : SMOOTH);
    var velocity = currentProgress - lastProgress;
    lastProgress = currentProgress;

    applyFrame(currentProgress, velocity);

    if (Math.abs(targetProgress - currentProgress) > 0.00035 || Math.abs(velocity) > 0.0001) {
      raf = requestAnimationFrame(tick);
    }
  }

  function requestTick() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function onScroll() {
    requestTick();
  }

  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      pathLength = pathEl.getTotalLength() || 1;
      mobile = window.matchMedia('(max-width: 768px)').matches;
      currentProgress = scrollProgress();
      targetProgress = currentProgress;
      applyFrame(currentProgress, 0);
    }, 120);
  }

  function activate() {
    if (live) return;
    live = true;
    stage.classList.add('is-live');
    progressBar.classList.add('is-on');
    currentProgress = scrollProgress();
    targetProgress = currentProgress;
    lastProgress = currentProgress;
    applyFrame(currentProgress, 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    requestTick();
  }

  function waitForIntro() {
    return new Promise(function (resolve) {
      if (page !== 'home') {
        resolve();
        return;
      }

      var docEl = document.documentElement;

      function done() {
        resolve();
      }

      if (docEl.classList.contains('cin-complete') || docEl.classList.contains('cin-skip-intro')) {
        done();
        return;
      }

      if (docEl.classList.contains('cin-playing') || docEl.classList.contains('cin-pending')) {
        window.addEventListener('f1site:intro-done', done, { once: true });
        window.setTimeout(done, 9000);
        return;
      }

      done();
    });
  }

  ready(function () {
    insertMomentSection();
    buildDOM();

    setLoaderProgress(0.15);

    var boot = Promise.all([preloadCar(), setupVideo(), waitForIntro()]).then(function () {
      setLoaderProgress(0.92);
      finishLoader();
      window.setTimeout(activate, 60);
    });

    boot.catch(function () {
      finishLoader();
      activate();
    });

    if (reduced) {
      boot.then(function () {
        applyFrame(0.12, 0);
      });
    }
  });
})();
