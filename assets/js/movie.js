async function loadSongsForMovie() {
  const params = new URLSearchParams(window.location.search);
  const film = params.get('film');
  const songList = document.getElementById('songList');

  if (!film) {
    songList.innerHTML = '<div class="empty-state">Movie not specified.</div>';
    return;
  }

  document.getElementById('crumbFilm').textContent = film;

  try {
    const response = await fetch('data/index.json');
    const data = await response.json();
    const songs = Object.values(data).filter(song => song.film === film);

    document.getElementById('movieTitle').textContent = film;
    const year = songs.find(s => s.year)?.year || '';
    document.getElementById('movieMeta').textContent =
      `${year ? year + ' · ' : ''}${songs.length} song${songs.length === 1 ? '' : 's'}`;
    document.title = `${film} · Malayalam Lyrics Archive`;

    songList.innerHTML = '';

    if (songs.length === 0) {
      songList.innerHTML = '<div class="empty-state">No songs found for this movie.</div>';
      return;
    }

    songs.forEach((song, i) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      row.style.setProperty('--i', i);
      const fav = isFavorite(song.id);
      row.innerHTML = `
        <div class="track-num">${i + 1}</div>
        <div class="track-info">
          <h3>${escapeHtml(song.songName)}</h3>
          <div class="meta-line">${escapeHtml(song.lyricist || '—')} · ${escapeHtml(song.singers || '—')}</div>
        </div>
        <button class="track-fav ${fav ? 'active' : ''}" aria-label="Toggle favourite">${fav ? '♥' : '♡'}</button>
      `;
      row.addEventListener('click', (e) => {
        if (e.target.closest('.track-fav')) return;
        const y = song.year || 'unknown';
        window.location.href = `song.html?id=${encodeURIComponent(song.id)}&year=${encodeURIComponent(y)}`;
      });
      row.querySelector('.track-fav').addEventListener('click', (e) => {
        const nowFav = toggleFavorite(song);
        e.currentTarget.classList.toggle('active', nowFav);
        e.currentTarget.textContent = nowFav ? '♥' : '♡';
      });
      songList.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading data', err);
    songList.innerHTML = '<div class="error-state">Error loading songs.</div>';
  }
}

loadSongsForMovie();
