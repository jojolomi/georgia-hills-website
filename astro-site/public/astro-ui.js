(() => {
  function bindBookingSubmit() {
    const form = document.getElementById("bookingForm");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => {
      if (window.GHBooking && typeof window.GHBooking.handleSubmit === "function") {
        window.GHBooking.handleSubmit(event);
      }
    });
  }

  function bindModalClose() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const closer = target.closest("[data-close-modal]");
      if (!closer) return;
      const modalId = closer.getAttribute("data-close-modal");
      if (!modalId) return;
      if (window.GHCoreUI && typeof window.GHCoreUI.closeModal === "function") {
        window.GHCoreUI.closeModal(modalId);
      }
    });
  }

  function init() {
    bindBookingSubmit();
    bindModalClose();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
