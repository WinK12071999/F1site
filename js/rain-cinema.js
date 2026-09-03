/**
 * Rain cinema — Ken Burns camera, rain, and spray over the still.
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
  var PHOTO = 'assets/cinema/ferrari-rain.jpg';
  var PHOTO_WIDE = 'assets/cinema/ferrari-rain-wide.jpg';
  var VIDEO_SRC = 'assets/cinema/ferrari-rain-drive.mp4';

  body.classList.add('has-circuit');
  body.classList.add('has-cinema');

  var root;
  var camera;
  var canvas;
  var running = false;
  var raf = 0;
  var start = 0;
  var mouseX = 0;
  var mouseY = 0;
  var targetMX = 0;
  var targetMY = 0;
  var introTight = false;
  var introBlend = 0;
  var driveVideo = null;
  var driveDuration = 0;
  var playhead = 0;
  var driveReady = false;
  var driveMode = 'scrub';
  var driveRaf = 0;
  var seekBusy = false;
  var seekTimer = 0;
  var AUTO_RATE = 2;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function isWide() {
    return window.innerWidth >= 769;
  }

  function ensureStage() {
    root = document.querySelector('.rain-cinema');
    if (!root) {
      root = document.createElement('div');
      root.className = 'rain-cinema';
      root.setAttribute('aria-hidden', 'true');
      root.innerHTML =
        '<div class="rain-bloom"></div>' +
        '<div class="rain-camera">' +
          '<picture>' +
            '<source media="(min-width: 769px)" srcset="' + PHOTO_WIDE + '">' +
            '<img class="rain-still" src="' + PHOTO + '" alt="" width="586" height="1024" decoding="async">' +
          '</picture>' +
          driveVideoHtml() +
        '</div>' +
        '<div class="rain-veil"></div>' +
        '<div class="rain-vignette"></div>' +
        (reduced ? '' : '<div class="rain-grain"></div>');
      body.insertBefore(root, body.firstChild);
    }

    camera = root.querySelector('.rain-camera');
    canvas = root.querySelector('.rain-fx');
    stripWeatherFx();
    ensureDriveVideo();
  }

  function stripWeatherFx() {
    if (!root) return;
    var doomed = root.querySelectorAll('.rain-fx, .rain-tail, .rain-tail-wash, .rain-glow');
    var i;
    for (i = 0; i < doomed.length; i++) {
      if (doomed[i].parentNode) doomed[i].parentNode.removeChild(doomed[i]);
    }
    canvas = null;
  }

  function driveVideoHtml() {
    return (
      '<video class="rain-drive" muted playsinline webkit-playsinline preload="auto" ' +
      'disablePictureInPicture controlslist="nodownload nofullscreen noremoteplayback" ' +
      'poster="' + PHOTO_WIDE + '">' +
        '<source src="' + VIDEO_SRC + '" type="video/mp4">' +
      '</video>'
    );
  }

  function ensureDriveVideo() {
    if (!camera || reduced) return;
    var video = root.querySelector('.rain-drive');
    if (!video) {
      camera.insertAdjacentHTML('afterbegin', driveVideoHtml());
      video = root.querySelector('.rain-drive');
      var pic = camera.querySelector('picture');
      if (pic && video) camera.insertBefore(pic, video);
    }
    setupDrive(video);
  }

  function scrollProgress() {
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return clamp((window.scrollY || 0) / max, 0, 1);
  }

  function setupDrive(video) {
    if (!video || reduced) return;
    driveVideo = video;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    if (page === 'home') {
      video.loop = true;
      try {
        video.defaultPlaybackRate = AUTO_RATE;
        video.playbackRate = AUTO_RATE;
      } catch (err) {}
    } else {
      video.loop = false;
    }
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    if (!video.getAttribute('src') && !video.querySelector('source')) {
      video.src = VIDEO_SRC;
    }

    function onReady() {
      var dur = video.duration;
      if (!dur || !isFinite(dur) || dur < 0.2) return;
      var first = !driveReady;
      driveDuration = dur;
      driveReady = true;
      if (root) root.classList.add('is-driving');
      video.style.opacity = '1';
      if (!first) return;

      if (page === 'home') {
        startAutoRace();
        return;
      }

      startDriveLoop();
      driveMode = 'scrub';
      playhead = scrollProgress() * maxDriveTime();
      try {
        video.pause();
        video.currentTime = playhead;
      } catch (err) {}
    }

    if (video.readyState >= 1 && video.duration) onReady();
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('canplay', function () {
      onReady();
      if (page !== 'home') startDriveLoop();
    });
    video.addEventListener('ended', function () {
      if (page !== 'home') return;
      try {
        video.currentTime = 0.04;
      } catch (err) {}
      keepPlaying();
    });
    video.addEventListener('durationchange', function () {
      if (video.duration && isFinite(video.duration)) driveDuration = video.duration;
    });
  }

  function maxDriveTime() {
    return Math.max(0.08, driveDuration - 0.04);
  }

  function keepPlaying() {
    if (!driveVideo || document.hidden) return;
    if (!driveVideo.paused) return;
    var attempt = driveVideo.play();
    if (attempt && attempt.catch) {
      attempt.catch(function () {});
    }
  }

  function startAutoRace() {
    if (page !== 'home' || !driveVideo || reduced) return;
    driveMode = 'auto';
    driveVideo.loop = true;
    try {
      driveVideo.playbackRate = AUTO_RATE;
    } catch (err) {}
    keepPlaying();
  }

  function applyDrive() {
    if (!driveReady || !driveVideo || reduced) return;

    if (driveMode === 'auto') {
      playhead = driveVideo.currentTime || 0;
      keepPlaying();
      return;
    }

    if (!driveVideo.paused) {
      try {
        driveVideo.pause();
      } catch (err) {}
    }

    var maxT = maxDriveTime();
    var target = scrollProgress() * maxT;
    var gap = Math.abs(target - playhead);
    var smooth = gap > 0.45 ? 0.38 : mobile ? 0.24 : 0.18;
    playhead += (target - playhead) * smooth;
    playhead = clamp(playhead, 0, maxT);

    if (Math.abs((driveVideo.currentTime || 0) - playhead) >= 0.035) {
      requestSeek(playhead);
    }
  }

  function requestSeek(time) {
    if (!driveVideo) return;
    if (seekBusy) {
      driveVideo._pendingSeek = time;
      return;
    }
    seekBusy = true;
    driveVideo._pendingSeek = null;
    var onSeeked = function () {
      driveVideo.removeEventListener('seeked', onSeeked);
      seekBusy = false;
      if (driveVideo._pendingSeek != null) {
        var next = driveVideo._pendingSeek;
        driveVideo._pendingSeek = null;
        requestSeek(next);
      }
    };
    driveVideo.addEventListener('seeked', onSeeked);
    try {
      driveVideo.currentTime = time;
    } catch (err) {
      seekBusy = false;
    }
    if (seekTimer) window.clearTimeout(seekTimer);
    seekTimer = window.setTimeout(function () {
      seekTimer = 0;
      if (!seekBusy) return;
      seekBusy = false;
      if (driveVideo && driveVideo._pendingSeek != null) {
        var next = driveVideo._pendingSeek;
        driveVideo._pendingSeek = null;
        requestSeek(next);
      }
    }, 200);
  }

  function startDriveLoop() {
    if (driveRaf || reduced) return;
    function loop() {
      applyDrive();
      driveRaf = requestAnimationFrame(loop);
    }
    driveRaf = requestAnimationFrame(loop);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function introActive() {
    var el = document.documentElement;
    return el.classList.contains('cin-playing') || el.classList.contains('cin-pending');
  }

  function applyCamera(now) {
    if (!camera) return;

    var t = (now - start) / 1000;
    var scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var scrollT = clamp(window.scrollY / scrollMax, 0, 1);

    mouseX = lerp(mouseX, targetMX, 0.06);
    mouseY = lerp(mouseY, targetMY, 0.06);
    introBlend = lerp(introBlend, introTight || introActive() ? 1 : 0, 0.045);

    var baseScale = page === 'home' ? (driveReady ? 1.04 : 1.08) : (driveReady ? 1.06 : 1.12);
    var ken = reduced || driveReady ? 0 : Math.sin(t * 0.11) * 0.025 * (1 - introBlend * 0.4);
    var panX = reduced || driveReady ? 0 : Math.sin(t * 0.09) * 1.1;
    var panY = reduced || driveReady ? 0 : Math.cos(t * 0.07) * 0.8;

    var tightScale = mobile ? 1.22 : 1.28;
    baseScale = lerp(baseScale, tightScale, introBlend);
    panX += (isWide() ? 2.4 : 0.6) * introBlend;
    panY += 1.4 * introBlend;

    if (introBlend < 0.2) {
      baseScale += scrollT * 0.1 * (1 - introBlend);
      panY += scrollT * 4 * (1 - introBlend);
    }

    var px = panX + mouseX * (mobile ? 0.6 : 1.4);
    var py = panY + mouseY * (mobile ? 0.4 : 0.9);
    var scale = baseScale + ken;

    camera.style.transform =
      'translate3d(' + px.toFixed(2) + '%, ' + py.toFixed(2) + '%, 0) scale(' + scale.toFixed(4) + ')';
  }

  function startCameraOnly() {
    running = true;
    start = performance.now();
    function loop(now) {
      if (!running) return;
      applyCamera(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  function onPointer(e) {
    var nx = (e.clientX / window.innerWidth - 0.5) * 2;
    var ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetMX = clamp(nx, -1, 1);
    targetMY = clamp(ny, -1, 1);
  }

  ready(function () {
    ensureStage();
    introTight = introActive();
    introBlend = introTight ? 1 : 0;

    if (reduced) {
      applyCamera(performance.now());
    } else {
      startCameraOnly();
    }

    if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      window.addEventListener('pointermove', onPointer, { passive: true });
    }

    window.addEventListener('scroll', function () {
      if (page === 'home') {
        keepPlaying();
        return;
      }
      applyDrive();
    }, { passive: true });

    window.addEventListener('wheel', function () {
      if (page === 'home') keepPlaying();
    }, { passive: true });

    window.addEventListener('f1site:intro-done', function () {
      introTight = false;
      if (page === 'home') startAutoRace();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (driveVideo) {
          try {
            driveVideo.pause();
          } catch (err) {}
        }
        if (driveRaf) {
          cancelAnimationFrame(driveRaf);
          driveRaf = 0;
        }
      } else if (!running) {
        running = true;
        start = performance.now();
        if (!reduced) startCameraOnly();
        if (driveReady) startDriveLoop();
        if (page === 'home') keepPlaying();
      }
    });
  });
})();
