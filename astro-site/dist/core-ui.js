(function () {
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  const GHCoreUI = {
    init() {
      document.querySelectorAll('[data-close-modal]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-close-modal');
          if (!target) return;
          closeModal(target);
        });
      });

      document.querySelectorAll('[data-currency-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-currency-toggle');
          if (!type) return;
          if (window.GHCoreUI && typeof window.GHCoreUI.toggleCurrencyDropdown === 'function') {
            window.GHCoreUI.toggleCurrencyDropdown(type);
          }
        });
      });
    },
    closeModal
  };

  window.GHCoreUI = GHCoreUI;
  document.addEventListener('DOMContentLoaded', () => GHCoreUI.init());
})();
