async function loadMovies() {
  const response = await fetch('data/movies.json');
  if (!response.ok) throw new Error('Failed to load movies.json');
  return await response.json();
}

function createSongLink(song) {
  const a = document.createElement('a');
  a.href = `song.html?id=${song.id}`;
  a.textContent = song.songName;
  a.className = 'song-link';
  return a;
}

function renderMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';

  if (movie.poster) {
    const posterImg = document.createElement('img');
    posterImg.className = 'movie-poster';
    posterImg.src = movie.poster;
    posterImg.alt = movie.film;
    posterImg.loading = 'lazy';
    card.appendChild(posterImg);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'poster-placeholder';
    placeholder.textContent = '🎬';
    card.appendChild(placeholder);
  }

  const info = document.createElement('div');
  info.className = 'movie-info';

  const title = document.createElement('h3');
  title.className = 'movie-title';
  title.textContent = movie.film;
  info.appendChild(title);

  if (movie.year) {
    const year = document.createElement('p');
    year.className = 'movie-year';
    year.textContent = movie.year;
    info.appendChild(year);
  }

  const songsList = document.createElement('ul');
  songsList.className = 'song-list';
  movie.songs.forEach(song => {
    const li = document.createElement('li');
    li.appendChild(createSongLink(song));
    songsList.appendChild(li);
  });
  info.appendChild(songsList);

  card.appendChild(info);
  return card;
}

async function init() {
  const movies = await loadMovies();
  const listEl = document.getElementById('movieList');
  const countEl = document.getElementById('movieCount');
  const searchInput = document.getElementById('searchInput');

  function updateList() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = movies.filter(movie => {
      const haystack = (movie.film + ' ' + movie.year + ' ' + movie.songs.map(s => s.songName).join(' ')).toLowerCase();
      return haystack.includes(query);
    });

    listEl.innerHTML = '';
    filtered.forEach(movie => listEl.appendChild(renderMovieCard(movie)));
    countEl.textContent = `Showing ${filtered.length} of ${movies.length} movies`;
  }

  searchInput.addEventListener('input', updateList);
  updateList();
}

init().catch(err => {
  console.error(err);
  document.getElementById('movieList').textContent = 'Error loading movies. Please try again later.';
});
