(function () {
  'use strict';

  function init() {
    var header = document.getElementById('header');
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');
    var navBackdrop = document.getElementById('navBackdrop');
    var contactForm = document.getElementById('contactForm');
    var formSuccess = document.getElementById('formSuccess');

    function setNavOpen(isOpen) {
      if (!navLinks || !navToggle) return;
      navLinks.classList.toggle('open', isOpen);
      navToggle.classList.toggle('active', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen);
      document.body.classList.toggle('nav-open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (navBackdrop) {
        navBackdrop.classList.toggle('visible', isOpen);
        navBackdrop.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      }
    }

    if (header) {
      function onScroll() {
        header.classList.toggle('scrolled', window.scrollY > 20);
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        setNavOpen(!navLinks.classList.contains('open'));
      });

      if (navBackdrop) {
        navBackdrop.addEventListener('click', function () {
          setNavOpen(false);
        });
      }

      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          setNavOpen(false);
        });
      });
    }

    var revealElements = document.querySelectorAll(
      '.service-card, .about-card, .process-step, .work-card, .testimonial-quote, ' +
      '.contact-form, .about-content, .detail-card, .faq-item, .team-card, ' +
      '.case-study, .plan-card, .value-card, .page-teaser'
    );

    revealElements.forEach(function (el) {
      el.classList.add('reveal');
    });

    if (revealElements.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );

      revealElements.forEach(function (el) {
        observer.observe(el);
      });
    }

    if (contactForm && formSuccess) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var name = contactForm.name.value.trim();
        var email = contactForm.email.value.trim();
        var message = contactForm.message.value.trim();

        if (!name || !email || !message) return;

        contactForm.reset();
        formSuccess.hidden = false;

        setTimeout(function () {
          formSuccess.hidden = true;
        }, 5000);
      });
    }

    initLogoParallax();
    initLogoClickArea();
    initMobileHeroLogoFollow();
  }

  function initLogoClickArea() {
    var visual = document.querySelector('#site-logo .logo-visual');
    var img = visual && visual.querySelector('.logo-img-featured');
    var hitLink = visual && visual.querySelector('.logo-hit-link');
    if (!visual || !img || !hitLink) return;

    function applyBounds(source) {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx || !source.naturalWidth) return false;

      try {
        canvas.width = source.naturalWidth;
        canvas.height = source.naturalHeight;
        ctx.drawImage(source, 0, 0);

        var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        var minX = canvas.width;
        var minY = canvas.height;
        var maxX = 0;
        var maxY = 0;
        var x;
        var y;
        var alpha;

        for (y = 0; y < canvas.height; y++) {
          for (x = 0; x < canvas.width; x++) {
            alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 8) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX <= minX || maxY <= minY) return false;

        var padX = canvas.width * 0.02;
        var padY = canvas.height * 0.025;
        minX = Math.max(0, minX - padX);
        minY = Math.max(0, minY - padY);
        maxX = Math.min(canvas.width, maxX + padX);
        maxY = Math.min(canvas.height, maxY + padY);

        hitLink.style.top = ((minY / canvas.height) * 100).toFixed(2) + '%';
        hitLink.style.left = ((minX / canvas.width) * 100).toFixed(2) + '%';
        hitLink.style.width = (((maxX - minX) / canvas.width) * 100).toFixed(2) + '%';
        hitLink.style.height = (((maxY - minY) / canvas.height) * 100).toFixed(2) + '%';
        return true;
      } catch (err) {
        return false;
      }
    }

    function prime() {
      if (applyBounds(img)) return;

      var preload = new Image();
      preload.decoding = 'async';
      preload.src = img.currentSrc || img.src;
      preload.onload = function () {
        if (!applyBounds(preload)) {
          hitLink.style.top = '14%';
          hitLink.style.left = '6%';
          hitLink.style.width = '88%';
          hitLink.style.height = '68%';
        }
      };

      if (img.complete) {
        preload.src = img.currentSrc || img.src;
      } else {
        img.addEventListener('load', function () {
          applyBounds(img);
        }, { once: true });
      }
    }

    prime();
  }

  function initMobileHeroLogoFollow() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(max-width: 768px)').matches) return;

    var zone = document.querySelector('.hero-mobile-mark');
    var wrap = zone && zone.querySelector('.hero-mobile-logo-wrap');
    if (!zone || !wrap) return;

    var targetX = 0;
    var targetY = 0;
    var currentX = 0;
    var currentY = 0;
    var rafId = null;
    var ease = 0.14;
    var maxRatio = 0.24;

    function getMaxOffset() {
      return zone.getBoundingClientRect().width * maxRatio;
    }

    function setTargets(clientX, clientY) {
      var rect = zone.getBoundingClientRect();
      if (!rect.width) return;

      var x = (clientX - rect.left) / rect.width - 0.5;
      var y = (clientY - rect.top) / rect.height - 0.5;
      var max = getMaxOffset();

      targetX = Math.max(-max, Math.min(max, x * max * 2));
      targetY = Math.max(-max, Math.min(max, y * max * 2));
      startLoop();
    }

    function startLoop() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function tick() {
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      var max = getMaxOffset() || 1;
      var rotY = (currentX / max) * 9;
      var rotX = (-currentY / max) * 7;
      var scale = 1 + Math.min(0.035, (Math.abs(currentX) + Math.abs(currentY)) / (max * 18));

      wrap.style.transform =
        'translate3d(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px,0) ' +
        'rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) ' +
        'scale(' + scale.toFixed(3) + ')';

      var settled =
        Math.abs(targetX - currentX) < 0.05 &&
        Math.abs(targetY - currentY) < 0.05;

      if (settled && targetX === 0 && targetY === 0) {
        wrap.style.transform = '';
        currentX = 0;
        currentY = 0;
        rafId = null;
        return;
      }

      if (settled) {
        currentX = targetX;
        currentY = targetY;
        rafId = null;
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    }

    function reset() {
      targetX = 0;
      targetY = 0;
      startLoop();
    }

    zone.addEventListener('pointermove', function (e) {
      setTargets(e.clientX, e.clientY);
    });

    zone.addEventListener('pointerleave', reset);
    zone.addEventListener('pointercancel', reset);
  }

  function initLogoParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;

    var anchor = document.getElementById('site-logo');
    var tilt = anchor && anchor.querySelector('.logo-tilt');
    var img = anchor && anchor.querySelector('.logo-img-featured');
    if (!tilt || !img) return;

    document.addEventListener('mousemove', function (e) {
      var rect = img.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        tilt.style.transform = '';
        return;
      }

      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      tilt.style.transform =
        'rotateY(' + (x * 14).toFixed(2) + 'deg) rotateX(' + (-y * 10).toFixed(2) + 'deg) scale(1.015)';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
