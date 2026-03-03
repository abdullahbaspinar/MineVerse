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

  const code = err.code || '';
  let userMsg = 'İçerikler şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.';
  if (code === 'permission-denied') userMsg = 'Veri erişim izni reddedildi. Lütfen site yöneticisiyle iletişime geçin.';
  else if (code === 'unavailable' || (err.message && err.message.includes('network'))) userMsg = 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.';

  console.error('[Firebase]', code, err.message);

  const banner = document.createElement('div');
  banner.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
    'background:var(--color-error, #b00020);color:#fff;padding:12px 24px;font-size:14px;' +
    'text-align:center;';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Kapat';
  closeBtn.style.cssText = 'background:#fff;color:#b00020;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-weight:bold;margin-left:12px;';
  closeBtn.addEventListener('click', () => banner.remove());
  banner.textContent = userMsg;
  banner.appendChild(closeBtn);
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
