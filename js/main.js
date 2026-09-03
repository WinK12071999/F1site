(function () {
  'use strict';

  var docEl = document.documentElement;
  docEl.classList.add('js');

  var motionOK = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var finePointer = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

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
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.classList.toggle('nav-open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (navBackdrop) {
        navBackdrop.classList.toggle('visible', isOpen);
        navBackdrop.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      }
      var panel = document.getElementById('navPanel');
      if (panel) {
        panel.classList.toggle('open', isOpen);
        panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      }
    }

    if (header) {
      var onScroll = function () {
        header.classList.toggle('scrolled', window.scrollY > 20);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        setNavOpen(!document.body.classList.contains('nav-open'));
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

    if (contactForm && formSuccess) {
      var formError = document.getElementById('formError');
      var submitBtn = document.getElementById('formSubmitBtn');

      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var name = contactForm.name.value.trim();
        var email = contactForm.email.value.trim();
        var message = contactForm.message.value.trim();

        if (!name || !email || !message) return;

        formSuccess.hidden = true;
        if (formError) formError.hidden = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending…';
        }

        var data = new FormData(contactForm);

        fetch('https://formsubmit.co/ajax/projects@f1site.com', {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' }
        })
          .then(function (response) {
            if (!response.ok) throw new Error('Send failed');
            contactForm.reset();
            formSuccess.hidden = false;
            setTimeout(function () {
              formSuccess.hidden = true;
            }, 6000);
          })
          .catch(function () {
            if (formError) formError.hidden = false;
          })
          .finally(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Send Message';
            }
          });
      });
    }

    if (motionOK) {
      var startMotion = function () {
        initHeroIntro();
        initHeroCycle();
        initHeroSparklines();
        initScrollReveal();
        initCountUp();
        initHeroParallax();
        initPageTransitions();
      };
      if (
        document.documentElement.classList.contains('cin-playing') ||
        document.documentElement.classList.contains('cin-pending')
      ) {
        window.addEventListener('f1site:intro-done', startMotion, { once: true });
      } else {
        startMotion();
      }
    }
    if (motionOK && finePointer) {
      initGlowCards();
      initDepthTilt();
      initScrollDepth();
    }

    initPrefetch();
    initLogoParallax();
    initLogoClickArea();
    initMobileHeroLogoFollow();
    initFaqAccordion();
  }

  /* --------------------------------------------
     Motion helpers
     -------------------------------------------- */

  function primeAnim(el, variant, delayMs) {
    el.classList.add('anim');
    if (variant && variant !== 'up') el.setAttribute('data-anim', variant);
    if (delayMs) el.style.setProperty('--d', (delayMs / 1000).toFixed(3) + 's');
    el.__animDelay = delayMs || 0;
  }

  // After the entrance settles, strip animation classes so each element
  // returns to its stylesheet-defined transitions (hover states stay snappy).
  function settle(el) {
    setTimeout(function () {
      el.classList.remove('anim', 'anim-in');
      el.removeAttribute('data-anim');
      el.style.removeProperty('--d');
    }, (el.__animDelay || 0) + 1050);
  }

  function revealNow(el) {
    el.classList.add('anim-in');
    settle(el);
  }

  /* --------------------------------------------
     Hero / page-hero entrance choreography
     -------------------------------------------- */

  function initHeroIntro() {
    var isHome = document.body.getAttribute('data-page') === 'home';
    var scope = document.querySelector(isHome ? '.hero .hero-content' : '.page-hero .container');
    if (!scope) return;

    var eyebrow = scope.querySelector(isHome ? '.hero-eyebrow' : '.section-eyebrow');
    var title = scope.querySelector(isHome ? '.hero-title' : '.section-title');
    var desc = scope.querySelector(isHome ? '.hero-desc' : '.section-desc');
    var actions = scope.querySelector('.hero-actions');
    var stats = scope.querySelector('.hero-stats');

    var primed = [];
    var tokens = [];

    if (eyebrow) {
      primeAnim(eyebrow, 'up', 0);
      primed.push(eyebrow);
    }

    if (title) {
      tokens = splitTitle(title);
      var base = isHome ? 120 : 100;
      var step = isHome ? 55 : 45;
      tokens.forEach(function (tok, i) {
        tok.style.setProperty('--d', ((base + i * step) / 1000).toFixed(3) + 's');
      });
    }

    var afterTitle = (isHome ? 120 : 100) + Math.max(tokens.length - 1, 0) * (isHome ? 55 : 45);

    if (desc) {
      primeAnim(desc, 'up', afterTitle + 240);
      primed.push(desc);
    }
    if (actions) {
      primeAnim(actions, 'up', afterTitle + 360);
      primed.push(actions);
    }
    if (stats) {
      primeAnim(stats, 'up', afterTitle + 480);
      primed.push(stats);
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        tokens.forEach(function (tok) {
          tok.classList.add('in');
        });
        primed.forEach(function (el) {
          revealNow(el);
        });
      });
    });
  }

  // Wraps each word of a heading in a span for the cascade. Element children
  // (gradient <em> / cycling word wrap) are kept intact and revealed as one unit.
  function splitTitle(title) {
    var out = [];
    var nodes = Array.prototype.slice.call(title.childNodes);
    var frag = document.createDocumentFragment();

    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          var s = document.createElement('span');
          s.className = 'tw';
          s.textContent = part;
          frag.appendChild(s);
          out.push(s);
        });
      } else if (node.nodeType === 1) {
        node.classList.add('t-em');
        frag.appendChild(node);
        out.push(node);
      } else {
        frag.appendChild(node);
      }
    });

    title.innerHTML = '';
    title.appendChild(frag);
    return out;
  }

  /* --------------------------------------------
     Hero cycling word (Render-style)
     -------------------------------------------- */

  function initHeroCycle() {
    var el = document.getElementById('heroCycle');
    if (!el) return;

    var wrap = el.parentElement;
    var words = [
      'enterprises',
      'institutions',
      'nonprofits',
      'healthcare',
      'governments',
      'organizations that lead'
    ];
    var i = 0;
    var busy = false;

    // Reserve width for the longest phrase so swaps never reflow the hero.
    if (wrap) {
      var probe = el.cloneNode(false);
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.whiteSpace = 'nowrap';
      wrap.appendChild(probe);
      var maxW = 0;
      var w;
      for (w = 0; w < words.length; w++) {
        probe.textContent = words[w];
        maxW = Math.max(maxW, probe.offsetWidth);
      }
      wrap.removeChild(probe);
      var cap = wrap.parentElement ? wrap.parentElement.clientWidth : maxW;
      if (maxW) wrap.style.minWidth = Math.min(maxW, cap || maxW) + 'px';
    }

    function swap() {
      if (busy || document.hidden) return;
      busy = true;
      el.classList.remove('is-in');
      el.classList.add('is-out');

      setTimeout(function () {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove('is-out');
        // Force reflow so the in-animation restarts cleanly.
        void el.offsetWidth;
        el.classList.add('is-in');
        setTimeout(function () {
          busy = false;
        }, 560);
      }, 430);
    }

    setTimeout(function () {
      setInterval(swap, 2800);
    }, 2200);
  }

  /* --------------------------------------------
     Live sparklines on the hero stage
     -------------------------------------------- */

  function initHeroSparklines() {
    var canvases = document.querySelectorAll('.sparkline');
    if (!canvases.length) return;

    var frames = [];
    var running = true;
    var start = performance.now();

    function seed(kind, n) {
      var pts = [];
      var i;
      for (i = 0; i < n; i++) {
        if (kind === 'rise') pts.push(0.25 + (i / n) * 0.45 + Math.sin(i * 0.7) * 0.08);
        else if (kind === 'flat') pts.push(0.62 + Math.sin(i * 0.9) * 0.04);
        else pts.push(0.45 + Math.sin(i * 0.55) * 0.22);
      }
      return pts;
    }

    canvases.forEach(function (canvas) {
      var kind = canvas.getAttribute('data-spark') || 'wave';
      frames.push({
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        kind: kind,
        base: seed(kind, 28)
      });
    });

    function draw(now) {
      if (!running) return;
      var t = (now - start) / 1000;

      frames.forEach(function (frame) {
        var canvas = frame.canvas;
        var ctx = frame.ctx;
        if (!ctx) return;

        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = canvas.clientWidth || 160;
        var h = canvas.clientHeight || 28;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        ctx.clearRect(0, 0, w, h);

        var pts = frame.base;
        var n = pts.length;
        var path = [];
        var i;
        for (i = 0; i < n; i++) {
          var wave = Math.sin(t * 1.6 + i * 0.45) * 0.06;
          if (frame.kind === 'rise') wave = Math.sin(t * 1.2 + i * 0.35) * 0.05;
          if (frame.kind === 'flat') wave = Math.sin(t * 2.1 + i * 0.8) * 0.025;
          var yNorm = Math.max(0.08, Math.min(0.92, pts[i] + wave));
          path.push({
            x: (i / (n - 1)) * w,
            y: h - yNorm * h
          });
        }

        // Soft fill under the line
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        var fill = ctx.createLinearGradient(0, 0, 0, h);
        fill.addColorStop(0, 'rgba(255,255,255,0.14)');
        fill.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = fill;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.strokeStyle = 'rgba(255,255,255,0.82)';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Leading glow dot
        var tip = path[path.length - 1];
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      requestAnimationFrame(draw);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        start = performance.now();
        requestAnimationFrame(draw);
      }
    });

    requestAnimationFrame(draw);
  }

  /* --------------------------------------------
     FAQ accordion (one open at a time)
     -------------------------------------------- */

  function initFaqAccordion() {
    var lists = document.querySelectorAll('.faq-list');
    if (!lists.length) return;

    lists.forEach(function (list) {
      list.addEventListener('toggle', function (e) {
        var target = e.target;
        if (!target || target.tagName !== 'DETAILS' || !target.open) return;
        list.querySelectorAll('details.faq-item[open]').forEach(function (item) {
          if (item !== target) item.open = false;
        });
      }, true);
    });
  }

  /* --------------------------------------------
     Scroll-triggered reveals (all pages)
     -------------------------------------------- */

  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;

    var GROUPS = [
      { parent: '.section-header', items: ':scope > *', step: 90 },
      { parent: '.page-teasers', items: '.page-teaser', step: 80 },
      { parent: '.detail-grid', items: '.detail-card', step: 70 },
      { parent: '.plan-grid', items: '.plan-card', step: 100, variant: 'scale' },
      { parent: '.value-grid', items: '.value-card', step: 70 },
      { parent: '.team-grid', items: '.team-card', step: 100 },
      { parent: '.contact-info-grid', items: '.contact-info-card', step: 90 },
      { parent: '.faq-list', items: '.faq-item', step: 70 },
      { parent: '.footer-grid', items: ':scope > div', step: 90 },
      { parent: '.process-timeline', items: '.timeline-step', step: 110 },
      { parent: '.about-visual', items: '.about-card', step: 140, variant: 'fade' },
      { parent: '.deliverables-list', items: '.deliverable-tag', step: 35, base: 250 },
      { parent: '.case-services', items: '.deliverable-tag', step: 35, base: 250 },
      { parent: '.about-features', items: 'li', step: 60, base: 150 },
      { parent: '.services-grid', items: '.service-card', step: 80 },
      { parent: '.work-grid', items: '.work-card', step: 80 },
      { parent: '.process-steps', items: '.process-step', step: 80 }
    ];

    var SINGLES = [
      { sel: '.content-block' },
      { sel: '.about-content' },
      { sel: '.contact-info' },
      { sel: '.contact-form', variant: 'scale' },
      { sel: '.cta-banner', variant: 'scale' },
      { sel: '.service-detail-header' },
      { sel: '.case-study-visual', variant: 'left' },
      { sel: '.case-study-content', variant: 'right' },
      { sel: '.testimonial-quote' }
    ];

    var targets = [];

    function eligible(el) {
      return !el.closest('.hero, .page-hero') && !el.classList.contains('anim');
    }

    GROUPS.forEach(function (group) {
      document.querySelectorAll(group.parent).forEach(function (parent) {
        if (parent.closest('.hero, .page-hero')) return;
        var items = parent.querySelectorAll(group.items);
        var i = 0;
        items.forEach(function (item) {
          if (!eligible(item)) return;
          var delay = Math.min((group.base || 0) + i * group.step, 620);
          primeAnim(item, group.variant || 'up', delay);
          targets.push(item);
          i++;
        });
      });
    });

    SINGLES.forEach(function (single) {
      document.querySelectorAll(single.sel).forEach(function (el) {
        if (!eligible(el)) return;
        primeAnim(el, single.variant || 'up', 0);
        targets.push(el);
      });
    });

    if (!targets.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          if (entry.isIntersecting) {
            io.unobserve(el);
            revealNow(el);
          } else if (entry.boundingClientRect.top < 0) {
            // Already scrolled past (restored scroll / anchor jump): show instantly.
            io.unobserve(el);
            el.style.setProperty('--d', '0s');
            el.__animDelay = 0;
            revealNow(el);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
    );

    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  /* --------------------------------------------
     Stat count-up (home hero)
     -------------------------------------------- */

  function initCountUp() {
    var nums = document.querySelectorAll('.hero-stats .stat-number');
    if (!nums.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          runCount(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    nums.forEach(function (el) {
      io.observe(el);
    });

    function runCount(el) {
      var raw = el.textContent.trim();
      var m = raw.match(/^([\d.]+)(.*)$/);
      if (!m) return;

      var end = parseFloat(m[1]);
      var suffix = m[2] || '';
      var decimals = (m[1].split('.')[1] || '').length;
      var dur = 1400;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = (end * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    }
  }

  /* --------------------------------------------
     Pointer-tracked card glow (desktop)
     -------------------------------------------- */

  function initGlowCards() {
    var GLOW_SELECTOR =
      '.page-teaser, .detail-card, .value-card, .team-card, .plan-card, ' +
      '.contact-info-card, .timeline-step, .hero-stats, ' +
      '.contact-form, .work-card, .service-card, .case-study-visual';

    var cards = document.querySelectorAll(GLOW_SELECTOR);
    if (!cards.length) return;

    cards.forEach(function (card) {
      card.classList.add('glow-card');
    });

    var pending = null;
    var scheduled = false;

    document.addEventListener(
      'pointermove',
      function (e) {
        pending = e;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(applyGlow);
      },
      { passive: true }
    );

    function applyGlow() {
      scheduled = false;
      var e = pending;
      if (!e) return;
      var card = e.target && e.target.closest ? e.target.closest('.glow-card') : null;
      if (!card) return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - rect.left).toFixed(1) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top).toFixed(1) + 'px');
    }
  }

  /* --------------------------------------------
     3D depth tilt on interactive surfaces
     -------------------------------------------- */

  function initDepthTilt() {
    var SELECTOR =
      '.page-teaser, .detail-card, .value-card, .team-card, .plan-card, ' +
      '.contact-info-card, .work-card, .service-card, .case-study-visual, ' +
      '.cta-banner, .contact-form, .hero-stats, .stage-panel';

    var cards = document.querySelectorAll(SELECTOR);
    if (!cards.length) return;

    cards.forEach(function (card) {
      card.classList.add('depth-card');
    });

    // Scene containers get perspective so children read as 3D space.
    document.querySelectorAll(
      '.page-teasers, .detail-grid, .value-grid, .team-grid, .plan-grid, ' +
      '.contact-info-grid, .work-grid, .services-grid, .process-timeline, ' +
      '.case-study, .hero-stage, .hero-shell'
    ).forEach(function (scene) {
      scene.classList.add('depth-scene');
    });

    var active = null;
    var pending = null;
    var scheduled = false;

    function onMove(e) {
      pending = e;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(tick);
    }

    function tick() {
      scheduled = false;
      var e = pending;
      if (!e) return;

      var card = e.target && e.target.closest ? e.target.closest('.depth-card') : null;
      if (active && active !== card) resetCard(active);
      active = card;
      if (!card) return;

      var rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      var rx = ((0.5 - py) * 11).toFixed(2);
      var ry = ((px - 0.5) * 14).toFixed(2);

      card.style.setProperty('--rx', rx + 'deg');
      card.style.setProperty('--ry', ry + 'deg');
      card.style.setProperty('--tz', '22px');
      card.style.setProperty('--ty', '-4px');
      card.style.setProperty('--mx', (e.clientX - rect.left).toFixed(1) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top).toFixed(1) + 'px');
      card.classList.add('is-tilting');
    }

    function resetCard(card) {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--tz', '0px');
      card.style.setProperty('--ty', '0px');
      card.classList.remove('is-tilting');
    }

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', function () {
      if (active) resetCard(active);
      active = null;
    });
  }

  /* --------------------------------------------
     Scroll-linked section depth (desktop)
     -------------------------------------------- */

  function initScrollDepth() {
    if (window.innerWidth < 900) return;
    // Circuit pages keep the ocean/track fixed — 3D section tilt causes shimmer.
    if (document.body.classList.contains('has-circuit')) return;

    var sections = document.querySelectorAll('main > section:not(.hero):not(.page-hero):not(.circuit-moment), .footer');
    if (!sections.length) return;

    sections.forEach(function (el) {
      el.classList.add('depth-scroll');
    });

    var ticking = false;

    function update() {
      ticking = false;
      var vh = window.innerHeight || 1;

      sections.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var mid = rect.top + rect.height * 0.35;
        // -1 at bottom of viewport → +1 at top
        var p = (vh * 0.5 - mid) / vh;
        p = Math.max(-1, Math.min(1, p));

        var rot = (p * -2.4).toFixed(3);
        var z = (Math.abs(p) * -28).toFixed(1);
        var y = (p * 10).toFixed(1);

        el.style.setProperty('--depth-rx', rot + 'deg');
        el.style.setProperty('--depth-z', z + 'px');
        el.style.setProperty('--depth-y', y + 'px');
      });
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );

    window.addEventListener('resize', function () {
      if (window.innerWidth < 900) {
        sections.forEach(function (el) {
          el.style.removeProperty('--depth-rx');
          el.style.removeProperty('--depth-z');
          el.style.removeProperty('--depth-y');
        });
        return;
      }
      update();
    }, { passive: true });

    update();
  }

  /* --------------------------------------------
     Hero parallax + scroll fade (desktop)
     -------------------------------------------- */

  function initHeroParallax() {
    if (window.innerWidth < 769) return;

    var isHome = document.body.getAttribute('data-page') === 'home';
    var heroEl;
    var items = [];

    if (isHome) {
      heroEl = document.querySelector('.hero');
      if (!heroEl) return;
      items = [
        { el: document.querySelector('.hero-content'), f: 0.1, fade: true },
        { el: document.querySelector('.hero-stage'), f: 0.18, fade: true },
        { el: document.querySelector('.hero-grid'), f: 0.22 }
      ];
    } else {
      heroEl = document.querySelector('.page-hero');
      if (!heroEl) return;
      items = [
        { el: heroEl.querySelector('.page-hero-bg'), f: 0.28 },
        { el: heroEl.querySelector('.container'), f: 0.1 }
      ];
    }

    items = items.filter(function (it) {
      return it.el;
    });
    if (!items.length) return;

    var heroH = heroEl.offsetHeight || window.innerHeight;
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      var yc = Math.min(y, heroH * 1.25);

      items.forEach(function (it) {
        it.el.style.translate = '0 ' + (yc * it.f).toFixed(1) + 'px';
        if (it.fade) {
          var op = 1 - Math.min(1, y / (heroH * 0.9));
          it.el.style.opacity = op < 1 ? op.toFixed(3) : '';
        }
      });
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );

    update();
  }

  /* --------------------------------------------
     Page transitions (exit fade, enter handled in CSS)
     -------------------------------------------- */

  function initPageTransitions() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;

      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

      var url;
      try {
        url = new URL(a.href, window.location.href);
      } catch (err) {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;

      e.preventDefault();
      docEl.classList.add('page-exit');

      setTimeout(function () {
        window.location.href = a.href;
      }, 230);

      // Safety: if navigation is somehow interrupted, restore the page.
      setTimeout(function () {
        docEl.classList.remove('page-exit');
      }, 1800);
    });

    window.addEventListener('pageshow', function (e) {
      if (e.persisted) docEl.classList.remove('page-exit');
    });
  }

  /* --------------------------------------------
     Hover prefetch for internal pages
     -------------------------------------------- */

  function initPrefetch() {
    if (window.location.protocol === 'file:') return;

    var done = {};

    document.addEventListener(
      'pointerover',
      function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || done[href] || href.charAt(0) === '#') return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
        if (/^(https?:)?\/\//i.test(href)) return;
        // Internal clean URLs (/about) or legacy .html
        if (!(href.charAt(0) === '/' || /\.html(?:#|$)/.test(href))) return;
        done[href] = true;
        var link = document.createElement('link');
        link.rel = 'prefetch';
        // Prefetch the path without hash
        link.href = href.split('#')[0] || '/';
        document.head.appendChild(link);
      },
      { passive: true }
    );
  }

  /* --------------------------------------------
     Logo interactions (unchanged)
     -------------------------------------------- */

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
    if (!motionOK) return;
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
    if (!motionOK) return;
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
