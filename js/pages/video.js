/* pages/video.js – Single video detail page */

document.addEventListener('DOMContentLoaded', initVideoDetail);

async function initVideoDetail() {
  const slug = Router.getParam('slug');
  const playerEl = document.getElementById('video-player');
  const infoEl = document.getElementById('video-info');

  if (!slug) {
    if (infoEl) infoEl.innerHTML = Render.emptyState('Video belirtilmedi.').outerHTML;
    if (playerEl) playerEl.innerHTML = '';
    return;
  }

  try {
    const video = await API.getVideoBySlug(slug);

    if (!video) {
      if (playerEl) playerEl.innerHTML = '';
      if (infoEl) infoEl.innerHTML = Render.emptyState('Video bulunamadı.').outerHTML;
      return;
    }

    document.title = `${video.title} | MineVerse`;

    setMeta('description', video.description || video.title);
    setMeta('og:title', video.title);
    setMeta('og:description', video.description || video.title);
    if (video.coverImageUrl) setMeta('og:image', video.coverImageUrl);

    if (playerEl) {
      playerEl.classList.remove('skeleton');
      playerEl.innerHTML = `<div class="video-detail-embed">${Render.sanitizeEmbed(video.youtubeEmbed)}</div>`;
    }

    if (infoEl) {
      infoEl.innerHTML = `
        <h1>${Render.escapeHtml(video.title)}</h1>
        <div class="card-meta">
          <time datetime="${video.publishedAt}">${Render.formatDate(video.publishedAt)}</time>
        </div>
        ${video.description ? `<div class="video-detail-description">${Render.escapeHtml(video.description)}</div>` : ''}
      `;
    }

  } catch (err) {
    console.error('[VideoDetail]', err);
    if (playerEl) playerEl.innerHTML = '';
    if (infoEl) infoEl.innerHTML = Render.errorState('Video yüklenemedi: ' + (err.message || err)).outerHTML;
  }
}

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
  if (el) el.setAttribute('content', content);
}
