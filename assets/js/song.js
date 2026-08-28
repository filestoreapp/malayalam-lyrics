let currentSong = null;
let siblingSongs = [];
let fontSize = 19;

async function loadSong() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const year = params.get('year') || 'unknown';
  const lyricsEl = document.getElementById('lyricsContent');

  if (!id) {
    lyricsEl.textContent = 'Song ID missing.';
    return;
  }

  try {
    const response = await fetch(`data/lyrics/${encodeURIComponent(year)}/${id}.json`);
    if (!response.ok) throw new Error('Song not found');
    const song = await response.json();
    currentSong = song;

    document.title = `${song.songName} · Malayalam Lyrics Archive`;
    document.getElementById('songTitle').textContent = song.songName;
    document.getElementById('songSubtitle').textContent = `${song.film || ''}${song.year ? ' · ' + song.year : ''}`;

    document.getElementById('crumbMovie').textContent = song.film || '…';
    document.getElementById('crumbMovie').href = `movie.html?film=${encodeURIComponent(song.film || '')}`;
    document.getElementById('crumbSong').textContent = song.songName;

    document.getElementById('songVinyl').innerHTML = vinylSVG(84);

    const chips = [];
    if (song.lyricist) chips.push(`<span class="meta-chip">Lyrics: <b>${escapeHtml(song.lyricist)}</b></span>`);
    if (song.musicDirector) chips.push(`<span class="meta-chip">Music: <b>${escapeHtml(song.musicDirector)}</b></span>`);
    if (song.singers) chips.push(`<span class="meta-chip">Singer(s): <b>${escapeHtml(song.singers)}</b></span>`);
    document.getElementById('songMeta').innerHTML = chips.join('');

    // Use textContent to preserve line breaks safely (rely on CSS white-space: pre-line)
    lyricsEl.textContent = song.lyrics;
    lyricsEl.style.fontSize = fontSize + 'px';

    setupFavButton(song);
    loadSiblingSongs(song);
  } catch (error) {
    lyricsEl.textContent = "Sorry, this song couldn't be loaded.";
    console.error(error);
  }
}

function setupFavButton(song) {
  const btn = document.getElementById('favToggleBtn');
  const refresh = () => {
    const fav = isFavorite(song.id);
    btn.textContent = fav ? '♥ Saved' : '♡ Save';
    btn.classList.toggle('active', fav);
  };
  refresh();
  btn.onclick = () => {
    toggleFavorite(song);
    refresh();
  };
}

async function loadSiblingSongs(song) {
  const navEl = document.getElementById('songNav');
  if (!song.film) { navEl.innerHTML = ''; return; }
  try {
    const response = await fetch('data/index.json');
    const data = await response.json();
    siblingSongs = Object.values(data).filter(s => s.film === song.film);
    const idx = siblingSongs.findIndex(s => String(s.id) === String(song.id));
    if (idx === -1) { navEl.innerHTML = ''; return; }

    const prev = siblingSongs[idx - 1];
    const next = siblingSongs[idx + 1];
    navEl.innerHTML = `
      ${prev ? `<a class="song-nav-btn prev-btn" href="song.html?id=${encodeURIComponent(prev.id)}&year=${encodeURIComponent(prev.year || 'unknown')}">
        <span class="nav-label">← Previous</span><span class="nav-title">${escapeHtml(prev.songName)}</span>
      </a>` : '<div></div>'}
      ${next ? `<a class="song-nav-btn next-btn" href="song.html?id=${encodeURIComponent(next.id)}&year=${encodeURIComponent(next.year || 'unknown')}">
        <span class="nav-label">Next →</span><span class="nav-title">${escapeHtml(next.songName)}</span>
      </a>` : '<div></div>'}
    `;
  } catch (e) {
    navEl.innerHTML = '';
  }
}

document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!currentSong) return;
  const text = `${currentSong.songName}\n${currentSong.film || ''}\n\n${currentSong.lyrics}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Lyrics copied');
  } catch (e) {
    showToast('Could not copy — try selecting the text manually');
  }
});

document.getElementById('shareBtn').addEventListener('click', async () => {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: currentSong?.songName || 'Malayalam song lyrics', url });
    } catch (e) { /* user cancelled */ }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    } catch (e) {
      showToast('Could not copy link');
    }
  }
});

document.getElementById('printBtn').addEventListener('click', () => window.print());

document.getElementById('fontPlus').addEventListener('click', () => {
  fontSize = Math.min(fontSize + 2, 32);
  document.getElementById('lyricsContent').style.fontSize = fontSize + 'px';
});

document.getElementById('fontMinus').addEventListener('click', () => {
  fontSize = Math.max(fontSize - 2, 14);
  document.getElementById('lyricsContent').style.fontSize = fontSize + 'px';
});

loadSong();
