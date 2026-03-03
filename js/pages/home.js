/* pages/home.js – Homepage initialization & section rendering */

document.addEventListener('DOMContentLoaded', initHome);

async function initHome() {
  await Promise.all([
    renderFeatured(),
    renderInterviews(),
    renderStories(),
    renderUpdates(),
    renderHomeVideos(),
  ]);
}

async function renderFeatured() {
  const container = document.getElementById('featured-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(1));

  try {
    const posts = await API.getFeaturedPosts(1);
    container.innerHTML = '';
    if (!posts.length) { container.appendChild(Render.emptyState('Öne çıkan içerik bulunamadı.')); return; }
    posts.forEach(p => container.appendChild(Render.postCard(p, { featured: true })));
  } catch {
    container.innerHTML = '';
    container.appendChild(Render.errorState());
  }
}

async function renderInterviews() {
  const container = document.getElementById('interview-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const posts = await API.getInterviews(3);
    container.innerHTML = '';
    if (!posts.length) { container.appendChild(Render.emptyState('Henüz röportaj yok.')); return; }
    posts.forEach(p => container.appendChild(Render.postCard(p)));
  } catch {
    container.innerHTML = '';
    container.appendChild(Render.errorState());
  }
}

async function renderStories() {
  const container = document.getElementById('story-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const posts = await API.getStories(3);
    container.innerHTML = '';
    if (!posts.length) { container.appendChild(Render.emptyState('Henüz hikâye yok.')); return; }
    posts.forEach(p => container.appendChild(Render.postCard(p)));
  } catch {
    container.innerHTML = '';
    container.appendChild(Render.errorState());
  }
}

async function renderUpdates() {
  const container = document.getElementById('update-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const posts = await API.getUpdates(3);
    container.innerHTML = '';
    if (!posts.length) { container.appendChild(Render.emptyState('Henüz güncelleme yok.')); return; }
    posts.forEach(p => container.appendChild(Render.postCard(p)));
  } catch {
    container.innerHTML = '';
    container.appendChild(Render.errorState());
  }
}

async function renderHomeVideos() {
  const container = document.getElementById('video-posts');
  if (!container) return;
  container.appendChild(Render.skeletonCards(3));

  try {
    const videos = await API.getVideos(3);
    container.innerHTML = '';
    if (!videos.length) { container.appendChild(Render.emptyState('Henüz video yok.')); return; }
    videos.forEach(v => container.appendChild(Render.videoCard(v)));
  } catch {
    container.innerHTML = '';
    container.appendChild(Render.errorState());
  }
}
