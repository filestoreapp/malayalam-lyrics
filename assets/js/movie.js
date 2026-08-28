async function loadSongsForMovie() {
  const params = new URLSearchParams(window.location.search);
  const film = params.get('film');
  if (!film) {
    document.getElementById('songList').innerHTML = '<p>Movie not specified.</p>';
    return;
  }

  document.getElementById('movieTitle').textContent = film;

  try {
    const response = await fetch('data/index.json');
    const data = await response.json();
    const songs = Object.values(data).filter(song => song.film === film);

    const songList = document.getElementById('songList');
    songList.innerHTML = '';

    if (songs.length === 0) {
      songList.innerHTML = '<p>No songs found for this movie.</p>';
      return;
    }

    songs.forEach(song => {
      const card = document.createElement('div');
      card.className = 'song-card';
      card.innerHTML = `
        <h3>${song.songName}</h3>
        <p>Lyricist: ${song.lyricist}</p>
        <p>Music: ${song.musicDirector}</p>
        <p>Singer(s): ${song.singers}</p>
        <p>Year: ${song.year}</p>
      `;
      card.addEventListener('click', () => {
        const year = song.year || 'unknown';
        window.location.href = `song.html?id=${song.id}&year=${encodeURIComponent(year)}`;
      });
      songList.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading data', err);
    document.getElementById('songList').innerHTML = '<p>Error loading songs.</p>';
  }
}

loadSongsForMovie();
