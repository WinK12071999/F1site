/**
 * About cinema — pinned 3-act strip, dual-buffer loops, hard cuts.
 */
(function () {
  'use strict';

  var body = document.body;
  if (!body || body.getAttribute('data-page') !== 'about') return;

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
      second.classList.add('abt-seam');
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

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatTc(seconds) {
    var total = Math.max(0, Math.floor(seconds));
    var frames = Math.floor((seconds % 1) * 24);
    var hrs = Math.floor(total / 3600);
    var mins = Math.floor((total % 3600) / 60);
    var secs = total % 60;
    return pad(hrs + 1) + ':' + pad(mins) + ':' + pad(secs) + ':' + pad(frames);
  }

  ready(function () {
    var stage = document.querySelector('.abt-hero-stage');
    var heroEl = document.querySelector('.abt-hero-loop');
    var strip = document.querySelector('.abt-strip');
    var track = document.querySelector('.abt-track');
    var acts = [].slice.call(document.querySelectorAll('.abt-act'));
    var tcEl = document.querySelector('[data-abt-tc]');
    var actEl = document.querySelector('[data-abt-act]');
    var mq = window.matchMedia('(max-width: 900px)');
    var lastAct = 0;
    var ticking = false;

    var heroSeam = heroEl ? seamPair(heroEl) : null;
    var actSeams = acts.map(function (act) {
      var video = act.querySelector('video');
      return {
        act: act,
        seam: video ? seamPair(video) : null
      };
    });

    function setAct(index, playVideo) {
      var incoming = actSeams[index];
      if (playVideo !== false && incoming && incoming.seam) incoming.seam.play();
      actSeams.forEach(function (item, i) {
        var on = i === index;
        item.act.classList.toggle('is-on', on);
        if (!on && item.seam) item.seam.pause();
      });
      if (actEl && acts[index]) {
        actEl.textContent = acts[index].getAttribute('data-act') || pad(index + 1);
      }
      lastAct = index;
    }

    function stacked() {
      return mq.matches || reduced;
    }

    function stripVisible(rect) {
      return rect.bottom > 80 && rect.top < window.innerHeight - 80;
    }

    function scrub() {
      ticking = false;
      if (!strip || !track || !acts.length) return;

      if (stacked()) {
        track.style.transform = '';
        return;
      }

      var rect = strip.getBoundingClientRect();
      if (!stripVisible(rect)) {
        actSeams.forEach(function (item) {
          if (item.seam) item.seam.pause();
        });
        return;
      }

      var range = Math.max(1, strip.offsetHeight - window.innerHeight);
      var scrolled = Math.min(range, Math.max(0, -rect.top));
      var p = scrolled / range;
      var n = acts.length;
      var index = Math.min(n - 1, Math.round(p * (n - 1)));
      track.style.transform = 'translate3d(' + (-index * (100 / n)) + '%, 0, 0)';

      if (tcEl) tcEl.textContent = formatTc(p * 96);
      if (index !== lastAct) setAct(index);
      else if (actSeams[index] && actSeams[index].seam) actSeams[index].seam.play();
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(scrub);
    }

    if (heroSeam) {
      function markLive() {
        if (stage) stage.classList.add('is-live');
      }
      heroEl.addEventListener('playing', markLive);
      function startHero() {
        heroSeam.play();
      }
      if (heroEl.readyState >= 2) {
        startHero();
      } else if ('requestIdleCallback' in window) {
        requestIdleCallback(startHero, { timeout: 1600 });
      } else {
        window.setTimeout(startHero, 500);
      }
    }

    if (reduced || !('IntersectionObserver' in window)) {
      actSeams.forEach(function (item) {
        item.act.classList.add('is-on');
        if (item.seam) item.seam.play();
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      if (!stacked()) return;
      entries.forEach(function (entry) {
        var item = actSeams.filter(function (row) {
          return row.act === entry.target;
        })[0];
        if (!item || !item.seam) return;
        if (entry.intersectionRatio >= 0.22) {
          item.act.classList.add('is-on');
          item.seam.play();
        } else if (entry.intersectionRatio < 0.06) {
          item.act.classList.remove('is-on');
          item.seam.pause();
        }
      });
    }, { threshold: [0.05, 0.12, 0.22, 0.45] });

    actSeams.forEach(function (item) {
      observer.observe(item.act);
    });

    setAct(0, false);
    scrub();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (heroSeam) heroSeam.pause();
        actSeams.forEach(function (item) {
          if (item.seam) item.seam.pause();
        });
      } else {
        if (heroSeam) heroSeam.play();
        if (stacked()) {
          actSeams.forEach(function (item) {
            if (item.act.classList.contains('is-on') && item.seam) item.seam.play();
          });
        } else {
          setAct(lastAct);
        }
      }
    });
  });
})();
