/**
 * Services cinema — pinned 3-act strip, dual-buffer loops, hard cuts.
 */
(function () {
  'use strict';

  var body = document.body;
  if (!body || body.getAttribute('data-page') !== 'services') return;

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
    second.classList.add('svc-seam');
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
    var stage = document.querySelector('.svc-hero-stage');
    var heroEl = document.querySelector('.svc-hero-loop');
    var strip = document.querySelector('.svc-strip');
    var track = document.querySelector('.svc-track');
    var acts = [].slice.call(document.querySelectorAll('.svc-act'));
    var tcEl = document.querySelector('[data-svc-tc]');
    var actEl = document.querySelector('[data-svc-act]');
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

    function setAct(index) {
      var incoming = actSeams[index];
      if (incoming && incoming.seam) incoming.seam.play();
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
      heroEl.addEventListener('canplay', function () {
        heroSeam.play();
        if (!heroEl.paused) markLive();
      });
      if (heroEl.readyState >= 2) heroSeam.play();
      if (!heroEl.paused && heroEl.currentTime > 0) markLive();
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

    setAct(0);
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
