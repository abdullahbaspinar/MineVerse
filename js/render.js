/* render.js – UI rendering helpers, sanitization, portable text renderer */

const Render = (() => {

  /* ═══════════════ SANITIZATION ═══════════════ */

  const SAFE_TAGS = new Set([
    'p','h1','h2','h3','h4','h5','h6','a','img','strong','b','em','i','u','s',
    'ul','ol','li','blockquote','br','span','div','table','thead','tbody','tfoot',
    'tr','td','th','figure','figcaption','pre','code','hr','sup','sub','small',
    'dl','dt','dd','abbr','time','mark','del','ins','caption',
  ]);

  const SAFE_ATTRS = new Set([
    'href','src','alt','title','class','id','width','height','colspan','rowspan',
    'target','rel','loading','datetime','cite','start','type',
  ]);

  /**
   * Whitelist-based HTML sanitizer. Strips scripts, event handlers,
   * dangerous tags/attributes, and javascript: URIs from rich text.
   */
  function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('script,style,link,meta,object,embed,form,input,textarea,select,button,iframe,svg,math').forEach(el => el.remove());

    const walk = (root) => {
      [...root.querySelectorAll('*')].forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (!SAFE_TAGS.has(tag)) {
          el.replaceWith(...el.childNodes);
          return;
        }
        [...el.attributes].forEach(attr => {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on') || !SAFE_ATTRS.has(name)) {
            el.removeAttribute(attr.name);
            return;
          }
          if ((name === 'href' || name === 'src') && /^\s*(javascript|vbscript|data):/i.test(attr.value)) {
            el.removeAttribute(attr.name);
          }
        });
        if (tag === 'a') {
          el.setAttribute('rel', 'noopener noreferrer');
          if (!el.getAttribute('target')) el.setAttribute('target', '_blank');
        }
      });
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }

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
    safe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    safe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    return safe.outerHTML;
  }

  /** Escape HTML entities to prevent XSS when inserting user text */
  function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, c => map[c]);
  }

  /** Validate a URL string is safe (http/https only) */
  function safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      const parsed = new URL(url, window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? url : '';
    } catch { return ''; }
  }

  /* ═══════════════ PORTABLE TEXT RENDERER ═══════════════ */

  /**
   * Render post body. Handles two formats:
   * - string (HTML from Firestore / Quill editor)
   * - array  (Portable Text from Sanity / mock data)
   */
  function renderBody(body) {
    if (!body) return '<p class="text-muted">İçerik bulunamadı.</p>';
    if (typeof body === 'string') return sanitizeHtml(body);
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
    const el = document.createElement('article');
    el.className = `card fade-in${featured ? ' card-featured' : ''}`;

    el.innerHTML = `
      <div class="card-img-wrap">
        <img src="${escapeHtml(safeUrl(post.coverImageUrl))}" alt="${escapeHtml(post.title)}" loading="lazy" />
      </div>
      <div class="card-body">
        <h3><a href="post.html?slug=${encodeURIComponent(slug)}">${escapeHtml(post.title)}</a></h3>
        <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="card-meta">
          <time datetime="${escapeHtml(post.publishedAt)}">${formatDate(post.publishedAt)}</time>
        </div>
      </div>
    `;
    return el;
  }

  function videoCard(video) {
    const slug = video.slug?.current || video.slug || '';
    const el = document.createElement('article');
    el.className = 'card card-video fade-in';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <div class="card-img-wrap">
        <img src="${escapeHtml(safeUrl(video.coverImageUrl))}" alt="${escapeHtml(video.title)}" loading="lazy" />
      </div>
      <div class="card-body">
        <h3>${escapeHtml(video.title)}</h3>
        <div class="card-meta">
          <time datetime="${escapeHtml(video.publishedAt)}">${formatDate(video.publishedAt)}</time>
        </div>
      </div>
    `;
    el.addEventListener('click', () => {
      window.location.href = 'video.html?slug=' + encodeURIComponent(slug);
    });
    return el;
  }

  /** Render video card for grid listing – links to detail page */
  function videoGridItem(video) {
    const slug = video.slug?.current || video.slug || '';
    const el = document.createElement('article');
    el.className = 'video-grid-item fade-in';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <div class="video-embed">${sanitizeEmbed(video.youtubeEmbed)}</div>
      <h3>${escapeHtml(video.title)}</h3>
      <div class="card-meta">
        <time datetime="${escapeHtml(video.publishedAt)}">${formatDate(video.publishedAt)}</time>
      </div>
    `;
    el.addEventListener('click', () => {
      window.location.href = 'video.html?slug=' + encodeURIComponent(slug);
    });
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
    sanitizeHtml,
    escapeHtml,
    safeUrl,
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
