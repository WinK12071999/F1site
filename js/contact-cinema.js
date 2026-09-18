/**
 * Contact cinema — muted hero loop, dual-buffer, no native chrome.
 */
(function () {
  'use strict';

  var body = document.body;
  if (!body || body.getAttribute('data-page') !== 'contact') return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FADE = 0.5;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function prep(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.controls = false;
    video.loop = false;
    video.removeAttribute('loop');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    try {
      video.disablePictureInPicture = true;
    } catch (err) {}
  }

  function play(video) {
    if (!video || reduced) return;
    var attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(function () {});
  }

  function seamPair(primary) {
    var parent = primary.parentNode;
    if (!parent) return { play: function () { play(primary); }, pause: function () {}, videos: [primary] };

    var second = primary.cloneNode(true);
    second.removeAttribute('id');
    second.removeAttribute('autoplay');
    second.classList.add('ctc-seam');
    parent.insertBefore(second, primary.nextSibling);

    var pair = [primary, second];
    var live = 0;
    var swapping = false;
    var armed = false;

    pair.forEach(function (video) {
      prep(video);
    });
    primary.classList.add('is-seam-live');

    function swap() {
      if (swapping || reduced) return;
      var from = pair[live];
      var to = pair[1 - live];
      if (!from.duration) return;
      swapping = true;
      try {
        to.currentTime = 0.04;
      } catch (err) {}
      play(to);
      to.classList.add('is-seam-live');
      from.classList.remove('is-seam-live');
      live = 1 - live;
      window.setTimeout(function () {
        try {
          from.pause();
          from.currentTime = 0.04;
        } catch (err) {}
        swapping = false;
      }, FADE * 1000);
    }

    pair.forEach(function (video, index) {
      video.addEventListener('timeupdate', function () {
        if (!armed || index !== live || swapping) return;
        if (video.duration && video.currentTime >= video.duration - FADE - 0.04) {
          swap();
        }
      });
      video.addEventListener('ended', function () {
        if (!armed || index !== live || swapping) return;
        swap();
      });
    });

    return {
      videos: pair,
      play: function () {
        armed = true;
        play(pair[live]);
      },
      pause: function () {
        armed = false;
        pair.forEach(function (video) {
          try { video.pause(); } catch (err) {}
        });
      }
    };
  }

  ready(function () {
    var stage = document.querySelector('.ctc-hero-stage');
    var heroEl = document.querySelector('.ctc-hero-loop');
    var heroSeam = heroEl ? seamPair(heroEl) : null;

    if (!heroSeam) return;

    function markLive() {
      if (stage) stage.classList.add('is-live');
    }

    heroEl.addEventListener('playing', markLive);
    heroEl.addEventListener('canplay', function () {
      heroSeam.play();
      if (!heroEl.paused) markLive();
    });
    if (heroEl.readyState >= 2) heroSeam.play();
    if (!heroEl.paused && heroEl.currentTime > 0) markLive();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) heroSeam.pause();
      else heroSeam.play();
    });
  });
})();
