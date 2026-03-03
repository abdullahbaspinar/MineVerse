/* pages/newsletter.js – Newsletter signup with Firebase Firestore */

document.addEventListener('DOMContentLoaded', initNewsletter);

function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  const successEl = document.getElementById('newsletter-success');
  const formWrap = document.getElementById('newsletter-form-wrap');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    if (!emailInput || !emailInput.value.trim()) return;

    const email = emailInput.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Kaydediliyor...';

    const result = await FirebaseHelper.addSubscriber(email);

    if (result.success) {
      if (formWrap) formWrap.classList.add('hidden');
      if (successEl) {
        successEl.classList.remove('hidden');
        if (result.alreadyExists) {
          successEl.querySelector('h2').textContent = 'Zaten Abonesiniz!';
          successEl.querySelector('p').textContent = 'Bu e-posta adresi ile daha önce bültenimize abone olunmuş.';
        }
      }
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Abone Ol';
      emailInput.value = '';
      emailInput.placeholder = 'Bir hata oluştu, tekrar deneyin.';
      setTimeout(() => { emailInput.placeholder = 'ornek@email.com'; }, 3000);
    }
  });
}
