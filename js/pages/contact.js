/* pages/contact.js – Contact form with Firebase Firestore */

document.addEventListener('DOMContentLoaded', initContact);

function initContact() {
  const form = document.getElementById('contact-form');
  const msgEl = document.getElementById('contact-msg');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get('name') || '').trim();
    const email = (data.get('email') || '').trim();
    const subject = data.get('subject');
    const message = (data.get('message') || '').trim();

    if (!name || !email || !message) {
      showMessage(msgEl, 'Lütfen tüm alanları doldurun.', false);
      return;
    }
    if (name.length > 100 || email.length > 254 || message.length > 5000) {
      showMessage(msgEl, 'Girdi uzunluk sınırını aşıyor.', false);
      return;
    }
    if (!isValidEmail(email)) {
      showMessage(msgEl, 'Geçerli bir e-posta adresi girin.', false);
      return;
    }
    if (!RateLimiter.check('contact_form', 15000)) {
      showMessage(msgEl, 'Lütfen biraz bekleyip tekrar deneyin.', false);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor...';

    const result = await FirebaseHelper.addContactMessage({ name, email, subject, message });

    if (result.success) {
      form.reset();
      showMessage(msgEl, 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız!', true);
    } else {
      showMessage(msgEl, 'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.', false);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Gönder';
  });
}

function showMessage(el, text, success) {
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${success ? 'form-message-success' : 'form-message-error'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 6000);
}
