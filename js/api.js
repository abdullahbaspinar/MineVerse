/* api.js – Firestore data fetching with caching (no composite index needed) */

const API = (() => {
  const CACHE_PREFIX = 'mv_cache_';
  let _lastError = null;

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
    catch { /* quota exceeded */ }
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

  /* ═══════════════ BASE QUERIES ═══════════════ */

  async function fetchAllPosts() {
    const cacheKey = 'fs_all_posts';
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const snap = await db.collection('posts').orderBy('publishedAt', 'desc').get();
      const data = snap.docs.map(normalizeDoc);
      cacheSet(cacheKey, data);
      _lastError = null;
      return data;
    } catch (err) {
      console.error('[API] fetchAllPosts:', err);
      _lastError = err;
      return [];
    }
  }

  async function fetchPostBySlug(slug) {
    const cacheKey = 'fs_post_' + slug;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const snap = await db.collection('posts').where('slug', '==', slug).limit(1).get();
      if (snap.empty) return null;
      const result = normalizeDoc(snap.docs[0]);
      cacheSet(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[API] fetchPostBySlug:', err);
      _lastError = err;
      return null;
    }
  }

  async function fetchAllVideos() {
    const cacheKey = 'fs_all_videos';
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const snap = await db.collection('videos').orderBy('publishedAt', 'desc').get();
      const data = snap.docs.map(normalizeDoc);
      cacheSet(cacheKey, data);
      _lastError = null;
      return data;
    } catch (err) {
      console.error('[API] fetchAllVideos:', err);
      _lastError = err;
      return [];
    }
  }

  /* ═══════════════ PUBLIC API ═══════════════ */

  async function getFeaturedPosts(limit = 3) {
    const all = await fetchAllPosts();
    return all.filter(p => p.featured).slice(0, limit);
  }

  async function getRecentPosts(limit = 6) {
    const all = await fetchAllPosts();
    return all.slice(0, limit);
  }

  async function getPostsByCategory(category = 'all', limit = 50) {
    const all = await fetchAllPosts();
    if (category === 'all') return all.slice(0, limit);
    return all.filter(p => p.category === category).slice(0, limit);
  }

  async function getPostBySlug(slug) {
    return await fetchPostBySlug(slug);
  }

  async function getVideos(limit = 20) {
    const all = await fetchAllVideos();
    return all.slice(0, limit);
  }

  async function getVideoBySlug(slug) {
    const cacheKey = 'fs_video_' + slug;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const snap = await db.collection('videos').where('slug', '==', slug).limit(1).get();
      if (snap.empty) return null;
      const result = normalizeDoc(snap.docs[0]);
      cacheSet(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[API] getVideoBySlug:', err);
      _lastError = err;
      return null;
    }
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

  function clearCache() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key);
    });
  }

  /** Returns the last Firestore error (if any) for debugging */
  function getLastError() { return _lastError; }

  return {
    getFeaturedPosts, getRecentPosts, getPostsByCategory,
    getPostBySlug, getVideos, getVideoBySlug, searchPosts,
    getInterviews, getStories, getUpdates, clearCache, getLastError,
  };
})();
