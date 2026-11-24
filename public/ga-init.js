// gtag's queue; the ID comes from this tag's data-ga-id.
window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() {
  window.dataLayer.push(arguments);
};
window.gtag('js', new Date());
window.gtag('config', document.currentScript.dataset.gaId);
