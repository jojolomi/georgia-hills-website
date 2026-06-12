(function () {
  const integrations = window.GHIntegrations || {};

  function initThemeToggle() {
    const root = document.documentElement;
    const storageKey = 'gh_theme';

    const applyTheme = (theme) => {
      root.classList.toggle('theme-dark', theme === 'dark');
      document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
        const icon = btn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-moon', theme !== 'dark');
          icon.classList.toggle('fa-sun', theme === 'dark');
        }
      });
    };

    const stored = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = root.classList.contains('theme-dark') ? 'light' : 'dark';
        localStorage.setItem(storageKey, next);
        applyTheme(next);
      });
    });
  }

  function initNewsletter() {
    document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const email = String(data.get('email') || '').trim();
        if (!email) return;

        const status = form.querySelector('[data-newsletter-status]');
        const endpoint = integrations.newsletterEndpoint;
        try {
          if (endpoint) {
            await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, lang: document.documentElement.lang || 'en' })
            });
          }
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'newsletter_signup', { email_domain: email.split('@')[1] || '' });
          }
          if (status) status.textContent = document.documentElement.lang === 'ar' ? 'تم استلام الاشتراك بنجاح.' : 'Subscription received successfully.';
          form.reset();
        } catch (error) {
          if (status) status.textContent = document.documentElement.lang === 'ar' ? 'تعذر الإرسال حالياً.' : 'Submission failed, please retry.';
        }
      });
    });
  }

  function initWeatherWidgets() {
    document.querySelectorAll('[data-weather-widget]').forEach(async (widget) => {
      const lat = Number(widget.getAttribute('data-lat'));
      const lon = Number(widget.getAttribute('data-lon'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const tempEl = widget.querySelector('[data-weather-temp]');
      const stateEl = widget.querySelector('[data-weather-state]');
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
        const response = await fetch(url);
        const json = await response.json();
        const current = json && json.current ? json.current : null;
        if (!current) return;
        if (tempEl) tempEl.textContent = `${Math.round(current.temperature_2m)}degC`;
        if (stateEl) stateEl.textContent = `Code ${current.weather_code}`;
      } catch (error) {}
    });
  }

  function initIntegrations() {
    if (integrations.tidioKey && !window.__ghTidioLoaded) {
      window.__ghTidioLoaded = true;
      const script = document.createElement('script');
      script.src = `https://code.tidio.co/${integrations.tidioKey}.js`;
      script.async = true;
      document.head.appendChild(script);
    }

    if (integrations.hotjarId && !window.__ghHotjarLoaded) {
      window.__ghHotjarLoaded = true;
      (function (h, o, t, j, a, r) {
        h.hj = h.hj || function () { (h.hj.q = h.hj.q || []).push(arguments); };
        h._hjSettings = { hjid: Number(integrations.hotjarId), hjsv: Number(integrations.hotjarSv || '6') };
        a = o.getElementsByTagName('head')[0];
        r = o.createElement('script');
        r.async = 1;
        r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
        a.appendChild(r);
      })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
    }
  }

  function initBookingActions() {
    const stripeLink = integrations.stripePaymentLink;
    if (stripeLink) {
      document.querySelectorAll('[data-stripe-cta]').forEach((cta) => {
        cta.setAttribute('href', stripeLink);
      });
    }

    const calendarLink = integrations.bookingCalendarLink;
    if (calendarLink) {
      document.querySelectorAll('[data-calendar-cta]').forEach((cta) => {
        cta.setAttribute('href', calendarLink);
      });
    }
  }

  function initSocialTracking() {
    document.querySelectorAll('[data-social]').forEach((link) => {
      link.addEventListener('click', () => {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'social_click', { network: link.getAttribute('data-social') || 'unknown' });
        }
      });
    });
  }

  const GHMarketing = {
    init() {
      initThemeToggle();
      initNewsletter();
      initWeatherWidgets();
      initIntegrations();
      initBookingActions();
      initSocialTracking();
    }
  };

  window.GHMarketing = GHMarketing;
  document.addEventListener('DOMContentLoaded', () => GHMarketing.init());
})();
