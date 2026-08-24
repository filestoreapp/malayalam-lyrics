const ITEMS_PER_PAGE = 50;

let allSongs = [];
let filteredSongs = [];
let currentPage = 1;
let currentFilterType = 'all';
let currentFilterValue = '';
let currentAlphabet = '';
let currentSort = 'title';
let currentSearch = '';

const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterValue = document.getElementById('filterValue');
const sortType = document.getElementById('sortType');
const songList = document.getElementById('songList');
const songCount = document.getElementById('songCount');
const statsBar = document.getElementById('statsBar');
const alphabetBrowse = document.getElementById('alphabetBrowse');
const paginationDiv = document.getElementById('pagination');
const featuredSong = document.getElementById('featuredSong');
const randomSongBtn = document.getElementById('randomSongBtn');
const themeToggle = document.getElementById('themeToggle');

// Load theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.classList.toggle('light', savedTheme === 'light');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

// Fetch index.json
async function loadSongs() {
  try {
    const response = await fetch('data/index.json');
    const data = await response.json();
    allSongs = Object.values(data);
    return allSongs;
  } catch (err) {
    console.error('Failed to load index.json', err);
    songList.innerHTML = '<p>Error loading songs.</p>';
    return [];
  }
}

// Helper: get unique sorted values for a field
function getUniqueValues(field) {
  const vals = new Set();
  allSongs.forEach(song => {
    const val = song[field];
    if (val) vals.add(val);
  });
  return Array.from(vals).sort();
}

// Render stats bar
function renderStats() {
  const totalSongs = allSongs.length;
  const movies = getUniqueValues('film').length;
  const lyricists = getUniqueValues('lyricist').length;
  const musicDirectors = getUniqueValues('musicDirector').length;
  const singers = getUniqueValues('singers').length;
  const years = getUniqueValues('year').length;

  statsBar.innerHTML = `
    <span>🎵 Songs: <strong>${totalSongs}</strong></span>
    <span>🎬 Movies: <strong>${movies}</strong></span>
    <span>✍️ Lyricists: <strong>${lyricists}</strong></span>
    <span>🎼 Music: <strong>${musicDirectors}</strong></span>
    <span>🎤 Singers: <strong>${singers}</strong></span>
    <span>📅 Years: <strong>${years}</strong></span>
  `;
}

// Render alphabet browse buttons
function renderAlphabet() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  alphabetBrowse.innerHTML = '<button data-letter="" class="active">All</button>';
  letters.forEach(letter => {
    const btn = document.createElement('button');
    btn.textContent = letter;
    btn.dataset.letter = letter;
    btn.addEventListener('click', () => {
      currentAlphabet = letter;
      document.querySelectorAll('.alphabet-browse button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPage = 1;
      applyFiltersAndRender();
    });
    alphabetBrowse.appendChild(btn);
  });
}

// Render featured song (Lyrics of the Day)
function renderFeaturedSong() {
  if (allSongs.length === 0) return;
  // Choose a song based on day of year (deterministic)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % allSongs.length;
  const song = allSongs[index];
  featuredSong.innerHTML = `
    <div class="label">✨ Lyrics of the Day</div>
    <h2>${song.songName}</h2>
    <p>Film: ${song.film} | Year: ${song.year}</p>
  `;
  featuredSong.addEventListener('click', () => {
    goToSong(song);
  });
}

// Navigate to song page
function goToSong(song) {
  const year = song.year || 'unknown';
  window.location.href = `song.html?id=${song.id}&year=${encodeURIComponent(year)}`;
}

// Create song card
function createSongCard(song) {
  const card = document.createElement('div');
  card.className = 'song-card';
  card.innerHTML = `
    <h3>${song.songName}</h3>
    <p>Film: ${song.film}</p>
    <p>Lyricist: ${song.lyricist}</p>
    <p>Music: ${song.musicDirector}</p>
    <p>Singer(s): ${song.singers}</p>
    <p>Year: ${song.year}</p>
    <div class="card-actions">
      <button class="share-btn" title="Share">🔗</button>
    </div>
  `;
  card.addEventListener('click', (e) => {
    // Ignore clicks on share button
    if (e.target.classList.contains('share-btn')) return;
    goToSong(song);
  });
  const shareBtn = card.querySelector('.share-btn');
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const songUrl = `${window.location.origin}${window.location.pathname.replace('index.html','')}song.html?id=${song.id}&year=${encodeURIComponent(song.year || 'unknown')}`;
    if (navigator.share) {
      navigator.share({ title: song.songName, url: songUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(songUrl).then(() => alert('Link copied!'));
    }
  });
  return card;
}

