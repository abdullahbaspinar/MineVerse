/* firebase-config.js – Firebase initialization & Firestore helpers */

const firebaseConfig = {
  apiKey: "AIzaSyBBK03g191Tw7XZo69NWCzyG-5ayDfBvHM",
  authDomain: "mineverse-72bf9.firebaseapp.com",
  projectId: "mineverse-72bf9",
  storageBucket: "mineverse-72bf9.firebasestorage.app",
  messagingSenderId: "704146672803",
  appId: "1:704146672803:web:9bbedcf564873811178316"
};

/* var: tüm klasik script’lerden window.db ile erişim (let bazı ortamlarda admin.js’den görünmez). */
var db = null;
var fbStorage = null;

function showFirebaseInitBanner(message) {
  const text = message || 'Sistem bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.';
  const run = () => {
    const banner = document.createElement('div');
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b00020;color:#fff;padding:16px;text-align:center;font-size:14px;';
    banner.textContent = text;
    document.body.appendChild(banner);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}

try {
  if (typeof firebase === 'undefined' || !firebase.initializeApp) {
    console.error('[Firebase] SDK yüklenmedi (betik engellenmiş veya ağ hatası olabilir).');
    showFirebaseInitBanner('Firebase yüklenemedi. Tarayıcıda reklam/izleme engelleyiciyi kontrol edin veya sayfayı yenileyin.');
  } else {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    try {
      if (db && typeof db.settings === 'function') {
        db.settings({ experimentalForceLongPolling: true, merge: true });
      }
    } catch (settingsErr) {
      console.warn('[Firebase] Firestore settings:', settingsErr);
    }
    try {
      window.MineVerseDb = db;
    } catch (e) { /* ignore */ }
    if (typeof firebase.storage === 'function') {
      try {
        fbStorage = firebase.storage();
      } catch (storageErr) {
        console.error('[Firebase] Storage başlatılamadı:', storageErr);
      }
    }
  }
} catch (err) {
  console.error('[Firebase] Initialization failed:', err);
  db = null;
  try { window.MineVerseDb = null; } catch (e) { /* ignore */ }
  showFirebaseInitBanner();
}

const FirebaseHelper = (() => {

  function extFromImageMime(mime) {
    const m = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return m[mime] || 'jpg';
  }

  /**
   * Kapak görselini Firebase Storage'a yükler (yalnızca giriş yapmış admin).
   * @param {'posts'|'videos'} collectionFolder
   * @param {File} file
   * @returns {Promise<{ success: true, url: string } | { success: false, error: string }>}
   */
  async function uploadCoverImage(collectionFolder, file) {
    if (!fbStorage) return { success: false, error: 'Storage kullanılamıyor (SDK eksik veya bağlantı yok).' };
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth().currentUser) {
      return { success: false, error: 'Görsel yüklemek için giriş yapmalısınız.' };
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!file || !allowed.includes(file.type)) {
      return { success: false, error: 'Yalnızca JPEG, PNG, WebP veya GIF yükleyebilirsiniz.' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Dosya boyutu en fazla 5 MB olabilir.' };
    }
    if (collectionFolder !== 'posts' && collectionFolder !== 'videos') {
      return { success: false, error: 'Geçersiz hedef klasör.' };
    }
    try {
      const ext = extFromImageMime(file.type);
      const rand = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now();
      const path = `covers/${collectionFolder}/${Date.now()}_${rand}.${ext}`;
      const ref = fbStorage.ref(path);
      await ref.put(file, {
        contentType: file.type,
        cacheControl: 'public,max-age=31536000',
      });
      const url = await ref.getDownloadURL();
      return { success: true, url };
    } catch (err) {
      console.error('[Firebase] uploadCoverImage error:', err);
      const code = err && err.code;
      let msg = (err && err.message) || 'Yükleme başarısız.';
      if (code === 'storage/unauthorized') {
        msg = 'Storage izni yok: Giriş yapın ve Firebase Storage kurallarında yazma iznini doğrulayın.';
      } else if (code === 'storage/canceled') {
        msg = 'Yükleme iptal edildi.';
      } else if (code === 'storage/retry-limit-exceeded') {
        msg = 'Ağ hatası: bir süre sonra tekrar deneyin.';
      } else if (code === 'storage/invalid-checksum') {
        msg = 'Dosya aktarımı bozuldu; tekrar seçin.';
      }
      return { success: false, error: msg };
    }
  }

  async function addContactMessage({ name, email, subject, message }) {
    if (!db) return { success: false, error: 'Firebase bağlantısı yok' };
    try {
      await db.collection('contact_messages').add({
        name,
        email,
        subject: subject || 'general',
        message,
        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
      return { success: true };
    } catch (err) {
      console.error('[Firebase] addContactMessage error:', err);
      return { success: false, error: err.message };
    }
  }

  return { addContactMessage, uploadCoverImage };
})();
