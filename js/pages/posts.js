/* pages/posts.js – Posts listing with filtering, search, and pagination */

document.addEventListener('DOMContentLoaded', initPostsPage);

let postsState = {
  all: [],
  filtered: [],
  category: 'all',
  query: '',
  page: 1,
};

async function initPostsPage() {
  API.clearCache();
  const grid = document.getElementById('posts-grid');
  const searchInput = document.getElementById('posts-search');
  const filterChips = document.getElementById('filter-chips');

  if (!grid) return;

  postsState.category = Router.getParam('category') || 'all';
  postsState.query = Router.getParam('q') || '';

  renderFilterChips(filterChips);
  if (searchInput && postsState.query) searchInput.value = postsState.query;

  searchInput?.addEventListener('input', debounce((e) => {
    postsState.query = e.target.value;
    postsState.page = 1;
    Router.setParams({ q: postsState.query || null });
    filterAndRender();
  }, 300));

  grid.appendChild(Render.skeletonCards(6));
  await loadAllPosts();
}

async function loadAllPosts() {
  try {
    postsState.all = await API.getPostsByCategory('all', 100);
    filterAndRender();
    const err = API.getLastError();
    if (err && !postsState.all.length) {
      const grid = document.getElementById('posts-grid');
      if (grid) { grid.innerHTML = ''; grid.appendChild(Render.errorState('Firestore hatası: ' + (err.message || err))); }
    }
  } catch (e) {
    const grid = document.getElementById('posts-grid');
    if (grid) { grid.innerHTML = ''; grid.appendChild(Render.errorState('Hata: ' + (e.message || e))); }
  }
}

function renderFilterChips(container) {
  if (!container) return;
  container.innerHTML = '';
  Object.entries(CONFIG.categories).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.className = `filter-chip${key === postsState.category ? ' active' : ''}`;
    btn.textContent = label;
    btn.setAttribute('aria-pressed', key === postsState.category);
    btn.addEventListener('click', () => {
      postsState.category = key;
      postsState.page = 1;
      Router.setParams({ category: key === 'all' ? null : key });
      container.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      filterAndRender();
    });
    container.appendChild(btn);
  });
}

function filterAndRender() {
  let results = postsState.all;

  if (postsState.category !== 'all') {
    results = results.filter(p => p.category === postsState.category);
  }

  if (postsState.query.trim()) {
    const q = postsState.query.toLowerCase();
    results = results.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  postsState.filtered = results;
  renderPostsGrid();
}

function renderPostsGrid() {
  const grid = document.getElementById('posts-grid');
  const paginationWrap = document.getElementById('posts-pagination');
  if (!grid) return;

  grid.innerHTML = '';

  if (!postsState.filtered.length) {
    grid.appendChild(Render.emptyState('Bu kriterlere uygun içerik bulunamadı.'));
    if (paginationWrap) paginationWrap.innerHTML = '';
    return;
  }

  const perPage = CONFIG.postsPerPage;
  const start = (postsState.page - 1) * perPage;
  const paged = postsState.filtered.slice(start, start + perPage);

  paged.forEach(p => grid.appendChild(Render.postCard(p)));

  if (paginationWrap) {
    paginationWrap.innerHTML = '';
    paginationWrap.appendChild(
      Render.pagination(postsState.filtered.length, postsState.page, perPage, (page) => {
        postsState.page = page;
        Router.scrollToTop();
        renderPostsGrid();
      })
    );
  }
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
