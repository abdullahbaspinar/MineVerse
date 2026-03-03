/* firebase-config.js – Firebase initialization & Firestore helpers */

const firebaseConfig = {
  apiKey: "AIzaSyBBK03g191Tw7XZo69NWCzyG-5ayDfBvHM",
  authDomain: "mineverse-72bf9.firebaseapp.com",
  projectId: "mineverse-72bf9",
  storageBucket: "mineverse-72bf9.firebasestorage.app",
  messagingSenderId: "704146672803",
  appId: "1:704146672803:web:9bbedcf564873811178316"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const FirebaseHelper = (() => {

  /**
   * Newsletter abonesini Firestore'a kaydet.
   * Koleksiyon: newsletter_subscribers
   */
  async function addSubscriber(email) {
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

  /**
   * İletişim formu verisini Firestore'a kaydet.
   * Koleksiyon: contact_messages
   */
  async function addContactMessage({ name, email, subject, message }) {
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
