(function () {
  'use strict';

  function getRoot() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (/layout\.js(?:\?.*)?$/.test(src)) {
        return src.replace(/js\/layout\.js(?:\?.*)?$/, '');
      }
    }
    return '';
  }

  var root = getRoot();
  var homeHref = root || './';

  var NAV = [
    { id: 'services', href: root + 'services/', label: 'Services' },
    { id: 'about', href: root + 'about/', label: 'About' },
    { id: 'process', href: root + 'process/', label: 'Process' },
    { id: 'work', href: root + 'work/', label: 'Work' },
    { id: 'contact', href: root + 'contact/', label: 'Get in Touch', cta: true }
  ];

  var currentPage = document.body.getAttribute('data-page') || '';

  function navLinksHtml() {
    return NAV.map(function (item) {
      var active = item.id === currentPage ? ' aria-current="page"' : '';
      var cls = item.cta ? ' class="nav-cta"' : '';
      if (item.id === currentPage && item.cta) {
        cls = ' class="nav-cta active"';
      } else if (item.id === currentPage) {
        cls = ' class="active"';
      }
      return '<li><a href="' + item.href + '"' + cls + active + '>' + item.label + '</a></li>';
    }).join('');
  }

  var logoPath = root + 'logos/f1-logo-transparent.png';

  var logoFeaturedHtml =
    '<div class="logo-anchor" id="site-logo">' +
      '<span class="logo-aura" aria-hidden="true"></span>' +
      '<div class="logo-visual">' +
        '<span class="logo-motion">' +
          '<span class="logo-tilt">' +
            '<img src="' + logoPath + '" alt="F1site" class="logo-img logo-img-featured" width="1536" height="1024">' +
          '</span>' +
        '</span>' +
        '<a href="' + homeHref + '" class="logo logo-hit-link" aria-label="F1site home"></a>' +
      '</div>' +
    '</div>';

  var headerHtml =
    '<header class="header" id="header">' +
      '<nav class="nav container">' +
        '<button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">' +
          '<span></span><span></span>' +
        '</button>' +
        '<ul class="nav-links" id="navLinks">' + navLinksHtml() + '</ul>' +
      '</nav>' +
    '</header>' +
    '<div class="nav-backdrop" id="navBackdrop" aria-hidden="true"></div>';

  var footerLogoHtml =
    '<a href="' + homeHref + '" class="logo" aria-label="F1site home">' +
      '<img src="' + logoPath + '" alt="F1site" class="logo-img logo-img-footer" width="1536" height="1024">' +
    '</a>';

  var footerHtml =
    '<footer class="footer">' +
      '<div class="container footer-grid">' +
        '<div class="footer-brand">' +
          footerLogoHtml +
          '<p>Enterprise web design, graphic design, and digital maintenance.</p>' +
        '</div>' +
        '<div class="footer-links">' +
          '<h4>Services</h4>' +
          '<ul>' +
            '<li><a href="' + root + 'services/#web-design">Web Design</a></li>' +
            '<li><a href="' + root + 'services/#graphic-design">Graphic Design</a></li>' +
            '<li><a href="' + root + 'services/#maintenance">Maintenance</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-links">' +
          '<h4>Company</h4>' +
          '<ul>' +
            '<li><a href="' + root + 'about/">About</a></li>' +
            '<li><a href="' + root + 'process/">Process</a></li>' +
            '<li><a href="' + root + 'work/">Work</a></li>' +
            '<li><a href="' + root + 'contact/">Contact</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-links">' +
          '<h4>Connect</h4>' +
          '<ul>' +
            '<li><a href="mailto:hello@f1digital.com">Email</a></li>' +
            '<li><a href="#" aria-label="LinkedIn">LinkedIn</a></li>' +
            '<li><a href="#" aria-label="Instagram">Instagram</a></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="container footer-bottom">' +
        '<p>&copy; 2026 F1site. All rights reserved.</p>' +
      '</div>' +
    '</footer>';

  var headerEl = document.getElementById('site-header');
  var footerEl = document.getElementById('site-footer');

  if (headerEl) {
    headerEl.innerHTML = headerHtml;
    headerEl.insertAdjacentHTML('afterend', logoFeaturedHtml);
  }
  if (footerEl) footerEl.innerHTML = footerHtml;

  if (currentPage === 'home') {
    var heroContent = document.querySelector('.hero-content');
    if (heroContent) {
      heroContent.insertAdjacentHTML(
        'afterbegin',
        '<div class="hero-mobile-mark" aria-hidden="true">' +
          '<span class="hero-mobile-logo-wrap">' +
            '<img src="' + logoPath + '" alt="" class="hero-mobile-logo" width="1536" height="1024">' +
          '</span>' +
        '</div>'
      );
    }
  }
})();
