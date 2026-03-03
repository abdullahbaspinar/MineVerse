/* api.js – Firestore data fetching with caching */

const API = (() => {
  const CACHE_PREFIX = 'mv_cache_';

  /* ── Cache helpers ── */
  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CONFIG.cacheTTL) { localStorage.removeItem(CACHE_PREFIX + key); return null; }
      return data;
    } catch { return null; }
  }

  function cacheSet(key, data) {
    try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() })); }
    catch { /* storage full */ }
  }

  /* ── Firestore doc → plain object ── */
  function normalizeDoc(doc) {
    const d = doc.data();
    const obj = { _id: doc.id, ...d };
    if (d.publishedAt && d.publishedAt.toDate) obj.publishedAt = d.publishedAt.toDate().toISOString();
    if (d.createdAt && d.createdAt.toDate) obj.createdAt = d.createdAt.toDate().toISOString();
    if (typeof d.slug === 'string') obj.slug = d.slug;
    return obj;
  }

  /* ═══════════════ FIRESTORE QUERIES ═══════════════ */

  async function queryPosts(opts = {}) {
    const { category, featured, slug, limit: lim } = opts;
    const cacheKey = `fs_${category||'all'}_${featured||''}_${slug||''}_${lim||50}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      let ref = db.collection('posts');

      if (slug) {
        const snap = await ref.where('slug', '==', slug).limit(1).get();
        if (snap.empty) return null;
        const result = normalizeDoc(snap.docs[0]);
        cacheSet(cacheKey, result);
        return result;
      }

      if (featured) ref = ref.where('featured', '==', true);
      if (category && category !== 'all') ref = ref.where('category', '==', category);
      ref = ref.orderBy('publishedAt', 'desc');
      if (lim) ref = ref.limit(lim);

      const snap = await ref.get();
      const data = snap.docs.map(normalizeDoc);
      cacheSet(cacheKey, data);
      return data;
    } catch (err) {
      console.error('[API]', err);
      return [];
    }
  }

  async function queryVideos(lim = 20) {
    const cacheKey = `fs_videos_${lim}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const snap = await db.collection('videos').orderBy('publishedAt', 'desc').limit(lim).get();
      const data = snap.docs.map(normalizeDoc);
      cacheSet(cacheKey, data);
      return data;
    } catch (err) {
      console.error('[API]', err);
      return [];
    }
  }

  /* ═══════════════ PUBLIC API ═══════════════ */

  async function getFeaturedPosts(limit = 3) {
    return (await queryPosts({ featured: true, limit })) || [];
  }

  async function getRecentPosts(limit = 6) {
    return (await queryPosts({ limit })) || [];
  }

  async function getPostsByCategory(category = 'all', limit = 50) {
    return (await queryPosts({ category, limit })) || [];
  }

  async function getPostBySlug(slug) {
    return await queryPosts({ slug });
  }

  async function getVideos(limit = 20) {
    return (await queryVideos(limit)) || [];
  }

  async function searchPosts(query = '', category = 'all') {
    const all = await getPostsByCategory(category);
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.excerpt && p.excerpt.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  async function getInterviews(limit = 4) { return getPostsByCategory('interview', limit); }
  async function getStories(limit = 4)    { return getPostsByCategory('story', limit); }
  async function getUpdates(limit = 4)    { return getPostsByCategory('update', limit); }

  return {
    getFeaturedPosts, getRecentPosts, getPostsByCategory,
    getPostBySlug, getVideos, searchPosts,
    getInterviews, getStories, getUpdates,
  };
})();
