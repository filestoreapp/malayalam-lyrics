async function loadSong() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const year = params.get('year') || 'unknown';
  if (!id) {
    document.getElementById('lyricsContent').textContent = 'Song ID missing.';
    return;
  }

  try {
    const response = await fetch(`data/lyrics/${encodeURIComponent(year)}/${id}.json`);
    if (!response.ok) throw new Error('Song not found');
    const song = await response.json();

    document.title = `${song.songName} - Lyrics`;
    document.getElementById('songTitle').textContent = song.songName;

    document.getElementById('songMeta').innerHTML = `
      <p><strong>Film:</strong> ${song.film}</p>
      <p><strong>Lyricist:</strong> ${song.lyricist}</p>
      <p><strong>Music:</strong> ${song.musicDirector}</p>
      <p><strong>Singer(s):</strong> ${song.singers}</p>
      ${song.year ? `<p><strong>Year:</strong> ${song.year}</p>` : ''}
    `;

    // Use textContent to preserve \n and rely on CSS white-space: pre-line
    document.getElementById('lyricsContent').textContent = song.lyrics;
  } catch (error) {
    document.getElementById('lyricsContent').textContent = error.message;
  }
}

loadSong();
