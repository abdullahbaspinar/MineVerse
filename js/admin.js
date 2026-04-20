/* admin.js – MineVerse Admin Panel Logic */

const Admin = (() => {

  /* ═══════════════ STATE ═══════════════ */
  let currentSection = 'dashboard';
  let editingPostId = null;
  let editingVideoId = null;
  let quillEditor = null;
  let quillExcerpt = null;
  let quillVideoDescription = null;
  let auth = null;

  const QUILL_TOOLBAR_COMPACT = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'link'],
    ['clean'],
  ];

  const QUILL_TOOLBAR_FULL = [
    [{ header: [2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    ['link', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['image'],
    ['clean'],
  ];

  function attachQuillImageHandler(editor) {
    if (!editor || !editor.getModule) return;
    editor.getModule('toolbar').addHandler('image', () => {
      const url = prompt('Görsel URL\'si girin:');
      if (url) {
        const range = editor.getSelection(true);
        editor.insertEmbed(range.index, 'image', url);
      }
    });
  }

  function mountExcerptFallback(container, content) {
    container.innerHTML =
      '<p class="form-hint admin-quill-fallback-banner">Özet editörü yüklenemedi; metni aşağıya yazın.</p>' +
      '<textarea id="post-excerpt-fallback" class="form-textarea admin-quill-fallback" rows="8"></textarea>';
    const ta = document.getElementById('post-excerpt-fallback');
    if (ta && content) ta.value = content;
  }

  function mountBodyFallback(container, content) {
    container.innerHTML =
      '<p class="form-hint admin-quill-fallback-banner">İçerik editörü yüklenemedi; makale metnini aşağıya yazın (gerekirse HTML).</p>' +
      '<textarea id="post-body-fallback" class="form-textarea admin-quill-fallback" rows="20"></textarea>';
    const ta = document.getElementById('post-body-fallback');
    if (ta && content) ta.value = content;
  }

  function mountVideoDescriptionFallback(container, content) {
    container.innerHTML =
      '<p class="form-hint admin-quill-fallback-banner">Video açıklama editörü yüklenemedi; metni aşağıya yazın (gerekirse HTML).</p>' +
      '<textarea id="video-description-fallback" class="form-textarea admin-quill-fallback" rows="16"></textarea>';
    const ta = document.getElementById('video-description-fallback');
    if (ta && content) ta.value = content;
  }

  function isQuillContentEmpty(html) {
    if (!html || !String(html).trim()) return true;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = (tmp.textContent || '').replace(/\u00a0/g, ' ').trim();
    if (text.length > 0) return false;
    return !tmp.querySelector('img');
  }

  /**
   * Quill, overflow ile kaydırılan bir üst öğe içindeyken (admin .admin-content)
   * scrollingContainer/bounds verilmezse başlık açılır menüsü ve düzenleme alanı bozulabiliyor.
   */
  function quillScrollOptions() {
    const el = document.querySelector('.admin-content');
    if (!el) return {};
    return { bounds: el, scrollingContainer: el };
  }

  /** Firestore: var db + yedek window.MineVerseDb (firebase-config) */
  function getDb() {
    try {
      if (typeof db !== 'undefined' && db !== null) return db;
    } catch (e) { /* db tanımsız */ }
    if (typeof window !== 'undefined' && window.MineVerseDb) return window.MineVerseDb;
    if (typeof window !== 'undefined' && typeof window.db !== 'undefined' && window.db) return window.db;
    return null;
  }

  function isDbReady() {
    return getDb() !== null;
  }

  /** createdAt karşılaştırması (orderBy / index olmadan istemci sıralaması) */
  function docCreatedSec(docSnap) {
    const d = docSnap.data();
    const c = d && d.createdAt;
    if (!c) return 0;
    if (typeof c.seconds === 'number') return c.seconds;
    if (typeof c._seconds === 'number') return c._seconds;
    if (c && typeof c.toMillis === 'function') return Math.floor(c.toMillis() / 1000);
    if (c && typeof c.toDate === 'function') return Math.floor(c.toDate().getTime() / 1000);
    return 0;
  }

  function sortDocSnapshotsByCreatedDesc(docs) {
    return docs.slice().sort((a, b) => docCreatedSec(b) - docCreatedSec(a));
  }

  function firestoreErrToUser(err) {
    const code = err && err.code;
    const msg = (err && err.message) || String(err);
    if (code === 'permission-denied') {
      return 'Firestore izni yok. Firebase Console → Firestore Rules içinde giriş yapmış kullanıcıya okuma/yazma izni verin.';
    }
    if (code === 'unavailable' || (msg && msg.indexOf('network') !== -1)) {
      return 'Ağ hatası veya Firestore geçici olarak kullanılamıyor. İnternet bağlantısını deneyin.';
    }
    return msg;
  }

  /* ═══════════════ INIT ═══════════════ */
  function init() {
    setupLoginForm();
    setupForgotPassword();
    setupNavigation();
    setupMobileMenu();
    setupEventDelegation();

    const loginErrEl = document.getElementById('login-error');
    if (typeof firebase === 'undefined') {
      if (loginErrEl) {
        loginErrEl.textContent = 'Firebase yüklenemedi. Tarayıcı konsolunda (F12) ağ/CSP hatası var mı bakın; sayfayı yenileyin.';
        loginErrEl.style.display = 'block';
      }
      return;
    }
    if (!isDbReady()) {
      if (loginErrEl) {
        loginErrEl.textContent = 'Veritabanı başlatılamadı. Sayfayı yenileyin veya firebase-config.js / ağ bağlantısını kontrol edin.';
        loginErrEl.style.display = 'block';
      }
      return;
    }

    auth = firebase.auth();
    auth.onAuthStateChanged(user => {
      if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-app').classList.remove('hidden');
        document.getElementById('admin-user-email').textContent = user.email;
        switchSection('dashboard');
      } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('admin-app').classList.add('hidden');
      }
    });
  }

  /* ═══════════════ AUTH ═══════════════ */
  function setupLoginForm() {
    const form = document.getElementById('login-form');
    const errEl = document.getElementById('login-error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
      if (!auth) {
        errEl.textContent = 'Oturum servisi hazır değil. Sayfayı yenileyin.';
        errEl.style.display = 'block';
        return;
      }
      const email = form.email.value.trim();
      const password = form.password.value;
      const btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Giriş yapılıyor...';
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        let msg = authErrorMessage(err.code);
        if (err.code === 'auth/unauthorized-domain') {
          msg = 'Bu domain Firebase\'de yetkilendirilmemiş. ' +
            'Firebase Console → Authentication → Settings → Authorized domains ' +
            'kısmına "' + window.location.hostname + '" ekleyin.';
        }
        errEl.textContent = msg;
        errEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Giriş Yap';
    });
  }

  function setupForgotPassword() {
    const btn = document.getElementById('forgot-password-btn');
    const errEl = document.getElementById('login-error');
    const successEl = document.getElementById('login-success');

    btn.addEventListener('click', async () => {
      const emailInput = document.getElementById('login-email');
      const email = emailInput.value.trim();
      errEl.style.display = 'none';
      successEl.style.display = 'none';

      if (!email) {
        errEl.textContent = 'Lütfen önce e-posta adresinizi girin.';
        errEl.style.display = 'block';
        emailInput.focus();
        return;
      }
      if (!auth) {
        errEl.textContent = 'Oturum servisi hazır değil. Sayfayı yenileyin.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Gönderiliyor...';

      try {
        await auth.sendPasswordResetEmail(email);
        successEl.textContent = 'Şifre sıfırlama bağlantısı ' + email + ' adresine gönderildi. Lütfen e-postanızı kontrol edin.';
        successEl.style.display = 'block';
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          errEl.textContent = 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.';
        } else if (err.code === 'auth/invalid-email') {
          errEl.textContent = 'Geçersiz e-posta adresi.';
        } else if (err.code === 'auth/too-many-requests') {
          errEl.textContent = 'Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin.';
        } else {
          errEl.textContent = 'Hata: ' + (err.message || err.code);
        }
        errEl.style.display = 'block';
      }

      btn.disabled = false;
      btn.textContent = 'Şifremi Unuttum';
    });
  }

  function logout() {
    if (auth) auth.signOut();
  }

  function authErrorMessage(code) {
    const map = {
      'auth/wrong-password': 'Hatalı şifre.',
      'auth/user-not-found': 'Kullanıcı bulunamadı.',
      'auth/invalid-email': 'Geçersiz e-posta.',
      'auth/too-many-requests': 'Çok fazla deneme. Lütfen bekleyin.',
      'auth/invalid-credential': 'E-posta veya şifre hatalı.',
      'auth/unauthorized-domain': 'Bu domain yetkilendirilmemiş. Firebase Console → Authentication → Settings → Authorized domains kısmına bu domaini ekleyin.',
    };
    return map[code] || 'Giriş başarısız (' + code + '). Tekrar deneyin.';
  }

  /* ═══════════════ NAVIGATION ═══════════════ */
  function setupNavigation() {
    document.querySelectorAll('[data-section]').forEach(btn => {
      btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('site-link').addEventListener('click', () => window.open('index.html', '_blank'));
  }

  function switchSection(name) {
    currentSection = name;
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('section-' + name);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('[data-section]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === name);
    });

    document.getElementById('admin-page-title').textContent = sectionTitle(name);
    document.getElementById('admin-sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');

    if (name === 'dashboard') loadDashboard();
    else if (name === 'posts') { hidePostForm(); loadPosts(); }
    else if (name === 'videos') { hideVideoForm(); loadVideos(); }
  }

  function sectionTitle(name) {
    const map = { dashboard: 'Dashboard', posts: 'İçerik Yönetimi', videos: 'Video Yönetimi' };
    return map[name] || name;
  }

  function setupMobileMenu() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
      sidebar?.classList.add('open');
      overlay?.classList.add('open');
    }
    function closeSidebar() {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('open');
    }

    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
      if (sidebar?.classList.contains('open')) closeSidebar();
      else openSidebar();
    });
    overlay?.addEventListener('click', closeSidebar);
  }

  function setupEventDelegation() {
    const content = document.querySelector('.admin-content');
    if (!content) return;
    content.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      const { action, id, title } = btn.dataset;
      const readVal = btn.dataset.read;
      switch (action) {
        case 'edit-post': editPost(id); break;
        case 'delete-post': deletePost(id, title); break;
        case 'edit-video': editVideo(id); break;
        case 'delete-video': deleteVideo(id, title); break;
        case 'new-post': editingPostId = null; showPostForm(); break;
        case 'new-video': editingVideoId = null; showVideoForm(); break;
      }
    });

    const formArea = document.querySelector('.admin-content');
    formArea.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.id === 'post-form') { e.preventDefault(); savePost(); }
      else if (form.id === 'video-form') { e.preventDefault(); saveVideo(); }
    });

    formArea.addEventListener('click', (e) => {
      if (e.target.matches('[data-cancel="post"]')) { hidePostForm(); }
      else if (e.target.matches('[data-cancel="video"]')) { hideVideoForm(); }
    });
  }

  /* ═══════════════ UTILITIES ═══════════════ */
  function slugify(text) {
    const trMap = { 'ş':'s','ç':'c','ğ':'g','ü':'u','ö':'o','ı':'i','Ş':'s','Ç':'c','Ğ':'g','Ü':'u','Ö':'o','İ':'i' };
    return text.replace(/[şçğüöıŞÇĞÜÖİ]/g, c => trMap[c] || c)
      .toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtDateInput(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toISOString().split('T')[0];
  }

  function toast(msg, type = 'info') {
    const container = document.getElementById('admin-toast');
    const el = document.createElement('div');
    el.className = `toast-item toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function esc(str) {
    if (!str) return '';
    const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  }

  /* ═══════════════ CONFIRM MODAL ═══════════════ */
  function confirmAction(title, message) {
    return new Promise(resolve => {
      const overlay = document.getElementById('confirm-modal');
      overlay.querySelector('h3').textContent = title;
      overlay.querySelector('p').textContent = message;
      overlay.classList.add('open');
      const yesBtn = document.getElementById('confirm-yes');
      const noBtn = document.getElementById('confirm-no');
      function cleanup(val) { overlay.classList.remove('open'); yesBtn.removeEventListener('click', onYes); noBtn.removeEventListener('click', onNo); resolve(val); }
      function onYes() { cleanup(true); }
      function onNo() { cleanup(false); }
      yesBtn.addEventListener('click', onYes);
      noBtn.addEventListener('click', onNo);
    });
  }

  /* ═══════════════ IMAGE PREVIEW ═══════════════ */
  function updateImagePreview(id, url) {
    const container = document.getElementById(id);
    if (!container) return;
    if (url) {
      container.innerHTML = `<img src="${esc(url)}" alt="Önizleme" />`;
      container.style.display = 'block';
    } else {
      container.innerHTML = '';
      container.style.display = 'none';
    }
  }

  function setupCoverStorageUpload() {
    [
      { prefix: 'post', folder: 'posts' },
      { prefix: 'video', folder: 'videos' },
    ].forEach(({ prefix, folder }) => {
      const fileInput = document.getElementById(`${prefix}-cover-file`);
      const statusEl = document.getElementById(`${prefix}-cover-upload-status`);
      const urlInput = document.getElementById(`${prefix}-coverImageUrl`);
      if (!fileInput || !urlInput) return;
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (statusEl) statusEl.textContent = 'Yükleniyor...';
        const result = await FirebaseHelper.uploadCoverImage(folder, file);
        if (result.success) {
          urlInput.value = result.url;
          updateImagePreview(`${prefix}-cover-preview`, result.url);
          if (statusEl) statusEl.textContent = 'Yüklendi ✓';
          toast('Görsel Storage’a yüklendi.', 'success');
        } else {
          if (statusEl) statusEl.textContent = '';
          toast(result.error, 'error');
        }
        fileInput.value = '';
      });
    });
  }

  function setupImagePreviews() {
    document.getElementById('post-coverImageUrl')?.addEventListener('input', (e) => {
      updateImagePreview('post-cover-preview', e.target.value);
    });
    document.getElementById('video-coverImageUrl')?.addEventListener('input', (e) => {
      updateImagePreview('video-cover-preview', e.target.value);
    });
    setupCoverStorageUpload();
  }

  /* ═══════════════ DASHBOARD ═══════════════ */
  async function loadDashboard() {
    if (!isDbReady()) {
      const sp = document.getElementById('stat-posts');
      const sv = document.getElementById('stat-videos');
      const recentEl = document.getElementById('dashboard-recent');
      if (sp) sp.textContent = '—';
      if (sv) sv.textContent = '—';
      if (recentEl) {
        recentEl.innerHTML = '<p class="text-muted text-sm">Veritabanı kullanılamıyor. Sayfayı yenileyin.</p>';
      }
      return;
    }
    const recentEl = document.getElementById('dashboard-recent');
    try {
      const database = getDb();
      const [posts, videos] = await Promise.all([
        database.collection('posts').get(),
        database.collection('videos').get(),
      ]);

      document.getElementById('stat-posts').textContent = posts.size;
      document.getElementById('stat-videos').textContent = videos.size;

      const recentPosts = sortDocSnapshotsByCreatedDesc(posts.docs)
        .slice(0, 5)
        .map(d => ({ id: d.id, ...d.data() }));

      if (recentPosts.length === 0) {
        recentEl.innerHTML = '<p class="text-muted text-sm">Henüz içerik eklenmemiş. "İçerikler" bölümünden ilk içeriğinizi ekleyin.</p>';
      } else {
        recentEl.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
          <thead><tr><th>Başlık</th><th>Kategori</th><th class="mobile-hide">Tarih</th><th class="mobile-hide">Son Güncelleyen</th></tr></thead>
          <tbody>${recentPosts.map(p => `<tr>
            <td class="row-title">${esc(p.title)}</td>
            <td><span class="badge">${esc(p.category || '')}</span></td>
            <td class="mobile-hide">${fmtDate(p.publishedAt)}</td>
            <td class="mobile-hide row-updated-by">${p.lastUpdatedBy ? esc(p.lastUpdatedBy) : '<span class="text-muted">—</span>'}</td>
          </tr>`).join('')}</tbody></table></div>`;
      }
    } catch (err) {
      console.error('[Admin] loadDashboard', err);
      document.getElementById('stat-posts').textContent = '—';
      document.getElementById('stat-videos').textContent = '—';
      if (recentEl) {
        recentEl.innerHTML = `<p class="text-muted text-sm" style="color:var(--color-error)">${esc(firestoreErrToUser(err))}</p>`;
      }
    }
  }

  /* ═══════════════ POSTS CRUD ═══════════════ */
  async function loadPosts() {
    const container = document.getElementById('posts-table-body');
    container.innerHTML = '<tr><td colspan="7" class="table-empty">Yükleniyor...</td></tr>';
    if (!isDbReady()) {
      container.innerHTML = '<tr><td colspan="7" class="table-empty" style="color:var(--color-error)">Veritabanı kullanılamıyor.</td></tr>';
      return;
    }
    try {
      const snap = await getDb().collection('posts').get();
      const docs = sortDocSnapshotsByCreatedDesc(snap.docs);
      if (docs.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="table-empty">Henüz içerik yok. "Yeni İçerik" butonuna tıklayarak ekleyin.</td></tr>';
        return;
      }
      container.innerHTML = docs.map(doc => {
        const p = doc.data();
        return `<tr>
          <td class="mobile-hide">${p.coverImageUrl ? `<img src="${esc(p.coverImageUrl)}" class="row-thumb" alt="" />` : '<span class="row-thumb skeleton"></span>'}</td>
          <td class="row-title">${esc(p.title)}</td>
          <td><span class="badge">${esc(p.category || '')}</span></td>
          <td class="mobile-hide">${fmtDate(p.publishedAt)}</td>
          <td class="mobile-hide">${p.featured ? '<span style="color:var(--color-accent)">★</span>' : '—'}</td>
          <td class="mobile-hide row-updated-by">${p.lastUpdatedBy ? esc(p.lastUpdatedBy) : '<span class="text-muted">—</span>'}</td>
          <td class="row-actions">
            <button class="btn btn-xs btn-info" data-action="edit-post" data-id="${esc(doc.id)}">Düzenle</button>
            <button class="btn btn-xs btn-danger" data-action="delete-post" data-id="${esc(doc.id)}" data-title="${esc(p.title)}">Sil</button>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      console.error('[Admin] loadPosts', err);
      container.innerHTML = `<tr><td colspan="7" class="table-empty" style="color:var(--color-error)">${esc(firestoreErrToUser(err))}</td></tr>`;
    }
  }

  function showPostForm(postData = null) {
    document.getElementById('posts-list-view').classList.add('hidden');
    document.getElementById('posts-form-view').classList.remove('hidden');
    document.getElementById('post-form-title').textContent = postData ? 'İçerik Düzenle' : 'Yeni İçerik';

    const form = document.getElementById('post-form');
    form.reset();
    const postCoverFile = document.getElementById('post-cover-file');
    if (postCoverFile) postCoverFile.value = '';
    const postCoverStatus = document.getElementById('post-cover-upload-status');
    if (postCoverStatus) postCoverStatus.textContent = '';

    if (postData) {
      form.title.value = postData.title || '';
      form.slug.value = postData.slug || '';
      form.category.value = postData.category || 'news';
      form.tags.value = (postData.tags || []).join(', ');
      form.coverImageUrl.value = postData.coverImageUrl || '';
      form.publishedAt.value = fmtDateInput(postData.publishedAt);
      form.featured.checked = !!postData.featured;
      updateImagePreview('post-cover-preview', postData.coverImageUrl);
    } else {
      form.publishedAt.value = new Date().toISOString().split('T')[0];
      updateImagePreview('post-cover-preview', '');
    }

    try {
      initQuillExcerpt(postData?.excerpt || '');
      initQuill(postData?.body || '');
    } catch (err) {
      console.error('[Admin] Quill (içerik):', err);
      toast('Metin editörü yüklenemedi. Sayfayı yenileyip tekrar deneyin.', 'error');
    }

    form.title.addEventListener('input', function autoSlug() {
      if (!editingPostId) form.slug.value = slugify(form.title.value);
    });
  }

  function hidePostForm() {
    document.getElementById('posts-list-view').classList.remove('hidden');
    document.getElementById('posts-form-view').classList.add('hidden');
    editingPostId = null;
    quillEditor = null;
    quillExcerpt = null;
  }

  async function savePost() {
    const form = document.getElementById('post-form');
    const title = form.title.value.trim();
    const slug = form.slug.value.trim() || slugify(title);
    let excerptHtml = quillExcerpt ? quillExcerpt.root.innerHTML : '';
    if (!quillExcerpt) {
      const exFb = document.getElementById('post-excerpt-fallback');
      if (exFb) excerptHtml = exFb.value.trim();
    }
    const excerpt = isQuillContentEmpty(excerptHtml) ? '' : excerptHtml.trim();
    const category = form.category.value;
    const tags = form.tags.value.split(',').map(t => t.trim()).filter(Boolean);
    const coverImageUrl = form.coverImageUrl.value.trim();
    const publishedAt = form.publishedAt.value ? new Date(form.publishedAt.value) : new Date();
    const featured = form.featured.checked;
    let body = quillEditor ? quillEditor.root.innerHTML : '';
    if (!quillEditor) {
      const bFb = document.getElementById('post-body-fallback');
      if (bFb) body = bFb.value.trim();
    }

    if (!title) { toast('Başlık zorunludur.', 'error'); return; }
    if (!slug) { toast('Slug zorunludur.', 'error'); return; }
    if (!isDbReady() || typeof firebase === 'undefined') {
      toast('Veritabanı kullanılamıyor. Sayfayı yenileyin.', 'error');
      return;
    }

    const currentUser = auth && auth.currentUser;
    const data = {
      title, slug, excerpt, category, tags, coverImageUrl, body, publishedAt, featured,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: currentUser ? currentUser.email : 'bilinmiyor',
    };

    const btn = document.getElementById('save-post-btn');
    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    try {
      if (editingPostId) {
        await getDb().collection('posts').doc(editingPostId).update(data);
        toast('İçerik güncellendi!', 'success');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await getDb().collection('posts').add(data);
        toast('Yeni içerik eklendi!', 'success');
      }
      if (typeof API !== 'undefined' && API.clearCache) API.clearCache();
      hidePostForm();
      loadPosts();
    } catch (err) {
      toast('Kayıt hatası: ' + err.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Kaydet';
  }

  async function editPost(id) {
    editingPostId = id;
    if (!isDbReady()) { toast('Veritabanı kullanılamıyor.', 'error'); return; }
    try {
      const doc = await getDb().collection('posts').doc(id).get();
      if (!doc.exists) { toast('İçerik bulunamadı.', 'error'); return; }
      showPostForm(doc.data());
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  }

  async function deletePost(id, title) {
    const ok = await confirmAction('İçeriği Sil', `"${title}" içeriğini silmek istediğinize emin misiniz?`);
    if (!ok) return;
    if (!isDbReady()) { toast('Veritabanı kullanılamıyor.', 'error'); return; }
    try {
      await getDb().collection('posts').doc(id).delete();
      if (typeof API !== 'undefined' && API.clearCache) API.clearCache();
      toast('İçerik silindi.', 'success');
      loadPosts();
    } catch (err) { toast('Silme hatası: ' + err.message, 'error'); }
  }

  /* ═══════════════ VIDEOS CRUD ═══════════════ */
  async function loadVideos() {
    const container = document.getElementById('videos-table-body');
    container.innerHTML = '<tr><td colspan="6" class="table-empty">Yükleniyor...</td></tr>';
    if (!isDbReady()) {
      container.innerHTML = '<tr><td colspan="6" class="table-empty" style="color:var(--color-error)">Veritabanı kullanılamıyor.</td></tr>';
      return;
    }
    try {
      const snap = await getDb().collection('videos').get();
      const docs = sortDocSnapshotsByCreatedDesc(snap.docs);
      if (docs.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="table-empty">Henüz video yok. "Yeni Video" butonuna tıklayarak ekleyin.</td></tr>';
        return;
      }
      container.innerHTML = docs.map(doc => {
        const v = doc.data();
        return `<tr>
          <td class="mobile-hide">${v.coverImageUrl ? `<img src="${esc(v.coverImageUrl)}" class="row-thumb" alt="" />` : '—'}</td>
          <td class="row-title">${esc(v.title)}</td>
          <td class="mobile-hide">${fmtDate(v.publishedAt)}</td>
          <td class="mobile-hide">${v.featured ? '<span style="color:var(--color-accent)">★</span>' : '—'}</td>
          <td class="mobile-hide row-updated-by">${v.lastUpdatedBy ? esc(v.lastUpdatedBy) : '<span class="text-muted">—</span>'}</td>
          <td class="row-actions">
            <button class="btn btn-xs btn-info" data-action="edit-video" data-id="${esc(doc.id)}">Düzenle</button>
            <button class="btn btn-xs btn-danger" data-action="delete-video" data-id="${esc(doc.id)}" data-title="${esc(v.title)}">Sil</button>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      console.error('[Admin] loadVideos', err);
      container.innerHTML = `<tr><td colspan="6" class="table-empty" style="color:var(--color-error)">${esc(firestoreErrToUser(err))}</td></tr>`;
    }
  }

  function extractVideoIdFromEmbed(embed) {
    if (!embed || typeof embed !== 'string') return '';
    const m = embed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  function embedToWatchUrl(embed) {
    const id = extractVideoIdFromEmbed(embed);
    return id ? 'https://www.youtube.com/watch?v=' + id : '';
  }

  function urlToEmbed(url) {
    if (!url || typeof url !== 'string') return '';
    let id = '';
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) id = watchMatch[1];
    else {
      const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) id = embedMatch[1];
    }
    if (!id) return '';
    return '<iframe src="https://www.youtube.com/embed/' + id + '" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
  }

  function showVideoForm(videoData = null) {
    document.getElementById('videos-list-view').classList.add('hidden');
    document.getElementById('videos-form-view').classList.remove('hidden');
    document.getElementById('video-form-title').textContent = videoData ? 'Video Düzenle' : 'Yeni Video';

    const form = document.getElementById('video-form');
    form.reset();
    const videoCoverFile = document.getElementById('video-cover-file');
    if (videoCoverFile) videoCoverFile.value = '';
    const videoCoverStatus = document.getElementById('video-cover-upload-status');
    if (videoCoverStatus) videoCoverStatus.textContent = '';

    const urlInput = document.getElementById('video-youtubeUrl');
    const embedInput = document.getElementById('video-youtubeEmbed');

    if (videoData) {
      form.title.value = videoData.title || '';
      form.slug.value = videoData.slug || '';
      form.coverImageUrl.value = videoData.coverImageUrl || '';
      embedInput.value = videoData.youtubeEmbed || '';
      urlInput.value = embedToWatchUrl(videoData.youtubeEmbed);
      form.publishedAt.value = fmtDateInput(videoData.publishedAt);
      form.featured.checked = !!videoData.featured;
      updateImagePreview('video-cover-preview', videoData.coverImageUrl);
    } else {
      form.publishedAt.value = new Date().toISOString().split('T')[0];
      updateImagePreview('video-cover-preview', '');
    }

    urlInput.addEventListener('input', function syncEmbed() {
      const embed = urlToEmbed(urlInput.value.trim());
      embedInput.value = embed;
    });

    form.title.addEventListener('input', function autoSlug() {
      if (!editingVideoId) form.slug.value = slugify(form.title.value);
    });

    try {
      initQuillVideoDescription(videoData?.description || '');
    } catch (err) {
      console.error('[Admin] Quill (video):', err);
      toast('Açıklama editörü yüklenemedi. Sayfayı yenileyip tekrar deneyin.', 'error');
    }
  }

  function hideVideoForm() {
    document.getElementById('videos-list-view').classList.remove('hidden');
    document.getElementById('videos-form-view').classList.add('hidden');
    editingVideoId = null;
    quillVideoDescription = null;
  }

  async function saveVideo() {
    const form = document.getElementById('video-form');
    const title = form.title.value.trim();
    const slug = form.slug.value.trim() || slugify(title);
    const coverImageUrl = form.coverImageUrl.value.trim();
    let youtubeEmbed = form.youtubeEmbed.value.trim();
    const urlInput = document.getElementById('video-youtubeUrl').value.trim();
    if (!youtubeEmbed && urlInput) youtubeEmbed = urlToEmbed(urlInput);
    let descriptionHtml = quillVideoDescription ? quillVideoDescription.root.innerHTML : '';
    if (!quillVideoDescription) {
      const dFb = document.getElementById('video-description-fallback');
      if (dFb) descriptionHtml = dFb.value.trim();
    }
    const description = isQuillContentEmpty(descriptionHtml) ? '' : descriptionHtml.trim();
    const publishedAt = form.publishedAt.value ? new Date(form.publishedAt.value) : new Date();
    const featured = form.featured.checked;

    if (!title) { toast('Başlık zorunludur.', 'error'); return; }
    if (!youtubeEmbed || !extractVideoIdFromEmbed(youtubeEmbed)) {
      toast('Geçerli bir YouTube video URL\'si girin. Örn: https://youtube.com/watch?v=VIDEO_ID', 'error');
      return;
    }
    if (!isDbReady() || typeof firebase === 'undefined') {
      toast('Veritabanı kullanılamıyor. Sayfayı yenileyin.', 'error');
      return;
    }

    const currentUser = auth && auth.currentUser;
    const data = {
      title, slug, coverImageUrl, youtubeEmbed, description, publishedAt, featured,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: currentUser ? currentUser.email : 'bilinmiyor',
    };

    const btn = document.getElementById('save-video-btn');
    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    try {
      if (editingVideoId) {
        await getDb().collection('videos').doc(editingVideoId).update(data);
        toast('Video güncellendi!', 'success');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await getDb().collection('videos').add(data);
        toast('Yeni video eklendi!', 'success');
      }
      hideVideoForm();
      loadVideos();
    } catch (err) { toast('Kayıt hatası: ' + err.message, 'error'); }
    btn.disabled = false;
    btn.textContent = 'Kaydet';
  }

  async function editVideo(id) {
    editingVideoId = id;
    if (!isDbReady()) { toast('Veritabanı kullanılamıyor.', 'error'); return; }
    try {
      const doc = await getDb().collection('videos').doc(id).get();
      if (!doc.exists) { toast('Video bulunamadı.', 'error'); return; }
      showVideoForm(doc.data());
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  }

  async function deleteVideo(id, title) {
    const ok = await confirmAction('Videoyu Sil', `"${title}" videosunu silmek istediğinize emin misiniz?`);
    if (!ok) return;
    if (!isDbReady()) { toast('Veritabanı kullanılamıyor.', 'error'); return; }
    try {
      await getDb().collection('videos').doc(id).delete();
      toast('Video silindi.', 'success');
      loadVideos();
    } catch (err) { toast('Silme hatası: ' + err.message, 'error'); }
  }

  /* ═══════════════ QUILL EDITOR ═══════════════ */
  function initQuill(content) {
    const container = document.getElementById('quill-editor');
    if (!container) {
      console.error('[Admin] #quill-editor bulunamadı; gövde metni kaydedilemez.');
      quillEditor = null;
      return;
    }
    container.innerHTML = '';
    if (typeof Quill === 'undefined') {
      console.error('[Admin] Quill yüklenmedi; vendor/quill-1.3.7/quill.min.js yolunu kontrol edin.');
      mountBodyFallback(container, content);
      quillEditor = null;
      return;
    }
    quillEditor = new Quill(container, {
      theme: 'snow',
      readOnly: false,
      placeholder: 'Makale veya haber metnini buraya yazın…',
      ...quillScrollOptions(),
      modules: { toolbar: QUILL_TOOLBAR_FULL },
    });
    quillEditor.enable(true);
    if (content) quillEditor.root.innerHTML = content;
    attachQuillImageHandler(quillEditor);
  }

  function initQuillExcerpt(content) {
    const container = document.getElementById('quill-excerpt');
    if (!container) {
      quillExcerpt = null;
      return;
    }
    container.innerHTML = '';
    if (typeof Quill === 'undefined') {
      mountExcerptFallback(container, content);
      quillExcerpt = null;
      return;
    }
    quillExcerpt = new Quill(container, {
      theme: 'snow',
      readOnly: false,
      placeholder: 'Liste ve kartlarda görünecek özet...',
      ...quillScrollOptions(),
      modules: { toolbar: QUILL_TOOLBAR_COMPACT },
    });
    quillExcerpt.enable(true);
    if (content) quillExcerpt.root.innerHTML = content;
  }

  function initQuillVideoDescription(content) {
    const container = document.getElementById('quill-video-description');
    if (!container) {
      quillVideoDescription = null;
      return;
    }
    container.innerHTML = '';
    if (typeof Quill === 'undefined') {
      mountVideoDescriptionFallback(container, content);
      quillVideoDescription = null;
      return;
    }
    quillVideoDescription = new Quill(container, {
      theme: 'snow',
      readOnly: false,
      placeholder: 'Video sayfasında gösterilecek açıklama ve metin…',
      ...quillScrollOptions(),
      modules: { toolbar: QUILL_TOOLBAR_FULL },
    });
    quillVideoDescription.enable(true);
    if (content) quillVideoDescription.root.innerHTML = content;
    attachQuillImageHandler(quillVideoDescription);
  }

  /* ═══════════════ PUBLIC API ═══════════════ */
  return {
    init,
    editPost,
    deletePost,
    editVideo,
    deleteVideo,
    showPostForm: () => { editingPostId = null; showPostForm(); },
    savePost,
    cancelPostForm: hidePostForm,
    showVideoForm: () => { editingVideoId = null; showVideoForm(); },
    saveVideo,
    cancelVideoForm: hideVideoForm,
    setupImagePreviews,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
  Admin.setupImagePreviews();
});
