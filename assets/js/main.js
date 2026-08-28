const ITEMS_PER_PAGE = 50;

let allSongs = [];
let allMovies = [];
let filteredMovies = [];
let currentPage = 1;
let searchQuery = '';
let activeDecade = 'all';
let sortMode = 'year-desc';

const movieSearch = document.getElementById('movieSearch');
const movieList = document.getElementById('movieList');
const movieCount = document.getElementById('movieCount');
const statsBar = document.getElementById('statsBar');
const decadeFilters = document.getElementById('decadeFilters');
const sortSelect = document.getElementById('sortSelect');
const randomBtn = document.getElementById('randomBtn');

function renderSkeleton(count) {
  movieList.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skeleton-disc skeleton-shimmer"></div>
      <div class="skeleton-lines">
        <div class="skeleton-line skeleton-shimmer" style="width:80%"></div>
        <div class="skeleton-line skeleton-shimmer" style="width:50%"></div>
      </div>
    `;
    movieList.appendChild(card);
  }
}

function decadeOf(year) {
  const y = parseInt(year, 10);
  const thisYear = new Date().getFullYear();
  if (!y || y < 1930 || y > thisYear + 1) return null;
  return Math.floor(y / 10) * 10;
}

async function loadData() {
  renderSkeleton(12);
  try {
    const response = await fetch('data/index.json');
    if (!response.ok) throw new Error('bad response');
    const data = await response.json();
    allSongs = Object.values(data);

    const movieMap = new Map();
    allSongs.forEach(song => {
      const film = song.film || 'Unknown';
      if (!movieMap.has(film)) {
        movieMap.set(film, { film, year: song.year || '', songs: [] });
      }
      const entry = movieMap.get(film);
      entry.songs.push(song);
      if (!entry.year && song.year) entry.year = song.year;
    });

    allMovies = Array.from(movieMap.values());
    renderStats();
    renderDecadeChips();
  } catch (err) {
    console.error('Failed to load data', err);
    movieList.innerHTML = `
      <div class="error-state">
        <span class="big-emoji">⚠️</span>
        Couldn't load the archive. Please refresh, or check that <code>data/index.json</code> is reachable.
      </div>`;
  }
}

function renderStats() {
  const years = allMovies.map(m => parseInt(m.year, 10)).filter(y => y && y >= 1930 && y <= new Date().getFullYear() + 1);
  const minY = years.length ? Math.min(...years) : '—';
  const maxY = years.length ? Math.max(...years) : '—';
  statsBar.innerHTML = `
    <span><strong>${allMovies.length.toLocaleString()}</strong> movies</span>
    <span><strong>${allSongs.length.toLocaleString()}</strong> songs</span>
    <span><strong>${minY}–${maxY}</strong></span>
  `;
}

function renderDecadeChips() {
  const decades = new Set();
  allMovies.forEach(m => {
    const d = decadeOf(m.year);
    if (d) decades.add(d);
  });
  const sorted = Array.from(decades).sort((a, b) => b - a);

  // Build chip buttons in a fragment, then insert them before the (already-existing) sort select
  const frag = document.createDocumentFragment();
  ['all', ...sorted].forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (d === activeDecade ? ' active' : '');
    btn.dataset.decade = d;
    btn.textContent = d === 'all' ? 'All decades' : `${d}s`;
    btn.addEventListener('click', () => {
      activeDecade = d === 'all' ? 'all' : d;
      decadeFilters.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPage = 1;
      applyFilters();
    });
    frag.appendChild(btn);
  });

  decadeFilters.querySelectorAll('.chip').forEach(b => b.remove());
  decadeFilters.insertBefore(frag, sortSelect);
}

function movieMatchesQuery(movie, q) {
  if (!q) return true;
  if (movie.film.toLowerCase().includes(q)) return true;
  if ((movie.year || '').includes(q)) return true;
  return movie.songs.some(s =>
    (s.songName || '').toLowerCase().includes(q) ||
    (s.lyricist || '').toLowerCase().includes(q) ||
    (s.singers || '').toLowerCase().includes(q) ||
    (s.musicDirector || '').toLowerCase().includes(q)
  );
}

function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
  filteredMovies = allMovies.filter(m => {
    const matchesSearch = movieMatchesQuery(m, q);
    const matchesDecade = activeDecade === 'all' || decadeOf(m.year) === activeDecade;
    return matchesSearch && matchesDecade;
  });

  const collator = new Intl.Collator('ml');
  switch (sortMode) {
    case 'year-asc':
      filteredMovies.sort((a, b) => (parseInt(a.year, 10) || 9999) - (parseInt(b.year, 10) || 9999));
      break;
    case 'year-desc':
      filteredMovies.sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
      break;
    case 'name-asc':
      filteredMovies.sort((a, b) => collator.compare(a.film, b.film));
      break;
    case 'songs-desc':
      filteredMovies.sort((a, b) => b.songs.length - a.songs.length);
      break;
  }

  renderMovies();
}

function createMovieCard(movie, index) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.style.setProperty('--i', index);
  const initial = (movie.film || '?').trim().charAt(0) || '?';
  card.innerHTML = `
    <div class="disc"><div class="disc-label">${escapeHtml(initial)}</div></div>
    <div class="movie-card-body">
      <h3>${escapeHtml(movie.film)}</h3>
      <div class="meta-line">${movie.year ? escapeHtml(movie.year) + ' · ' : ''}<span class="gold">${movie.songs.length}</span> song${movie.songs.length === 1 ? '' : 's'}</div>
    </div>
  `;
  card.addEventListener('click', () => {
    window.location.href = `movie.html?film=${encodeURIComponent(movie.film)}`;
  });
  return card;
}

function renderMovies() {
  movieList.innerHTML = '';
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = Math.min(start + ITEMS_PER_PAGE, filteredMovies.length);
  const pageMovies = filteredMovies.slice(start, end);

  if (pageMovies.length === 0) {
    movieList.innerHTML = `
      <div class="empty-state">
        <span class="big-emoji">🎞️</span>
        No movies match that search. Try a different title, singer or lyricist.
      </div>`;
  } else {
    pageMovies.forEach((movie, i) => movieList.appendChild(createMovieCard(movie, i)));
  }

  movieCount.textContent = filteredMovies.length
    ? `Showing ${start + 1}–${end} of ${filteredMovies.length.toLocaleString()} movies`
    : '';
  renderPagination();
}

function renderPagination() {
  const oldPagination = document.querySelector('.pagination');
  if (oldPagination) oldPagination.remove();

  const totalPages = Math.ceil(filteredMovies.length / ITEMS_PER_PAGE);
  if (totalPages <= 1) return;

  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '← Prev';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => { currentPage--; renderMovies(); scrollToTop(); });
  paginationDiv.appendChild(prevBtn);

  let startPage = Math.max(1, currentPage - 3);
  let endPage = Math.min(totalPages, startPage + 6);
  if (endPage - startPage < 6) startPage = Math.max(1, endPage - 6);

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    if (i === currentPage) pageBtn.classList.add('active');
    pageBtn.addEventListener('click', () => { currentPage = i; renderMovies(); scrollToTop(); });
    paginationDiv.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => { currentPage++; renderMovies(); scrollToTop(); });
  paginationDiv.appendChild(nextBtn);

  movieList.after(paginationDiv);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const debouncedSearch = debounce(() => {
  searchQuery = movieSearch.value;
  currentPage = 1;
  applyFilters();
}, 200);

movieSearch.addEventListener('input', debouncedSearch);
sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  applyFilters();
});

randomBtn.addEventListener('click', () => {
  if (!allSongs.length) return;
  randomBtn.classList.remove('rolling');
  void randomBtn.offsetWidth; // restart animation
  randomBtn.classList.add('rolling');
  const song = allSongs[Math.floor(Math.random() * allSongs.length)];
  window.location.href = `song.html?id=${encodeURIComponent(song.id)}&year=${encodeURIComponent(song.year || 'unknown')}`;
});

async function init() {
  const vinylMark = document.getElementById('headerVinyl');
  if (vinylMark) vinylMark.innerHTML = vinylSVG(42);
  await loadData();
  applyFilters();
}

init();
