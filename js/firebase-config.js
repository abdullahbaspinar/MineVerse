/* firebase-config.js – Firebase initialization & Firestore helpers */

const firebaseConfig = {
  apiKey: "AIzaSyBBK03g191Tw7XZo69NWCzyG-5ayDfBvHM",
  authDomain: "mineverse-72bf9.firebaseapp.com",
  projectId: "mineverse-72bf9",
  storageBucket: "mineverse-72bf9.firebasestorage.app",
  messagingSenderId: "704146672803",
  appId: "1:704146672803:web:9bbedcf564873811178316"
};

let db;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
} catch (err) {
  console.error('[Firebase] Initialization failed:', err);
  document.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('div');
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b00020;color:#fff;padding:16px;text-align:center;font-size:14px;';
    banner.textContent = 'Firebase başlatma hatası: ' + err.message;
    document.body.appendChild(banner);
  });
}

const FirebaseHelper = (() => {

  async function addSubscriber(email) {
    if (!db) return { success: false, error: 'Firebase bağlantısı yok' };
    try {
      const snapshot = await db.collection('newsletter_subscribers')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return { success: true, alreadyExists: true };
      }

      await db.collection('newsletter_subscribers').add({
        email: email,
        subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true, alreadyExists: false };
    } catch (err) {
      console.error('[Firebase] addSubscriber error:', err);
      return { success: false, error: err.message };
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

  return { addSubscriber, addContactMessage };
})();
