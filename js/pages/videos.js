/* pages/videos.js – Video listing page with YouTube embeds */

document.addEventListener('DOMContentLoaded', initVideosPage);

async function initVideosPage() {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;

  grid.appendChild(Render.skeletonCards(6));

  try {
    const videos = await API.getVideos(20);
    grid.innerHTML = '';

    if (!videos.length) {
      grid.appendChild(Render.emptyState('Henüz video içerik eklenmedi.'));
      return;
    }

    videos.forEach(v => grid.appendChild(Render.videoGridItem(v)));
  } catch {
    grid.innerHTML = '';
    grid.appendChild(Render.errorState());
  }
}
