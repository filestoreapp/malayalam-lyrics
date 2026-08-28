const ITEMS_PER_PAGE = 50; // movies per page

let allMovies = [];
let filteredMovies = [];
let currentPage = 1;
let searchQuery = '';

const movieSearch = document.getElementById('movieSearch');
const movieList = document.getElementById('movieList');
const movieCount = document.getElementById('movieCount');

// Load data
async function loadData() {
  try {
    const response = await fetch('data/index.json');
    const data = await response.json();
    const songs = Object.values(data);

    // Extract unique movies
    const movieMap = new Map();
    songs.forEach(song => {
      const film = song.film || 'Unknown';
      if (!movieMap.has(film)) {
        movieMap.set(film, {
          film,
          year: song.year || '',
          songs: []
        });
      }
      movieMap.get(film).songs.push(song);
    });

    allMovies = Array.from(movieMap.values());
    return allMovies;
  } catch (err) {
    console.error('Failed to load data', err);
    movieList.innerHTML = '<p>Error loading movies.</p>';
    return [];
  }
}

// Create movie card
function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'song-card'; // reuse existing card style
  card.innerHTML = `
    <h3>${movie.film}</h3>
    <p>Year: ${movie.year}</p>
    <p>Songs: ${movie.songs.length}</p>
  `;
  card.addEventListener('click', () => {
    window.location.href = `movie.html?film=${encodeURIComponent(movie.film)}`;
  });
  return card;
}

// Render movies with pagination
function renderMovies() {
  movieList.innerHTML = '';
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = Math.min(start + ITEMS_PER_PAGE, filteredMovies.length);
  const pageMovies = filteredMovies.slice(start, end);

  if (pageMovies.length === 0) {
    movieList.innerHTML = '<p style="grid-column:1/-1; text-align:center;">No movies found.</p>';
  } else {
    pageMovies.forEach(movie => movieList.appendChild(createMovieCard(movie)));
  }

  movieCount.textContent = `Showing ${start + 1}-${end} of ${filteredMovies.length} movies`;
  renderPagination();
}

// Pagination
function renderPagination() {
  const totalPages = Math.ceil(filteredMovies.length / ITEMS_PER_PAGE);
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination';
  paginationDiv.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderMovies();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationDiv.appendChild(prevBtn);

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
      renderMovies();
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
      renderMovies();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationDiv.appendChild(nextBtn);

  // Remove old pagination if exists
  const oldPagination = document.querySelector('.pagination');
  if (oldPagination) oldPagination.remove();
  movieList.after(paginationDiv);
}

// Filter movies by search
function applySearch() {
  searchQuery = movieSearch.value.toLowerCase().trim();
  filteredMovies = allMovies.filter(movie =>
    movie.film.toLowerCase().includes(searchQuery) ||
    movie.year.includes(searchQuery)
  );
  currentPage = 1;
  renderMovies();
}

movieSearch.addEventListener('input', applySearch);

// Init
async function init() {
  await loadData();
  filteredMovies = allMovies;
  renderMovies();
}

init();
