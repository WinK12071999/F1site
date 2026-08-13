(function () {
  'use strict';

  var NAV = [
    { id: 'services', href: 'services.html', label: 'Services' },
    { id: 'about', href: 'about.html', label: 'About' },
    { id: 'process', href: 'process.html', label: 'Process' },
    { id: 'work', href: 'work.html', label: 'Work' },
    { id: 'contact', href: 'contact.html', label: 'Get in Touch', cta: true }
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

  var logoPath = 'logos/f1-logo-transparent.png';

  var logoFeaturedHtml =
    '<div class="logo-anchor" id="site-logo">' +
      '<span class="logo-aura" aria-hidden="true"></span>' +
      '<div class="logo-visual">' +
        '<span class="logo-motion">' +
          '<span class="logo-tilt">' +
            '<img src="' + logoPath + '" alt="F1site" class="logo-img logo-img-featured" width="1536" height="1024">' +
          '</span>' +
        '</span>' +
        '<a href="index.html" class="logo logo-hit-link" aria-label="F1site home"></a>' +
      '</div>' +
    '</div>';

  var headerHtml =
    '<header class="header" id="header">' +
      '<nav class="nav container" aria-label="Primary">' +
        '<button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="navLinks">' +
          '<span></span><span></span>' +
        '</button>' +
        '<ul class="nav-links nav-links-desktop" id="navLinksDesktop">' + navLinksHtml() + '</ul>' +
      '</nav>' +
    '</header>' +
    '<div class="nav-backdrop" id="navBackdrop" aria-hidden="true"></div>' +
    '<nav class="nav-panel" id="navPanel" aria-label="Mobile" aria-hidden="true">' +
      '<ul class="nav-links" id="navLinks">' + navLinksHtml() + '</ul>' +
    '</nav>';

  var footerLogoHtml =
    '<a href="index.html" class="logo" aria-label="F1site home">' +
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
            '<li><a href="services.html#web-design">Web Design</a></li>' +
            '<li><a href="services.html#graphic-design">Graphic Design</a></li>' +
            '<li><a href="services.html#maintenance">Maintenance</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-links">' +
          '<h4>Company</h4>' +
          '<ul>' +
            '<li><a href="about.html">About</a></li>' +
            '<li><a href="process.html">Process</a></li>' +
            '<li><a href="work.html">Work</a></li>' +
            '<li><a href="contact.html">Contact</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-links">' +
          '<h4>Connect</h4>' +
          '<ul>' +
            '<li><a href="mailto:projects@f1site.com">Email</a></li>' +
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
    // Keep the mobile panel/backdrop on <body> so position:fixed is never
    // clipped by header filters or wrapper stacking contexts.
    var backdrop = document.getElementById('navBackdrop');
    var panel = document.getElementById('navPanel');
    if (backdrop) document.body.appendChild(backdrop);
    if (panel) document.body.appendChild(panel);
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
