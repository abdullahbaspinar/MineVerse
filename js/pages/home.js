/* pages/home.js – Homepage initialization & section rendering */

document.addEventListener('DOMContentLoaded', initHome);

async function initHome() {
  API.clearCache();

  await Promise.all([
    renderFeatured(),
    renderRecent(),
    renderInterviews(),
    renderStories(),
    renderUpdates(),
    renderHomeVideos(),
  ]);

  showFirebaseDebugIfError();
}

function showFirebaseDebugIfError() {
  const err = API.getLastError();
  if (!err) return;

  const banner = document.createElement('div');
  banner.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
    'background:#b00020;color:#fff;padding:16px 24px;font-size:14px;font-family:monospace;' +
    'line-height:1.5;max-height:40vh;overflow:auto;';

  let hint = '';
  const msg = err.message || String(err);
  const code = err.code || '';

  if (code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
    hint =
      '<br><br><strong>Firestore Security Rules sorunu.</strong><br>' +
      'Firebase Console → Firestore Database → Rules kısmına gidin ve şu kuralları uygulayın:<br><br>' +
      '<code style="background:#000;padding:8px;display:block;white-space:pre;border-radius:4px;">' +
      'rules_version = \'2\';\n' +
      'service cloud.firestore {\n' +
      '  match /databases/{database}/documents {\n' +
      '    match /posts/{doc} { allow read: if true; allow write: if request.auth != null; }\n' +
      '    match /videos/{doc} { allow read: if true; allow write: if request.auth != null; }\n' +
      '    match /newsletter_subscribers/{doc} { allow read: if request.auth != null; allow create: if true; }\n' +
      '    match /contact_messages/{doc} { allow read: if request.auth != null; allow create: if true; }\n' +
      '  }\n' +
      '}</code>';
  } else if (msg.includes('Failed to get document') || msg.includes('network') || msg.includes('unavailable')) {
    hint = '<br><br><strong>Ağ hatası.</strong> İnternet bağlantınızı kontrol edin veya Firebase projenizin aktif olduğundan emin olun.';
  } else if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
    hint = '<br><br><strong>Firebase kotası dolmuş.</strong> Ücretsiz plan limitini aştınız.';
  }

  banner.innerHTML =
    '<strong>Firebase Hatası:</strong> ' + Render.escapeHtml(msg) +
    (code ? ' <em>(code: ' + Render.escapeHtml(code) + ')</em>' : '') +
    hint +
    '<br><br><button onclick="this.parentElement.remove()" ' +
    'style="background:#fff;color:#b00020;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-weight:bold;">Kapat</button>';

  document.body.appendChild(banner);
}

async function renderFeatured() {
  const section = document.getElementById('featured-section');
  const container = document.getElementById('featured-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(1));

  try {
    const posts = await API.getFeaturedPosts(1);
    container.innerHTML = '';
    if (!posts.length) {
      if (section) section.style.display = 'none';
      return;
    }
    posts.forEach(p => container.appendChild(Render.postCard(p, { featured: true })));
  } catch {
    container.innerHTML = '';
    if (section) section.style.display = 'none';
  }
}

async function renderRecent() {
  const container = document.getElementById('recent-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const posts = await API.getRecentPosts(6);
    container.innerHTML = '';
    if (!posts.length) {
      const err = API.getLastError();
      if (err) {
        container.appendChild(Render.errorState('Firestore bağlantı hatası: ' + (err.message || err)));
      } else {
        container.appendChild(Render.emptyState('Henüz içerik eklenmemiş. Admin panelden ilk içeriğinizi ekleyin.'));
      }
      return;
    }
    posts.forEach(p => container.appendChild(Render.postCard(p)));
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(Render.errorState('Beklenmeyen hata: ' + (e.message || e)));
  }
}

async function renderInterviews() {
  const section = document.getElementById('interview-posts')?.closest('.home-section');
  const container = document.getElementById('interview-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const posts = await API.getInterviews(3);
    container.innerHTML = '';
    if (!posts.length) { if (section) section.style.display = 'none'; return; }
    posts.forEach(p => container.appendChild(Render.postCard(p)));
  } catch {
    container.innerHTML = '';
    if (section) section.style.display = 'none';
  }
}

async function renderStories() {
  const section = document.getElementById('story-posts')?.closest('.home-section');
  const container = document.getElementById('story-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const posts = await API.getStories(3);
    container.innerHTML = '';
    if (!posts.length) { if (section) section.style.display = 'none'; return; }
    posts.forEach(p => container.appendChild(Render.postCard(p)));
  } catch {
    container.innerHTML = '';
    if (section) section.style.display = 'none';
  }
}

async function renderUpdates() {
  const section = document.getElementById('update-posts')?.closest('.home-section');
  const container = document.getElementById('update-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const posts = await API.getUpdates(3);
    container.innerHTML = '';
    if (!posts.length) { if (section) section.style.display = 'none'; return; }
    posts.forEach(p => container.appendChild(Render.postCard(p)));
  } catch {
    container.innerHTML = '';
    if (section) section.style.display = 'none';
  }
}

async function renderHomeVideos() {
  const section = document.getElementById('video-posts')?.closest('.home-section');
  const container = document.getElementById('video-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const videos = await API.getVideos(3);
    container.innerHTML = '';
    if (!videos.length) { if (section) section.style.display = 'none'; return; }
    videos.forEach(v => container.appendChild(Render.videoCard(v)));
  } catch {
    container.innerHTML = '';
    if (section) section.style.display = 'none';
  }
}
