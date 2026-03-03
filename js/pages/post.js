/* pages/post.js – Single post detail page */

document.addEventListener('DOMContentLoaded', initPostDetail);

async function initPostDetail() {
  const slug = Router.getParam('slug');
  const heroEl = document.getElementById('post-hero');
  const articleEl = document.getElementById('post-article');
  const tagsEl = document.getElementById('post-tags');

  if (!slug) {
    if (articleEl) articleEl.appendChild(Render.emptyState('İçerik belirtilmedi.'));
    return;
  }

  try {
    const post = await API.getPostBySlug(slug);

    if (!post) {
      if (articleEl) articleEl.appendChild(Render.emptyState('İçerik bulunamadı.'));
      return;
    }

    document.title = `${post.title} | MineVerse`;

    /* Update meta tags */
    setMeta('description', post.excerpt);
    setMeta('og:title', post.title);
    setMeta('og:description', post.excerpt);
    if (post.coverImageUrl) setMeta('og:image', post.coverImageUrl);

    /* Hero */
    if (heroEl) {
      const heroBg = heroEl.querySelector('.hero-bg');
      if (heroBg && post.coverImageUrl) {
        heroBg.style.backgroundImage = `url(${post.coverImageUrl})`;
        heroBg.style.backgroundSize = 'cover';
        heroBg.style.backgroundPosition = 'center';
        heroBg.classList.add('has-image');
      }

      const cat = CONFIG.categories[post.category] || post.category || '';
      heroEl.querySelector('.post-meta').innerHTML = `
        ${cat ? `<span class="badge">${Render.escapeHtml(cat)}</span>` : ''}
        <time datetime="${post.publishedAt}">${Render.formatDate(post.publishedAt)}</time>
      `;
      heroEl.querySelector('h1').textContent = post.title;
    }

    /* Article body */
    if (articleEl) {
      articleEl.innerHTML = Render.renderBody(post.body);
    }

    /* Tags */
    if (tagsEl && post.tags && post.tags.length) {
      tagsEl.innerHTML = post.tags.map(t =>
        `<a href="posts.html?q=${encodeURIComponent(t)}" class="badge badge-outline">#${Render.escapeHtml(t)}</a>`
      ).join('');
    }

  } catch (err) {
    console.error('[PostDetail]', err);
    if (articleEl) { articleEl.innerHTML = ''; articleEl.appendChild(Render.errorState()); }
  }
}

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
  if (el) { el.setAttribute('content', content); }
}
