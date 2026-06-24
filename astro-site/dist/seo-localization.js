(function () {
  const variants = {
    family: {
      en: {
        title: 'Private Family Trips in Georgia',
        subtitle: 'Comfort-first itinerary for families with private driver and rapid WhatsApp support.'
      },
      ar: {
        title: 'رحلات عائلية خاصة في جورجيا',
        subtitle: 'برنامج مريح للأطفال والعائلة مع سائق عربي ودعم واتساب سريع.'
      }
    },
    luxury_couple: {
      en: {
        title: 'Luxury Couple Experiences in Georgia',
        subtitle: 'Romantic routes, premium stays, and private transfers without friction.'
      },
      ar: {
        title: 'تجارب فاخرة للأزواج في جورجيا',
        subtitle: 'مسارات رومانسية وإقامة راقية وتنقل خاص بدون تعقيد.'
      }
    },
    women_friendly: {
      en: {
        title: 'Women-Friendly Travel in Georgia',
        subtitle: 'Practical planning for women groups with privacy and safety priorities.'
      },
      ar: {
        title: 'جولات نسائية مريحة وآمنة',
        subtitle: 'تنسيق عملي للمجموعات النسائية مع أولويات الخصوصية والأمان.'
      }
    }
  };

  function chooseIntent(defaultIntent) {
    const params = new URLSearchParams(window.location.search);
    const utmIntent = params.get('utm_intent');
    if (utmIntent && variants[utmIntent]) return utmIntent;

    const campaign = (params.get('utm_campaign') || '').toLowerCase();
    if (campaign.includes('honeymoon') || campaign.includes('couple')) return 'luxury_couple';
    if (campaign.includes('women')) return 'women_friendly';
    return defaultIntent;
  }

  function applyHeroVariant() {
    const block = document.querySelector('[data-hero-variant]');
    if (!block) return;

    const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    const defaultIntent = block.getAttribute('data-default-intent') || 'family';
    const intent = chooseIntent(defaultIntent);
    const copy = variants[intent]?.[lang];
    if (!copy) return;

    const title = block.querySelector('[data-hero-title]');
    const subtitle = block.querySelector('[data-hero-subtitle]');
    if (title) title.textContent = copy.title;
    if (subtitle) subtitle.textContent = copy.subtitle;
  }

  const GHLocalization = {
    init() {
      applyHeroVariant();
    }
  };

  window.GHLocalization = GHLocalization;
  document.addEventListener('DOMContentLoaded', () => GHLocalization.init());
})();
