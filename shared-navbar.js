(function () {
  function getFilename() {
    const path = (window.location.pathname || '').split('/').pop();
    return path || 'index.html';
  }

  function getPrefix() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length > 0 && ['qa', 'ae', 'sa', 'eg', 'kw'].includes(parts[0])) {
      return '../';
    }
    return '';
  }

  function detectArabic(filename) {
    const prefix = getPrefix();
    if (prefix === '../') return true; // all regional pages are arabic
    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get('lang');
    if (queryLang === 'ar') return true;
    if (queryLang === 'en') return false;
    if (filename === 'arabic.html' || filename.endsWith('-ar.html')) return true;
    return document.documentElement.lang === 'ar';
  }

  function forceLtrLayout() {
    document.documentElement.setAttribute('dir', 'ltr');
    document.body && document.body.setAttribute('dir', 'ltr');
  }

  function getPagePairs() {
    return {
      'index.html': 'arabic.html',
      'arabic.html': 'index.html',
      'about.html': 'about-ar.html',
      'about-ar.html': 'about.html',
      'services.html': 'services-ar.html',
      'services-ar.html': 'services.html',
      'guide.html': 'guide-ar.html',
      'guide-ar.html': 'guide.html',
      'blog.html': 'blog-ar.html',
      'blog-ar.html': 'blog.html',
      'booking.html': 'booking-ar.html',
      'booking-ar.html': 'booking.html',
      'contact.html': 'contact-ar.html',
      'contact-ar.html': 'contact.html',
      'batumi.html': 'batumi-ar.html',
      'batumi-ar.html': 'batumi.html',
      'kazbegi.html': 'kazbegi-ar.html',
      'kazbegi-ar.html': 'kazbegi.html',
      'martvili.html': 'martvili-ar.html',
      'martvili-ar.html': 'martvili.html',
      'signagi.html': 'signagi-ar.html',
      'signagi-ar.html': 'signagi.html',
      'tbilisi.html': 'tbilisi-ar.html',
      'tbilisi-ar.html': 'tbilisi.html',
      'honeymoon.html': 'honeymoon-ar.html',
      'honeymoon-ar.html': 'honeymoon.html',
      'destinations-hub.html': 'destinations-hub-ar.html',
      'destinations-hub-ar.html': 'destinations-hub.html',
      'family-travel-hub.html': 'family-travel-hub-ar.html',
      'family-travel-hub-ar.html': 'family-travel-hub.html',
      'halal-travel-hub.html': 'halal-travel-hub-ar.html',
      'halal-travel-hub-ar.html': 'halal-travel-hub.html',
      'itineraries-hub.html': 'itineraries-hub-ar.html',
      'itineraries-hub-ar.html': 'itineraries-hub.html',
      'safety-hub.html': 'safety-hub-ar.html',
      'safety-hub-ar.html': 'safety-hub.html',
      'article-7-days-georgia.html': 'article-7-days-georgia-ar.html',
      'article-7-days-georgia-ar.html': 'article-7-days-georgia.html',
      'article-georgian-food.html': 'article-georgian-food-ar.html',
      'article-georgian-food-ar.html': 'article-georgian-food.html',
      'article-is-georgia-safe.html': 'article-is-georgia-safe-ar.html',
      'article-is-georgia-safe-ar.html': 'article-is-georgia-safe.html'
    };
  }

  function buildLangSwitch(filename, isArabic) {
    const prefix = getPrefix();
    if (prefix === '../') {
      // If we're in a regional directory, switching to English goes to root English
      return '../index.html';
    }
    const pairs = getPagePairs();
    return pairs[filename] || (isArabic ? 'index.html' : 'arabic.html');
  }

  function getConfig(filename, isArabic) {
    const prefix = getPrefix();
    const home = prefix + (isArabic ? 'arabic.html' : 'index.html');
    return {
      isArabic,
      prefix,
      logo: prefix + 'favicon.ico',
      home,
      about: prefix + (isArabic ? 'about-ar.html' : 'about.html'),
      services: prefix + (isArabic ? 'services-ar.html' : 'services.html'),
      guide: prefix + (isArabic ? 'guide-ar.html' : 'guide.html'),
      blog: prefix + (isArabic ? 'blog-ar.html' : 'blog.html'),
      contact: prefix + (isArabic ? 'contact-ar.html' : 'contact.html'),
      booking: prefix + (isArabic ? 'booking-ar.html' : 'booking.html'),
      langSwitch: buildLangSwitch(filename, isArabic),
      texts: {
        home: isArabic ? 'الرئيسية' : 'Home',
        about: isArabic ? 'من نحن' : 'About',
        destinations: isArabic ? 'الوجهات' : 'Destinations',
        services: isArabic ? 'الخدمات' : 'Services',
        fleet: isArabic ? 'السيارات' : 'Fleet',
        reviews: isArabic ? 'الآراء' : 'Reviews',
        guide: isArabic ? 'الدليل' : 'Guide',
        blog: isArabic ? 'المدونة' : 'Blog',
        contact: isArabic ? 'اتصل بنا' : 'Contact',
        book: isArabic ? 'احجز الآن' : 'Book Now',
        lang: isArabic ? 'English' : 'العربية',
        close: isArabic ? 'إغلاق القائمة' : 'Close Navigation Menu',
        toggle: isArabic ? 'فتح القائمة' : 'Toggle Navigation Menu'
      }
    };
  }

  function activeClass(filename, target) {
    if (!filename) return '';
    if (target === 'home' && (filename === 'index.html' || filename === 'arabic.html')) return ' active';
    if (target === 'about' && (filename === 'about.html' || filename === 'about-ar.html')) return ' active';
    if (target === 'services' && (filename === 'services.html' || filename === 'services-ar.html')) return ' active';
    if (target === 'guide' && (filename === 'guide.html' || filename === 'guide-ar.html')) return ' active';
    if (target === 'blog' && (filename === 'blog.html' || filename === 'blog-ar.html')) return ' active';
    if (target === 'contact' && (filename === 'contact.html' || filename === 'contact-ar.html')) return ' active';
    if (target === 'booking' && (filename === 'booking.html' || filename === 'booking-ar.html')) return ' active';
    return '';
  }

  function buildNavbarMarkup(cfg, filename) {
    const desktopLinks = `
      <div id="desktop-links-container" style="display:contents">
        <a href="${cfg.home}" data-nav-link="home" class="nav-link${activeClass(filename, 'home')}">${cfg.texts.home}</a>
        <a href="${cfg.about}" data-nav-link="about" class="nav-link${activeClass(filename, 'about')}">${cfg.texts.about}</a>
        <a href="${cfg.services}" data-nav-link="services" class="nav-link${activeClass(filename, 'services')}">${cfg.texts.services}</a>
        <a href="${cfg.guide}" data-nav-link="guide" class="nav-link${activeClass(filename, 'guide')}">${cfg.texts.guide}</a>
        <a href="${cfg.blog}" data-nav-link="blog" class="nav-link${activeClass(filename, 'blog')}">${cfg.texts.blog}</a>
        <a href="${cfg.contact}" data-nav-link="contact" class="nav-link${activeClass(filename, 'contact')}">${cfg.texts.contact}</a>
      </div>
    `;

    return `
      <nav id="navbar" class="navbar" dir="ltr" data-shared-navbar="true">
        <div class="container">
          <div class="navbar-inner">
            <a href="${cfg.home}" class="nav-logo">
              <div><img src="${cfg.logo}" width="56" height="56" alt="Georgia Hills Logo" class="nav-logo-img"></div>
              <span data-nav-brand="text">Georgia Hills</span>
            </a>
            <div class="desktop-menu">
              ${desktopLinks}
              <div style="display:flex; gap:0.75rem;">
                <div class="custom-select-wrapper" id="currency-desktop">
                  <button class="action-btn custom-select-trigger" onclick="UIManager.toggleCurrencyDropdown('desktop')" aria-haspopup="true">
                    <img src="https://flagcdn.com/w40/ge.png" alt="GEL" class="currency-flag-sm" id="curr-flag-desktop">
                    <span id="curr-code-desktop">GEL</span>
                    <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;"></i>
                  </button>
                  <div class="custom-options" id="curr-options-desktop"></div>
                </div>
                <a href="${cfg.langSwitch}" class="action-btn" aria-label="Language switch: ${cfg.texts.lang}">
                  <i class="fa-solid fa-globe"></i><span class="lang-text">${cfg.texts.lang}</span>
                </a>
              </div>
              <a href="${cfg.booking}" data-nav-link="booking" class="btn-book-nav${activeClass(filename, 'booking')}">${cfg.texts.book}</a>
            </div>
            <div class="mobile-controls">
              <a href="${cfg.langSwitch}" class="action-btn" aria-label="Language switch: ${cfg.texts.lang}" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;">
                <i class="fa-solid fa-globe text-primary"></i><span class="lang-text">${cfg.texts.lang}</span>
              </a>
              <button id="mobile-menu-btn" class="btn-mobile-menu" aria-label="${cfg.texts.toggle}" aria-expanded="false" aria-controls="mobile-menu"><i class="fa-solid fa-bars"></i></button>
            </div>
          </div>
        </div>
      </nav>

      <div id="mobile-menu" aria-hidden="true">
        <button id="close-menu-btn" class="close-menu-btn" aria-label="${cfg.texts.close}"><i class="fa-solid fa-xmark"></i></button>
        <div id="mobile-links-container">
          <a href="${cfg.home}" data-nav-link="home" class="mobile-link${activeClass(filename, 'home')}">${cfg.texts.home}</a>
          <a href="${cfg.about}" data-nav-link="about" class="mobile-link${activeClass(filename, 'about')}">${cfg.texts.about}</a>
          <a href="${cfg.services}" data-nav-link="services" class="mobile-link${activeClass(filename, 'services')}">${cfg.texts.services}</a>
          <a href="${cfg.guide}" data-nav-link="guide" class="mobile-link${activeClass(filename, 'guide')}">${cfg.texts.guide}</a>
          <a href="${cfg.blog}" data-nav-link="blog" class="mobile-link${activeClass(filename, 'blog')}">${cfg.texts.blog}</a>
          <a href="${cfg.contact}" data-nav-link="contact" class="mobile-link${activeClass(filename, 'contact')}">${cfg.texts.contact}</a>
        </div>
        <div class="mobile-settings">
          <div class="custom-select-wrapper" id="currency-mobile">
            <button class="action-btn custom-select-trigger" onclick="UIManager.toggleCurrencyDropdown('mobile')" aria-haspopup="true">
              <img src="https://flagcdn.com/w40/ge.png" alt="GEL" class="currency-flag-sm" id="curr-flag-mobile">
              <span id="curr-code-mobile">GEL</span>
              <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;"></i>
            </button>
            <div class="custom-options" id="curr-options-mobile"></div>
          </div>
        </div>
        <a href="${cfg.booking}" data-nav-link="booking" class="mobile-btn-book${activeClass(filename, 'booking')}">${cfg.texts.book}</a>
      </div>
    `;
  }

  function buildFooterMarkup(cfg) {
    const isAr = cfg.isArabic;
    const privacyText = isAr ? 'سياسة الخصوصية' : 'Privacy Policy';
    const termsText = isAr ? 'الشروط والأحكام' : 'Terms of Service';
    const quickLinks = isAr ? 'روابط سريعة' : 'Quick Links';
    const contactUs = isAr ? 'تواصل معنا' : 'Contact Us';
    const homeText = isAr ? 'الرئيسية' : 'Home';
    const bookNow = isAr ? 'احجز الآن' : 'Book Now';
    const rights = isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.';
    const tagline = isAr ? 'حلول نقل مميزة في جورجيا. أمان، راحة، وخبرة محلية في كل ميل.' : 'Premium transport solutions in Georgia. Safety, comfort, and local expertise in every mile.';
    const mapText = isAr ? 'عرض الخريطة' : 'Load Map';

    return `
      <footer class="footer" dir="${isAr ? 'rtl' : 'ltr'}">
        <div class="container">
            <div id="footer-content" class="footer-grid">
                <div>
                    <div class="footer-brand">
                        <div class="footer-brand-icon"><i class="fa-solid fa-mountain"></i></div>
                        <span class="footer-brand-text">Georgia Hills</span>
                    </div>
                    <p style="color:var(--color-gray-300); font-size:0.875rem; line-height:1.6; margin-bottom:1.5rem;">${tagline}</p>
                    <div class="footer-social">
                        <a href="https://instagram.com/georgiahills" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
                        <a href="https://facebook.com/georgiahills" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
                        <button onclick="App && App.share && App.share()" class="social-btn" aria-label="Share Website"><i class="fa-solid fa-share-nodes"></i></button>
                    </div>
                    <div style="margin-top:1.5rem; display:flex; gap:1rem; font-size:0.75rem; color:var(--color-gray-400);">
                        <a href="${cfg.prefix}${isAr ? 'legal-ar.html' : 'legal.html'}" style="color:inherit;">${privacyText}</a>
                        <a href="${cfg.prefix}${isAr ? 'legal-ar.html' : 'legal.html'}" style="color:inherit;">${termsText}</a>
                    </div>
                </div>
                <div>
                    <h3>${quickLinks}</h3>
                    <ul>
                        <li><a href="${cfg.home}">${homeText}</a></li>
                        <li><a href="${cfg.booking}">${bookNow}</a></li>
                        <li><a href="${cfg.prefix}${isAr ? 'destinations-hub-ar.html' : 'destinations-hub.html'}">${isAr ? 'الوجهات' : 'Destinations'}</a></li>
                        <li><a href="${cfg.prefix}${isAr ? 'halal-travel-hub-ar.html' : 'halal-travel-hub.html'}">${isAr ? 'السفر الحلال' : 'Halal Travel'}</a></li>
                    </ul>
                </div>
                <div>
                    <h3>${contactUs}</h3>
                    <ul style="color:var(--color-gray-400);">
                        <li class="footer-contact-item"><i class="fa-solid fa-phone text-accent"></i> <a href="tel:+995579088537" dir="ltr">+995 579 08 85 37</a></li>
                        <li class="footer-contact-item"><i class="fa-brands fa-whatsapp text-accent"></i> <a href="https://wa.me/995579088537" target="_blank" rel="noopener noreferrer" dir="ltr">+995 579 08 85 37</a></li>
                        <li class="footer-contact-item"><i class="fa-solid fa-envelope text-accent"></i> <a href="mailto:info@georgiahills.com">info@georgiahills.com</a></li>
                        <li class="footer-contact-item"><i class="fa-solid fa-location-dot text-accent"></i> <span>Rustaveli Ave, Tbilisi, Georgia</span></li>
                    </ul>
                </div>
                <div>
                    <div class="footer-map-container">
                        <span class="footer-map-overlay"><i class="fa-solid fa-map-location-dot"></i> <span>${mapText}</span></span>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                &copy; <span id="year">${new Date().getFullYear()}</span> Georgia Hills. ${rights}
            </div>
        </div>
      </footer>
      <div class="fab-container">
        <button id="backToTop" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="fab-scroll" aria-label="Back to top">
            <i class="fa-solid fa-arrow-up"></i>
        </button>
        <a href="https://wa.me/995579088537" target="_blank" rel="noopener noreferrer" class="fab-whatsapp" aria-label="Contact on WhatsApp">
            <i class="fa-brands fa-whatsapp" style="font-size:1.75rem;"></i>
        </a>
      </div>
    `;
  }

  function renderSharedNavbarAndFooter() {
    // 1. Navbar
    const nav = document.getElementById('navbar');
    const filename = getFilename();
    const isArabic = detectArabic(filename);
    const cfg = getConfig(filename, isArabic);

    if (isArabic) {
      forceLtrLayout();
    }

    if (nav) {
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu) mobileMenu.remove();
      nav.insertAdjacentHTML('beforebegin', buildNavbarMarkup(cfg, filename));
      nav.remove();
    }

    // 2. Footer
    let existingFooter = document.querySelector('footer.footer');
    let fabContainer = document.querySelector('.fab-container');
    
    // Some pages might not have a footer at all, we inject it at the end of body or main
    if (!existingFooter) {
        document.body.insertAdjacentHTML('beforeend', buildFooterMarkup(cfg));
    } else {
        if (fabContainer) fabContainer.remove();
        existingFooter.outerHTML = buildFooterMarkup(cfg);
    }

    window.__GH_SHARED_LAYOUT__ = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSharedNavbarAndFooter);
  } else {
    renderSharedNavbarAndFooter();
  }
})();
