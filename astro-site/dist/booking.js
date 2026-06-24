(function () {
  const leadFormSelector = '[data-lead-form]';

  function wireEstimateTriggers() {
    document.querySelectorAll('[data-booking-estimate-trigger]').forEach((el) => {
      el.addEventListener('change', () => {
        if (window.GHBooking && typeof window.GHBooking.updateEstimate === 'function') {
          window.GHBooking.updateEstimate();
        }
      });
    });
  }

  function wirePlanPrefill() {
    document.querySelectorAll('[data-book-plan]').forEach((cta) => {
      cta.addEventListener('click', () => {
        const plan = cta.getAttribute('data-book-plan') || '';
        try {
          sessionStorage.setItem('gh_book_plan', plan);
        } catch (e) {}
      });
    });
  }

  function wireLeadForm() {
    const form = document.querySelector(leadFormSelector);
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'lead_contact_submit', {
          event_category: 'conversion',
          event_label: window.location.pathname,
          intent: String(payload.intent || 'general')
        });
      }

      const phone = String(payload.phone || '').replace(/\s+/g, '');
      const message = encodeURIComponent(
        `Lead request\nName: ${payload.name || ''}\nPhone: ${phone}\nIntent: ${payload.intent || ''}\nCallback: ${payload.callback || 'no'}\nNotes: ${payload.notes || ''}`
      );
      window.open(`https://wa.me/995579088537?text=${message}`, '_blank', 'noopener,noreferrer');
    });
  }

  function applyStoredPlan() {
    const select = document.getElementById('travelIntent');
    if (!select) return;

    try {
      const raw = sessionStorage.getItem('gh_book_plan');
      const map = {
        standard: 'family',
        luxury: 'luxury',
        vip_family: 'family'
      };
      const next = map[raw];
      if (next) {
        select.value = next;
        sessionStorage.removeItem('gh_book_plan');
      }
    } catch (e) {}
  }

  const GHBooking = {
    init() {
      wireEstimateTriggers();
      wirePlanPrefill();
      wireLeadForm();
      applyStoredPlan();
    }
  };

  window.GHBooking = GHBooking;
  document.addEventListener('DOMContentLoaded', () => GHBooking.init());
})();
