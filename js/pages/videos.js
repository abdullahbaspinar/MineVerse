/* pages/videos.js – Video listing page with YouTube embeds */

document.addEventListener('DOMContentLoaded', initVideosPage);

async function initVideosPage() {
  API.clearCache();
  const grid = document.getElementById('videos-grid');
  if (!grid) return;

  grid.appendChild(Render.skeletonCards(6, 'video'));

  try {
    const videos = await API.getVideos(20);
    grid.innerHTML = '';

    if (!videos.length) {
      const err = API.getLastError();
      grid.appendChild(Render.emptyState(err
        ? 'Firestore hatası: ' + (err.message || err)
        : 'Henüz video içerik eklenmedi.'));
      return;
    }

    videos.forEach(v => grid.appendChild(Render.videoGridItem(v)));
  } catch (e) {
    grid.innerHTML = '';
    grid.appendChild(Render.errorState('Hata: ' + (e.message || e)));
  }
}
