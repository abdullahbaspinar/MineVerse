/* main.js – Bootstrap, common initializations, header/footer interactivity */

/* Apply theme immediately (before DOMContentLoaded) to prevent flash */
(function () {
  const saved = localStorage.getItem('mv_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
})();

/* ── Rate Limiter ── */
const RateLimiter = (() => {
  const _stamps = {};
  return {
    check(key, cooldownMs = 10000) {
      const now = Date.now();
      if (_stamps[key] && now - _stamps[key] < cooldownMs) return false;
      _stamps[key] = now;
      return true;
    }
  };
})();

/* ── Email Validation ── */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

document.addEventListener('DOMContentLoaded', () => {
  Router.setActiveNav();
  initMobileNav();
  initThemeToggle();
  initFooterNewsletter();
});

/* ── Theme Toggle ── */
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mv_theme', next);
  });
}

/* ── Mobile Navigation ── */
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('nav-mobile');
  const closeBtn = document.getElementById('nav-mobile-close');

  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', () => mobileNav.classList.add('open'));
  closeBtn?.addEventListener('click', () => mobileNav.classList.remove('open'));

  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileNav.classList.remove('open'));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') mobileNav.classList.remove('open');
  });
}

/* ── Footer Newsletter (mini form) → Firebase ── */
function initFooterNewsletter() {
  const form = document.getElementById('footer-newsletter-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    if (!input || !input.value.trim()) return;

    const email = input.value.trim();
    if (!isValidEmail(email)) { input.value = ''; input.placeholder = 'Geçersiz e-posta'; setTimeout(() => { input.placeholder = 'E-posta adresiniz'; }, 3000); return; }
    if (!RateLimiter.check('footer_newsletter')) { input.placeholder = 'Lütfen biraz bekleyin...'; setTimeout(() => { input.placeholder = 'E-posta adresiniz'; }, 3000); return; }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '...';

    const result = await FirebaseHelper.addSubscriber(email);

    input.value = '';
    btn.disabled = false;
    btn.textContent = 'Katıl';

    if (result.success) {
      input.placeholder = result.alreadyExists ? 'Zaten abonesiniz ✓' : 'Teşekkürler! ✓';
    } else {
      input.placeholder = 'Hata oluştu, tekrar deneyin';
    }
    setTimeout(() => { input.placeholder = 'E-posta adresiniz'; }, 3000);
  });
}
