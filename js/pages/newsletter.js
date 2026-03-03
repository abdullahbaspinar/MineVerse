/* pages/newsletter.js – Newsletter signup form handling */

document.addEventListener('DOMContentLoaded', initNewsletter);

function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  const successEl = document.getElementById('newsletter-success');
  const formWrap = document.getElementById('newsletter-form-wrap');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]');
    if (!email || !email.value.trim()) return;

    /* In production, this would POST to Mailchimp or a backend endpoint */
    console.log('[Newsletter] Subscribe:', email.value);

    if (formWrap) formWrap.classList.add('hidden');
    if (successEl) successEl.classList.remove('hidden');
  });
}
