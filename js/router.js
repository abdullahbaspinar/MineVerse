/* router.js – URL param reading, active nav highlighting, scroll helpers */

const Router = (() => {

  /** Read a URL search parameter */
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /** Set URL search params without reload */
  function setParams(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    });
    window.history.replaceState(null, '', url);
  }

  /** Highlight active nav link based on current page */
  function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav-link]').forEach(link => {
      const href = link.getAttribute('href');
      if (href === path || (path === 'index.html' && href === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /** Smooth scroll to top */
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return { getParam, setParams, setActiveNav, scrollToTop };
})();
