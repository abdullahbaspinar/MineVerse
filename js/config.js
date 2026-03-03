/* config.js – API configuration, constants, feature flags */

const CONFIG = Object.freeze({
  /* ── Sanity CMS ── */
  sanity: {
    projectId: 'YOUR_PROJECT_ID',
    dataset: 'production',
    apiVersion: '2024-01-01',
    useCdn: true,
  },

  /* Toggle: true = fetch from Sanity API, false = use local mock data */
  useMockData: true,

  /* Cache TTL in milliseconds (5 minutes) */
  cacheTTL: 5 * 60 * 1000,

  /* Pagination */
  postsPerPage: 9,

  /* Categories mapping (key → display label) */
  categories: {
    all: 'Tümü',
    interview: 'Röportaj',
    story: 'Hikâye',
    news: 'Haber',
    update: 'Güncel',
    video: 'Video',
  },

  /* Site meta */
  site: {
    name: 'MineVerse',
    tagline: 'Yeraltından Dünyaya',
    description: 'Madencilik dünyasını küresel bir bakış açısıyla ele alan bağımsız dijital platform.',
    url: 'https://mineverse.com',
  },

  /* Social links (placeholders) */
  social: {
    twitter: 'https://twitter.com/mineverse',
    linkedin: 'https://linkedin.com/company/mineverse',
    youtube: 'https://youtube.com/@mineverse',
    instagram: 'https://instagram.com/mineverse',
  },
});

/**
 * Build Sanity CDN API URL
 */
function sanityApiUrl(query, params = {}) {
  const { projectId, dataset, apiVersion, useCdn } = CONFIG.sanity;
  const host = useCdn ? 'apicdn.sanity.io' : 'api.sanity.io';
  const base = `https://${projectId}.${host}/v${apiVersion}/data/query/${dataset}`;
  const url = new URL(base);
  url.searchParams.set('query', query);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(`$${k}`, JSON.stringify(v)));
  return url.toString();
}

/**
 * Build Sanity image URL from asset reference
 */
function sanityImageUrl(ref, width = 800) {
  if (!ref) return '';
  if (ref.startsWith('http')) return ref;
  const { projectId, dataset } = CONFIG.sanity;
  const [, id, dimensions, format] = ref.split('-');
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}?w=${width}&auto=format`;
}
