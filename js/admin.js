/* admin.js – MineVerse Admin Panel Logic */

const Admin = (() => {

  /* ═══════════════ STATE ═══════════════ */
  let currentSection = 'dashboard';
  let editingPostId = null;
  let editingVideoId = null;
  let quillEditor = null;
  let auth = null;

  /* ═══════════════ INIT ═══════════════ */
  function init() {
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

    setupLoginForm();
    setupNavigation();
    setupMobileMenu();
  }

  /* ═══════════════ AUTH ═══════════════ */
  function setupLoginForm() {
    const form = document.getElementById('login-form');
    const errEl = document.getElementById('login-error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
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

  function logout() { auth.signOut(); }

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

    if (name === 'dashboard') loadDashboard();
    else if (name === 'posts') { hidePostForm(); loadPosts(); }
    else if (name === 'videos') { hideVideoForm(); loadVideos(); }
    else if (name === 'subscribers') loadSubscribers();
    else if (name === 'messages') loadMessages();
  }

  function sectionTitle(name) {
    const map = { dashboard: 'Dashboard', posts: 'İçerik Yönetimi', videos: 'Video Yönetimi', subscribers: 'Aboneler', messages: 'Mesajlar' };
    return map[name] || name;
  }

  function setupMobileMenu() {
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
      document.getElementById('admin-sidebar').classList.toggle('open');
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

  function setupImagePreviews() {
    document.getElementById('post-coverImageUrl')?.addEventListener('input', (e) => {
      updateImagePreview('post-cover-preview', e.target.value);
    });
    document.getElementById('video-coverImageUrl')?.addEventListener('input', (e) => {
      updateImagePreview('video-cover-preview', e.target.value);
    });
  }

  /* ═══════════════ DASHBOARD ═══════════════ */
  async function loadDashboard() {
    const [posts, videos, subs, msgs] = await Promise.all([
      db.collection('posts').get(),
      db.collection('videos').get(),
      db.collection('newsletter_subscribers').get(),
      db.collection('contact_messages').get(),
    ]);

    const unreadCount = msgs.docs.filter(d => !d.data().read).length;

    document.getElementById('stat-posts').textContent = posts.size;
    document.getElementById('stat-videos').textContent = videos.size;
    document.getElementById('stat-subs').textContent = subs.size;
    document.getElementById('stat-msgs').textContent = msgs.size;

    const msgBadge = document.getElementById('nav-badge-messages');
    if (unreadCount > 0) { msgBadge.textContent = unreadCount; msgBadge.style.display = 'inline'; }
    else { msgBadge.style.display = 'none'; }

    const recentEl = document.getElementById('dashboard-recent');
    const recentPosts = posts.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, 5);

    if (recentPosts.length === 0) {
      recentEl.innerHTML = '<p class="text-muted text-sm">Henüz içerik eklenmemiş. "İçerikler" bölümünden ilk içeriğinizi ekleyin.</p>';
    } else {
      recentEl.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Başlık</th><th>Kategori</th><th>Tarih</th><th>Son Güncelleyen</th></tr></thead>
        <tbody>${recentPosts.map(p => `<tr>
          <td class="row-title">${esc(p.title)}</td>
          <td><span class="badge">${esc(p.category || '')}</span></td>
          <td>${fmtDate(p.publishedAt)}</td>
          <td class="row-updated-by">${p.lastUpdatedBy ? esc(p.lastUpdatedBy) : '<span class="text-muted">—</span>'}</td>
        </tr>`).join('')}</tbody></table></div>`;
    }
  }

  /* ═══════════════ POSTS CRUD ═══════════════ */
  async function loadPosts() {
    const container = document.getElementById('posts-table-body');
    container.innerHTML = '<tr><td colspan="7" class="table-empty">Yükleniyor...</td></tr>';
    try {
      const snap = await db.collection('posts').orderBy('createdAt', 'desc').get();
      if (snap.empty) {
        container.innerHTML = '<tr><td colspan="7" class="table-empty">Henüz içerik yok. "Yeni İçerik" butonuna tıklayarak ekleyin.</td></tr>';
        return;
      }
      container.innerHTML = snap.docs.map(doc => {
        const p = doc.data();
        return `<tr>
          <td>${p.coverImageUrl ? `<img src="${esc(p.coverImageUrl)}" class="row-thumb" alt="" />` : '<span class="row-thumb skeleton"></span>'}</td>
          <td class="row-title">${esc(p.title)}</td>
          <td><span class="badge">${esc(p.category || '')}</span></td>
          <td>${fmtDate(p.publishedAt)}</td>
          <td>${p.featured ? '<span style="color:var(--color-accent)">★</span>' : '—'}</td>
          <td class="row-updated-by">${p.lastUpdatedBy ? esc(p.lastUpdatedBy) : '<span class="text-muted">—</span>'}</td>
          <td class="row-actions">
            <button class="btn btn-xs btn-info" onclick="Admin.editPost('${doc.id}')">Düzenle</button>
            <button class="btn btn-xs btn-danger" onclick="Admin.deletePost('${doc.id}','${esc(p.title).replace(/'/g, "\\'")}')">Sil</button>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="7" class="table-empty" style="color:var(--color-error)">Hata: ${err.message}</td></tr>`;
    }
  }

  function showPostForm(postData = null) {
    document.getElementById('posts-list-view').classList.add('hidden');
    document.getElementById('posts-form-view').classList.remove('hidden');
    document.getElementById('post-form-title').textContent = postData ? 'İçerik Düzenle' : 'Yeni İçerik';

    const form = document.getElementById('post-form');
    form.reset();

    if (postData) {
      form.title.value = postData.title || '';
      form.slug.value = postData.slug || '';
      form.excerpt.value = postData.excerpt || '';
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

    initQuill(postData?.body || '');

    form.title.addEventListener('input', function autoSlug() {
      if (!editingPostId) form.slug.value = slugify(form.title.value);
    });
  }

  function hidePostForm() {
    document.getElementById('posts-list-view').classList.remove('hidden');
    document.getElementById('posts-form-view').classList.add('hidden');
    editingPostId = null;
    quillEditor = null;
  }

  async function savePost() {
    const form = document.getElementById('post-form');
    const title = form.title.value.trim();
    const slug = form.slug.value.trim() || slugify(title);
    const excerpt = form.excerpt.value.trim();
    const category = form.category.value;
    const tags = form.tags.value.split(',').map(t => t.trim()).filter(Boolean);
    const coverImageUrl = form.coverImageUrl.value.trim();
    const publishedAt = form.publishedAt.value ? new Date(form.publishedAt.value) : new Date();
    const featured = form.featured.checked;
    const body = quillEditor ? quillEditor.root.innerHTML : '';

    if (!title) { toast('Başlık zorunludur.', 'error'); return; }
    if (!slug) { toast('Slug zorunludur.', 'error'); return; }

    const currentUser = auth.currentUser;
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
        await db.collection('posts').doc(editingPostId).update(data);
        toast('İçerik güncellendi!', 'success');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('posts').add(data);
        toast('Yeni içerik eklendi!', 'success');
      }
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
    try {
      const doc = await db.collection('posts').doc(id).get();
      if (!doc.exists) { toast('İçerik bulunamadı.', 'error'); return; }
      showPostForm(doc.data());
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  }

  async function deletePost(id, title) {
    const ok = await confirmAction('İçeriği Sil', `"${title}" içeriğini silmek istediğinize emin misiniz?`);
    if (!ok) return;
    try {
      await db.collection('posts').doc(id).delete();
      toast('İçerik silindi.', 'success');
      loadPosts();
    } catch (err) { toast('Silme hatası: ' + err.message, 'error'); }
  }

  /* ═══════════════ VIDEOS CRUD ═══════════════ */
  async function loadVideos() {
    const container = document.getElementById('videos-table-body');
    container.innerHTML = '<tr><td colspan="6" class="table-empty">Yükleniyor...</td></tr>';
    try {
      const snap = await db.collection('videos').orderBy('createdAt', 'desc').get();
      if (snap.empty) {
        container.innerHTML = '<tr><td colspan="6" class="table-empty">Henüz video yok. "Yeni Video" butonuna tıklayarak ekleyin.</td></tr>';
        return;
      }
      container.innerHTML = snap.docs.map(doc => {
        const v = doc.data();
        return `<tr>
          <td>${v.coverImageUrl ? `<img src="${esc(v.coverImageUrl)}" class="row-thumb" alt="" />` : '—'}</td>
          <td class="row-title">${esc(v.title)}</td>
          <td>${fmtDate(v.publishedAt)}</td>
          <td>${v.featured ? '<span style="color:var(--color-accent)">★</span>' : '—'}</td>
          <td class="row-updated-by">${v.lastUpdatedBy ? esc(v.lastUpdatedBy) : '<span class="text-muted">—</span>'}</td>
          <td class="row-actions">
            <button class="btn btn-xs btn-info" onclick="Admin.editVideo('${doc.id}')">Düzenle</button>
            <button class="btn btn-xs btn-danger" onclick="Admin.deleteVideo('${doc.id}','${esc(v.title).replace(/'/g, "\\'")}')">Sil</button>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="6" class="table-empty" style="color:var(--color-error)">Hata: ${err.message}</td></tr>`;
    }
  }

  function showVideoForm(videoData = null) {
    document.getElementById('videos-list-view').classList.add('hidden');
    document.getElementById('videos-form-view').classList.remove('hidden');
    document.getElementById('video-form-title').textContent = videoData ? 'Video Düzenle' : 'Yeni Video';

    const form = document.getElementById('video-form');
    form.reset();

    if (videoData) {
      form.title.value = videoData.title || '';
      form.slug.value = videoData.slug || '';
      form.coverImageUrl.value = videoData.coverImageUrl || '';
      form.youtubeEmbed.value = videoData.youtubeEmbed || '';
      form.description.value = videoData.description || '';
      form.publishedAt.value = fmtDateInput(videoData.publishedAt);
      form.featured.checked = !!videoData.featured;
      updateImagePreview('video-cover-preview', videoData.coverImageUrl);
    } else {
      form.publishedAt.value = new Date().toISOString().split('T')[0];
      updateImagePreview('video-cover-preview', '');
    }

    form.title.addEventListener('input', function autoSlug() {
      if (!editingVideoId) form.slug.value = slugify(form.title.value);
    });
  }

  function hideVideoForm() {
    document.getElementById('videos-list-view').classList.remove('hidden');
    document.getElementById('videos-form-view').classList.add('hidden');
    editingVideoId = null;
  }

  async function saveVideo() {
    const form = document.getElementById('video-form');
    const title = form.title.value.trim();
    const slug = form.slug.value.trim() || slugify(title);
    const coverImageUrl = form.coverImageUrl.value.trim();
    const youtubeEmbed = form.youtubeEmbed.value.trim();
    const description = form.description.value.trim();
    const publishedAt = form.publishedAt.value ? new Date(form.publishedAt.value) : new Date();
    const featured = form.featured.checked;

    if (!title) { toast('Başlık zorunludur.', 'error'); return; }

    const currentUser = auth.currentUser;
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
        await db.collection('videos').doc(editingVideoId).update(data);
        toast('Video güncellendi!', 'success');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('videos').add(data);
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
    try {
      const doc = await db.collection('videos').doc(id).get();
      if (!doc.exists) { toast('Video bulunamadı.', 'error'); return; }
      showVideoForm(doc.data());
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  }

  async function deleteVideo(id, title) {
    const ok = await confirmAction('Videoyu Sil', `"${title}" videosunu silmek istediğinize emin misiniz?`);
    if (!ok) return;
    try {
      await db.collection('videos').doc(id).delete();
      toast('Video silindi.', 'success');
      loadVideos();
    } catch (err) { toast('Silme hatası: ' + err.message, 'error'); }
  }

  /* ═══════════════ SUBSCRIBERS ═══════════════ */
  async function loadSubscribers() {
    const container = document.getElementById('subscribers-table-body');
    container.innerHTML = '<tr><td colspan="3" class="table-empty">Yükleniyor...</td></tr>';
    try {
      const snap = await db.collection('newsletter_subscribers').orderBy('subscribedAt', 'desc').get();
      document.getElementById('subs-count').textContent = `(${snap.size})`;
      if (snap.empty) {
        container.innerHTML = '<tr><td colspan="3" class="table-empty">Henüz abone yok.</td></tr>';
        return;
      }
      container.innerHTML = snap.docs.map(doc => {
        const s = doc.data();
        return `<tr>
          <td>${esc(s.email)}</td>
          <td>${fmtDate(s.subscribedAt)}</td>
          <td class="row-actions">
            <button class="btn btn-xs btn-danger" onclick="Admin.deleteSubscriber('${doc.id}')">Sil</button>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="3" class="table-empty" style="color:var(--color-error)">Hata: ${err.message}</td></tr>`;
    }
  }

  async function deleteSubscriber(id) {
    const ok = await confirmAction('Aboneyi Sil', 'Bu aboneyi silmek istediğinize emin misiniz?');
    if (!ok) return;
    try {
      await db.collection('newsletter_subscribers').doc(id).delete();
      toast('Abone silindi.', 'success');
      loadSubscribers();
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  }

  async function exportSubscribers() {
    try {
      const snap = await db.collection('newsletter_subscribers').orderBy('subscribedAt', 'desc').get();
      const rows = [['E-posta', 'Kayıt Tarihi']];
      snap.docs.forEach(doc => {
        const s = doc.data();
        rows.push([s.email, fmtDate(s.subscribedAt)]);
      });
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mineverse_aboneler_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV indirildi!', 'success');
    } catch (err) { toast('Dışa aktarma hatası: ' + err.message, 'error'); }
  }

  /* ═══════════════ MESSAGES ═══════════════ */
  async function loadMessages() {
    const container = document.getElementById('messages-list');
    container.innerHTML = '<p class="text-muted text-sm">Yükleniyor...</p>';
    try {
      const snap = await db.collection('contact_messages').orderBy('sentAt', 'desc').get();
      document.getElementById('msgs-count').textContent = `(${snap.size})`;
      if (snap.empty) {
        container.innerHTML = '<p class="text-muted">Henüz mesaj yok.</p>';
        return;
      }
      container.innerHTML = snap.docs.map(doc => {
        const m = doc.data();
        return `<div class="msg-card ${m.read ? '' : 'unread'}">
          <div class="msg-card-header">
            <div><strong>${esc(m.name)}</strong></div>
            <time>${fmtDate(m.sentAt)}</time>
          </div>
          <div class="msg-card-meta">${esc(m.email)} · ${esc(m.subject || 'Genel')}</div>
          <div class="msg-card-body">${esc(m.message)}</div>
          <div class="msg-card-actions">
            <button class="btn btn-xs ${m.read ? 'btn-ghost' : 'btn-success'}" onclick="Admin.toggleReadMessage('${doc.id}', ${!m.read})">${m.read ? 'Okunmadı Yap' : 'Okundu Yap'}</button>
            <button class="btn btn-xs btn-danger" onclick="Admin.deleteMessage('${doc.id}')">Sil</button>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<p style="color:var(--color-error)">Hata: ${err.message}</p>`;
    }
  }

  async function toggleReadMessage(id, read) {
    try {
      await db.collection('contact_messages').doc(id).update({ read });
      loadMessages();
      loadDashboard();
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  }

  async function deleteMessage(id) {
    const ok = await confirmAction('Mesajı Sil', 'Bu mesajı silmek istediğinize emin misiniz?');
    if (!ok) return;
    try {
      await db.collection('contact_messages').doc(id).delete();
      toast('Mesaj silindi.', 'success');
      loadMessages();
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  }

  /* ═══════════════ QUILL EDITOR ═══════════════ */
  function initQuill(content) {
    const container = document.getElementById('quill-editor');
    container.innerHTML = '';
    quillEditor = new Quill(container, {
      theme: 'snow',
      placeholder: 'İçeriğinizi buraya yazın...',
      modules: {
        toolbar: [
          [{ header: [2, 3, 4, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['link', 'blockquote'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['image'],
          ['clean'],
        ],
      },
    });
    if (content) quillEditor.root.innerHTML = content;

    quillEditor.getModule('toolbar').addHandler('image', () => {
      const url = prompt('Görsel URL\'si girin:');
      if (url) {
        const range = quillEditor.getSelection(true);
        quillEditor.insertEmbed(range.index, 'image', url);
      }
    });
  }

  /* ═══════════════ PUBLIC API ═══════════════ */
  return {
    init,
    editPost,
    deletePost,
    editVideo,
    deleteVideo,
    deleteSubscriber,
    exportSubscribers,
    toggleReadMessage,
    deleteMessage,
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
