/* main.js – Bootstrap, common initializations, header/footer interactivity */

document.addEventListener('DOMContentLoaded', () => {
  Router.setActiveNav();
  initMobileNav();
  initFooterNewsletter();
});

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
