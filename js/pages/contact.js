/* pages/contact.js – Contact form handling */

document.addEventListener('DOMContentLoaded', initContact);

function initContact() {
  const form = document.getElementById('contact-form');
  const msgEl = document.getElementById('contact-msg');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name');
    const email = data.get('email');
    const message = data.get('message');

    if (!name || !email || !message) {
      showMessage(msgEl, 'Lütfen tüm alanları doldurun.', false);
      return;
    }

    /* In production, POST to an endpoint or use a service like Formspree */
    console.log('[Contact]', { name, email, message });

    form.reset();
    showMessage(msgEl, 'Mesajınız başarıyla gönderildi. Teşekkür ederiz!', true);
  });
}

function showMessage(el, text, success) {
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${success ? 'form-message-success' : 'form-message-error'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}
