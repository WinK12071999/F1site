/**
 * Work cinema — theatrical posters, dual-buffer loops, in-view playback.
 */
(function () {
  'use strict';

  var body = document.body;
  if (!body || body.getAttribute('data-page') !== 'work') return;

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

    var second = null;
    var pair = [primary];
    var live = 0;
    var swapping = false;
    var armed = false;

    prep(primary);
    primary.classList.add('is-seam-live');

    function ensureSecond() {
      if (second) return second;
      second = primary.cloneNode(true);
      second.removeAttribute('id');
      second.removeAttribute('autoplay');
      second.classList.add('wrk-seam');
      second.preload = 'auto';
      parent.insertBefore(second, primary.nextSibling);
      prep(second);
      pair = [primary, second];
      bind(second);
      return second;
    }

    function swap() {
      if (swapping || reduced) return;
      var from = pair[live];
      var to = ensureSecond();
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

    function bind(video) {
      video.addEventListener('timeupdate', function () {
        if (!armed || pair[live] !== video || swapping) return;
        if (video.duration && video.currentTime >= video.duration - FADE - 1.25) {
          ensureSecond();
        }
        if (video.duration && video.currentTime >= video.duration - FADE - 0.04) {
          swap();
        }
      });
      video.addEventListener('ended', function () {
        if (!armed || pair[live] !== video || swapping) return;
        swap();
      });
    }

    bind(primary);

    return {
      videos: pair,
      play: function () {
        armed = true;
        if (primary.preload !== 'auto') primary.preload = 'auto';
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
    var stage = document.querySelector('.wrk-hero-stage');
    var heroEl = document.querySelector('.wrk-hero-loop');
    var posters = [].slice.call(document.querySelectorAll('.wrk-poster'));
    var heroSeam = heroEl ? seamPair(heroEl) : null;
    var posterSeams = [];

    if (heroSeam) {
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
    }

    posters.forEach(function (poster) {
      var video = poster.querySelector('video');
      posterSeams.push({
        poster: poster,
        seam: video ? seamPair(video) : null
      });
    });

    if (reduced || !('IntersectionObserver' in window)) {
      posterSeams.forEach(function (item) {
        item.poster.classList.add('is-live');
        if (item.seam) item.seam.play();
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var item = posterSeams.filter(function (row) {
          return row.poster === entry.target;
        })[0];
        if (!item || !item.seam) return;
        if (entry.intersectionRatio >= 0.22) {
          item.poster.classList.add('is-live');
          item.seam.play();
        } else if (entry.intersectionRatio < 0.06) {
          item.seam.pause();
        }
      });
    }, { threshold: [0.05, 0.12, 0.22, 0.45] });

    posterSeams.forEach(function (item) {
      observer.observe(item.poster);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (heroSeam) heroSeam.pause();
        posterSeams.forEach(function (item) {
          if (item.seam) item.seam.pause();
        });
      } else {
        if (heroSeam) heroSeam.play();
        posterSeams.forEach(function (item) {
          if (item.poster.classList.contains('is-live') && item.seam) {
            item.seam.play();
          }
        });
      }
    });
  });
})();
