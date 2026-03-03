/* pages/home.js – Homepage initialization & section rendering */

document.addEventListener('DOMContentLoaded', initHome);

async function initHome() {
  /* Clear stale cache on each homepage visit for fresh content */
  API.clearCache();

  await Promise.all([
    renderFeatured(),
    renderRecent(),
    renderInterviews(),
    renderStories(),
    renderUpdates(),
    renderHomeVideos(),
  ]);
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
      container.appendChild(Render.emptyState('Henüz içerik eklenmemiş. Admin panelden ilk içeriğinizi ekleyin.'));
      return;
    }
    posts.forEach(p => container.appendChild(Render.postCard(p)));
  } catch {
    container.innerHTML = '';
    container.appendChild(Render.errorState());
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
