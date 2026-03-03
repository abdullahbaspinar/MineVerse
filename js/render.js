/* render.js – UI rendering helpers, sanitization, portable text renderer */

const Render = (() => {

  /* ═══════════════ SANITIZATION ═══════════════ */

  /**
   * Sanitize YouTube embed – only allow safe iframe with youtube domain.
   * Strips any script, event handlers, and non-iframe tags.
   */
  function sanitizeEmbed(html) {
    if (!html || typeof html !== 'string') return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const iframe = tmp.querySelector('iframe');
    if (!iframe) return '';

    const src = iframe.getAttribute('src') || '';
    const isYouTube = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//.test(src);
    if (!isYouTube) return '';

    const safe = document.createElement('iframe');
    safe.setAttribute('src', src);
    safe.setAttribute('title', iframe.getAttribute('title') || 'Video');
    safe.setAttribute('frameborder', '0');
    safe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    safe.setAttribute('allowfullscreen', '');
    safe.setAttribute('loading', 'lazy');
    return safe.outerHTML;
  }

  /** Escape HTML entities to prevent XSS when inserting user text */
  function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, c => map[c]);
  }

  /* ═══════════════ PORTABLE TEXT RENDERER ═══════════════ */

  /**
   * Render post body. Handles two formats:
   * - string (HTML from Firestore / Quill editor)
   * - array  (Portable Text from Sanity / mock data)
   */
  function renderBody(body) {
    if (!body) return '<p class="text-muted">İçerik bulunamadı.</p>';
    if (typeof body === 'string') return body;
    if (Array.isArray(body)) return renderPortableText(body);
    return '<p class="text-muted">İçerik bulunamadı.</p>';
  }

  function renderPortableText(blocks) {
    if (!blocks || !Array.isArray(blocks)) return '<p class="text-muted">İçerik bulunamadı.</p>';

    return blocks.map(block => {
      if (block._type !== 'block') return '';

      const children = (block.children || []).map(child => {
        let text = escapeHtml(child.text || '');
        if (child.marks && child.marks.includes('strong')) text = `<strong>${text}</strong>`;
        if (child.marks && child.marks.includes('em'))     text = `<em>${text}</em>`;
        if (child.marks) {
          const linkMark = child.marks.find(m => typeof m === 'object' && m._type === 'link');
          if (linkMark) text = `<a href="${escapeHtml(linkMark.href)}" target="_blank" rel="noopener">${text}</a>`;
        }
        return text;
      }).join('');

      switch (block.style) {
        case 'h2': return `<h2>${children}</h2>`;
        case 'h3': return `<h3>${children}</h3>`;
        case 'h4': return `<h4>${children}</h4>`;
        case 'blockquote': return `<blockquote>${children}</blockquote>`;
        default: return `<p>${children}</p>`;
      }
    }).join('\n');
  }

  /* ═══════════════ DATE FORMATTER ═══════════════ */

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return dateStr; }
  }

  /* ═══════════════ CARD RENDERERS ═══════════════ */

  function postCard(post, { featured = false } = {}) {
    const slug = post.slug?.current || post.slug || '';
    const cat = CONFIG.categories[post.category] || post.category || '';
    const el = document.createElement('article');
    el.className = `card fade-in${featured ? ' card-featured' : ''}`;

    el.innerHTML = `
      <div class="card-img-wrap">
        <img src="${escapeHtml(post.coverImageUrl)}" alt="${escapeHtml(post.title)}" loading="lazy" />
      </div>
      <div class="card-body">
        ${cat ? `<span class="badge">${escapeHtml(cat)}</span>` : ''}
        <h3><a href="post.html?slug=${encodeURIComponent(slug)}">${escapeHtml(post.title)}</a></h3>
        <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="card-meta">
          <time datetime="${post.publishedAt}">${formatDate(post.publishedAt)}</time>
        </div>
      </div>
    `;
    return el;
  }

  function videoCard(video) {
    const el = document.createElement('article');
    el.className = 'card card-video fade-in';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <div class="card-img-wrap">
        <img src="${escapeHtml(video.coverImageUrl)}" alt="${escapeHtml(video.title)}" loading="lazy" />
      </div>
      <div class="card-body">
        <h3>${escapeHtml(video.title)}</h3>
        <div class="card-meta">
          <time datetime="${video.publishedAt}">${formatDate(video.publishedAt)}</time>
        </div>
      </div>
    `;
    el.addEventListener('click', () => { window.location.href = 'videos.html'; });
    return el;
  }

  /** Render video with embed for videos page */
  function videoGridItem(video) {
    const el = document.createElement('article');
    el.className = 'video-grid-item fade-in';
    el.innerHTML = `
      <div class="video-embed">${sanitizeEmbed(video.youtubeEmbed)}</div>
      <h3>${escapeHtml(video.title)}</h3>
      <div class="card-meta">
        <time datetime="${video.publishedAt}">${formatDate(video.publishedAt)}</time>
      </div>
    `;
    return el;
  }

  /* ═══════════════ SKELETON LOADERS ═══════════════ */

  function skeletonCards(count = 3) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'skeleton skeleton-card';
      frag.appendChild(el);
    }
    return frag;
  }

  /* ═══════════════ EMPTY / ERROR STATES ═══════════════ */

  function emptyState(message = 'İçerik bulunamadı.') {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `<h3>😔</h3><p>${escapeHtml(message)}</p>`;
    return el;
  }

  function errorState(message = 'İçerik yüklenemedi. Lütfen daha sonra tekrar deneyin.') {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `<h3>⚠️ Hata</h3><p>${escapeHtml(message)}</p>`;
    return el;
  }

  /* ═══════════════ PAGINATION ═══════════════ */

  function pagination(totalItems, currentPage, perPage, onPageChange) {
    const totalPages = Math.ceil(totalItems / perPage);
    if (totalPages <= 1) return document.createDocumentFragment();

    const nav = document.createElement('nav');
    nav.className = 'pagination';
    nav.setAttribute('aria-label', 'Sayfa gezintisi');

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.setAttribute('aria-label', 'Önceki sayfa');
    prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
    nav.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = i === currentPage ? 'active' : '';
      btn.setAttribute('aria-label', `Sayfa ${i}`);
      if (i === currentPage) btn.setAttribute('aria-current', 'page');
      btn.addEventListener('click', () => onPageChange(i));
      nav.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.setAttribute('aria-label', 'Sonraki sayfa');
    nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
    nav.appendChild(nextBtn);

    return nav;
  }

  return {
    sanitizeEmbed,
    escapeHtml,
    renderBody,
    renderPortableText,
    formatDate,
    postCard,
    videoCard,
    videoGridItem,
    skeletonCards,
    emptyState,
    errorState,
    pagination,
  };
})();