// Render song grid
function renderSongs() {
  songList.innerHTML = '';
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = Math.min(start + ITEMS_PER_PAGE, filteredSongs.length);
  const pageSongs = filteredSongs.slice(start, end);

  if (pageSongs.length === 0) {
    songList.innerHTML = '<p style="grid-column:1/-1; text-align:center;">No songs found.</p>';
  } else {
    pageSongs.forEach(song => songList.appendChild(createSongCard(song)));
  }

  songCount.textContent = `Showing ${start + 1}-${end} of ${filteredSongs.length} songs (Total: ${allSongs.length})`;
  renderPagination();
}

// Render pagination controls
function renderPagination() {
  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  paginationDiv.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderSongs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationDiv.appendChild(prevBtn);

  // Page numbers (max 7 visible)
  let startPage = Math.max(1, currentPage - 3);
  let endPage = Math.min(totalPages, startPage + 6);
  if (endPage - startPage < 6) {
    startPage = Math.max(1, endPage - 6);
  }
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    if (i === currentPage) pageBtn.classList.add('active');
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      renderSongs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderSongs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationDiv.appendChild(nextBtn);
}

// Apply all filters and sorting
function applyFiltersAndRender() {
  currentSearch = searchInput.value.toLowerCase().trim();
  const query = currentSearch;

  filteredSongs = allSongs.filter(song => {
    // Search filter
    const matchesSearch = !query ||
      song.songName.toLowerCase().includes(query) ||
      song.film.toLowerCase().includes(query) ||
      song.lyricist.toLowerCase().includes(query) ||
      song.musicDirector.toLowerCase().includes(query) ||
      song.singers.toLowerCase().includes(query) ||
      song.year.includes(query);

    // Type filter
    const matchesType = currentFilterType === 'all' || currentFilterValue === '' ||
      song[currentFilterType] === currentFilterValue;

    // Alphabet filter (on songName)
    const matchesAlphabet = currentAlphabet === '' ||
      song.songName.charAt(0).toUpperCase() === currentAlphabet;

    return matchesSearch && matchesType && matchesAlphabet;
  });

  // Sorting
  switch (currentSort) {
    case 'title':
      filteredSongs.sort((a, b) => a.songName.localeCompare(b.songName, 'ml'));
      break;
    case 'titleDesc':
      filteredSongs.sort((a, b) => b.songName.localeCompare(a.songName, 'ml'));
      break;
    case 'year':
      filteredSongs.sort((a, b) => (b.year || '').localeCompare(a.year || '', undefined, { numeric: true }));
      break;
    case 'yearOldest':
      filteredSongs.sort((a, b) => (a.year || '').localeCompare(b.year || '', undefined, { numeric: true }));
      break;
    case 'movie':
      filteredSongs.sort((a, b) => a.film.localeCompare(b.film, 'ml'));
      break;
    case 'added':
      // Use insertion order (id) - no sort needed
      break;
    default:
      break;
  }

  currentPage = 1;
  renderSongs();
}

// Populate filter value dropdown
function populateFilterValues() {
  currentFilterType = filterType.value;
  filterValue.innerHTML = '<option value="">All</option>';
  if (currentFilterType !== 'all') {
    const values = getUniqueValues(currentFilterType);
    values.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      filterValue.appendChild(opt);
    });
  }
  filterValue.value = '';
  currentFilterValue = '';
  applyFiltersAndRender();
}

// Event listeners
searchInput.addEventListener('input', () => {
  applyFiltersAndRender();
});

filterType.addEventListener('change', () => {
  populateFilterValues();
});

filterValue.addEventListener('change', () => {
  currentFilterValue = filterValue.value;
  applyFiltersAndRender();
});

sortType.addEventListener('change', () => {
  currentSort = sortType.value;
  applyFiltersAndRender();
});

randomSongBtn.addEventListener('click', () => {
  if (allSongs.length === 0) return;
  const randomIndex = Math.floor(Math.random() * filteredSongs.length || allSongs.length);
  const song = filteredSongs[randomIndex] || allSongs[randomIndex];
  goToSong(song);
});

// Initialization
async function init() {
  await loadSongs();
  if (allSongs.length === 0) return;
  renderStats();
  renderAlphabet();
  renderFeaturedSong();
  populateFilterValues(); // this sets currentFilterType based on select value
  applyFiltersAndRender();
}

init();
