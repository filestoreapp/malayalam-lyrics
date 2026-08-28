/* ============================================
   THEME
   ============================================ */
function initTheme() {
  const saved = localStorage.getItem('mll_theme');
  if (saved === 'light') document.body.classList.add('light');
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = document.body.classList.contains('light') ? '🌙' : '☀️';
    btn.addEventListener('click', toggleTheme);
  }
}

function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('mll_theme', isLight ? 'light' : 'dark');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = isLight ? '🌙' : '☀️';
}

/* ============================================
   FAVORITES  (stored as [{id, year, songName, film}])
   ============================================ */
const FAV_KEY = 'mll_favorites';

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem(FAV_KEY, JSON.stringify(list));
  updateFavBadge();
}

function isFavorite(id) {
  return getFavorites().some(f => String(f.id) === String(id));
}

function toggleFavorite(song) {
  const list = getFavorites();
  const idx = list.findIndex(f => String(f.id) === String(song.id));
  if (idx > -1) {
    list.splice(idx, 1);
    showToast('Removed from favourites');
  } else {
    list.unshift({
      id: song.id,
      year: song.year || 'unknown',
      songName: song.songName,
      film: song.film
    });
    showToast('Saved to favourites');
  }
  saveFavorites(list);
  renderDrawerList();
  return list.some(f => String(f.id) === String(song.id));
}

function updateFavBadge() {
  const badge = document.getElementById('favCount');
  if (!badge) return;
  const count = getFavorites().length;
  badge.textContent = count;
  badge.classList.toggle('show', count > 0);
}

/* ============================================
   FAVORITES DRAWER (injected into every page)
   ============================================ */
function buildDrawer() {
  if (document.getElementById('favDrawer')) return;

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.id = 'drawerOverlay';

  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.id = 'favDrawer';
  drawer.innerHTML = `
    <div class="drawer-header">
      <h2>♥ Favourites</h2>
      <button class="drawer-close" id="drawerCloseBtn" aria-label="Close">✕</button>
    </div>
    <div class="drawer-list" id="drawerList"></div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  overlay.addEventListener('click', closeDrawer);
  document.getElementById('drawerCloseBtn').addEventListener('click', closeDrawer);

  const favBtn = document.getElementById('favBtn');
  if (favBtn) favBtn.addEventListener('click', openDrawer);

  renderDrawerList();
}

function openDrawer() {
  document.getElementById('favDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('favDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

function renderDrawerList() {
  const container = document.getElementById('drawerList');
  if (!container) return;
  const favs = getFavorites();

  if (favs.length === 0) {
    container.innerHTML = `<div class="drawer-empty">No favourites yet.<br>Tap the ♡ on any song to save it here.</div>`;
    return;
  }

  container.innerHTML = '';
  favs.forEach(f => {
    const row = document.createElement('div');
    row.className = 'drawer-item';
    row.innerHTML = `
      <a href="song.html?id=${encodeURIComponent(f.id)}&year=${encodeURIComponent(f.year)}">
        <h4>${escapeHtml(f.songName || 'Untitled')}</h4>
        <p>${escapeHtml(f.film || '')}</p>
      </a>
      <button aria-label="Remove">✕</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      const list = getFavorites().filter(x => String(x.id) !== String(f.id));
      saveFavorites(list);
      renderDrawerList();
    });
    container.appendChild(row);
  });
}

/* ============================================
   TOAST
   ============================================ */
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ============================================
   HELPERS
   ============================================ */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function vinylSVG(size) {
  return `
  <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="var(--border)" stroke-width="0.5" opacity="0.6"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border)" stroke-width="0.5" opacity="0.5"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="var(--border)" stroke-width="0.5" opacity="0.5"/>
    <circle cx="50" cy="50" r="22" fill="var(--gold)"/>
    <circle cx="50" cy="50" r="4" fill="var(--ink)"/>
  </svg>`;
}

/* ============================================
   INIT ON EVERY PAGE
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildDrawer();
  updateFavBadge();
});
