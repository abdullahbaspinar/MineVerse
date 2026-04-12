/* pages/contact.js – Contact form opens default mail client (mailto) */

document.addEventListener('DOMContentLoaded', initContact);

const CONTACT_SUBJECT_LABELS = {
  general: 'Genel',
  content: 'İçerik Önerisi',
  interview: 'Röportaj Talebi',
  collaboration: 'İşbirliği',
  other: 'Diğer',
};

/** Many clients cap mailto URI length; keep a safe upper bound */
const MAX_MAILTO_URI_LENGTH = 7000;

function initContact() {
  const form = document.getElementById('contact-form');
  const msgEl = document.getElementById('contact-msg');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get('name') || '').trim();
    const email = (data.get('email') || '').trim();
    const subjectKey = data.get('subject') || 'general';
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

    const mailtoHref = buildMailtoHref({ name, email, subjectKey, message });
    if (mailtoHref.length > MAX_MAILTO_URI_LENGTH) {
      showMessage(msgEl, 'Mesaj çok uzun; göndermek için metni kısaltın.', false);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Açılıyor...';

    const link = document.createElement('a');
    link.href = mailtoHref;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    form.reset();
    showMessage(msgEl, 'Varsayılan e-posta uygulamanız açıldı. Mesajınızı oradan gönderin.', true);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Gönder';
  });
}

function buildMailtoHref({ name, email, subjectKey, message }) {
  const recipient = CONFIG.social && CONFIG.social.email ? CONFIG.social.email : 'info@mineverse.com.tr';
  const subjectLabel = CONTACT_SUBJECT_LABELS[subjectKey] || CONTACT_SUBJECT_LABELS.general;
  const siteName = CONFIG.site && CONFIG.site.name ? CONFIG.site.name : 'MineVerse';
  const subjectText = `${siteName} – İletişim: ${subjectLabel}`;
  const bodyText = `Ad Soyad: ${name}\r\nGönderen e-posta: ${email}\r\n\r\nMesaj:\r\n${message}`;
  return `mailto:${recipient}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
}

function showMessage(el, text, success) {
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${success ? 'form-message-success' : 'form-message-error'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 8000);
}
