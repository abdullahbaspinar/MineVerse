/* api.js – Sanity fetch functions with caching & error handling */

const API = (() => {
  const CACHE_PREFIX = 'mv_cache_';

  /* ── Cache helpers ── */
  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CONFIG.cacheTTL) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return data;
    } catch { return null; }
  }

  function cacheSet(key, data) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* storage full – silent */ }
  }

  /* ── Fetch wrapper ── */
  async function sanityFetch(query, params = {}, cacheKey = '') {
    if (CONFIG.useMockData) return null;

    if (cacheKey) {
      const cached = cacheGet(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = sanityApiUrl(query, params);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json.result;
      if (cacheKey) cacheSet(cacheKey, data);
      return data;
    } catch (err) {
      console.error('[API]', err);
      return null;
    }
  }

  /* ═══════════════ PUBLIC QUERIES ═══════════════ */

  /** Fetch featured posts */
  async function getFeaturedPosts(limit = 3) {
    const groq = `*[_type == "post" && featured == true] | order(publishedAt desc)[0...${limit}]{
      _id, title, slug, excerpt, category, tags, coverImageUrl, publishedAt, featured
    }`;
    const data = await sanityFetch(groq, {}, `featured_${limit}`);
    if (data) return data;
    return MOCK_POSTS.filter(p => p.featured).slice(0, limit);
  }

  /** Fetch recent posts */
  async function getRecentPosts(limit = 6) {
    const groq = `*[_type == "post"] | order(publishedAt desc)[0...${limit}]{
      _id, title, slug, excerpt, category, tags, coverImageUrl, publishedAt, featured
    }`;
    const data = await sanityFetch(groq, {}, `recent_${limit}`);
    if (data) return data;
    return [...MOCK_POSTS].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, limit);
  }

  /** Fetch posts by category */
  async function getPostsByCategory(category = 'all', limit = 50) {
    const filter = category === 'all'
      ? '*[_type == "post"]'
      : `*[_type == "post" && category == "${category}"]`;
    const groq = `${filter} | order(publishedAt desc)[0...${limit}]{
      _id, title, slug, excerpt, category, tags, coverImageUrl, publishedAt, featured
    }`;
    const data = await sanityFetch(groq, {}, `cat_${category}_${limit}`);
    if (data) return data;
    const filtered = category === 'all' ? MOCK_POSTS : MOCK_POSTS.filter(p => p.category === category);
    return [...filtered].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, limit);
  }

  /** Fetch single post by slug */
  async function getPostBySlug(slug) {
    const groq = `*[_type == "post" && slug.current == "${slug}"][0]{
      _id, title, slug, excerpt, category, tags, coverImageUrl, body, publishedAt, featured
    }`;
    const data = await sanityFetch(groq, {}, `post_${slug}`);
    if (data) return data;
    return MOCK_POSTS.find(p => p.slug.current === slug) || null;
  }

  /** Fetch videos */
  async function getVideos(limit = 20) {
    const groq = `*[_type == "video"] | order(publishedAt desc)[0...${limit}]{
      _id, title, slug, coverImageUrl, youtubeEmbed, publishedAt, featured
    }`;
    const data = await sanityFetch(groq, {}, `videos_${limit}`);
    if (data) return data;
    return [...MOCK_VIDEOS].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, limit);
  }

  /** Fetch posts filtered by category + search query (client-side for mock) */
  async function searchPosts(query = '', category = 'all') {
    const all = await getPostsByCategory(category);
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  /** Fetch posts by specific category shorthand for homepage sections */
  async function getInterviews(limit = 4) { return getPostsByCategory('interview', limit); }
  async function getStories(limit = 4)    { return getPostsByCategory('story', limit); }
  async function getUpdates(limit = 4)    { return getPostsByCategory('update', limit); }

  return {
    getFeaturedPosts,
    getRecentPosts,
    getPostsByCategory,
    getPostBySlug,
    getVideos,
    searchPosts,
    getInterviews,
    getStories,
    getUpdates,
  };
})();
