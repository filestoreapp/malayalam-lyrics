async function loadIndex() {
  const response = await fetch('data/index.json');
  return await response.json();
}

function renderSongCard(song) {
  const card = document.createElement('div');
  card.className = 'song-card';
  card.innerHTML = `
    <h3>${song.songName}</h3>
    <p>Film: ${song.film}</p>
    <p>Lyricist: ${song.lyricist}</p>
    <p>Music: ${song.musicDirector}</p>
    <p>Singer(s): ${song.singers}</p>
    <p>Year: ${song.year}</p>
  `;
  card.addEventListener('click', () => {
    window.location.href = `song.html?id=${song.id}`;
  });
  return card;
}

function getFilterValues(songs, type) {
  const values = new Set();
  songs.forEach(song => {
    const value = song[type];
    if (value) values.add(value);
  });
  return Array.from(values).sort();
}

async function init() {
  const songsObj = await loadIndex();
  const songs = Object.values(songsObj);
  const listEl = document.getElementById('songList');
  const countEl = document.getElementById('songCount');
  const searchInput = document.getElementById('searchInput');
  const filterType = document.getElementById('filterType');
  const filterValue = document.getElementById('filterValue');

  function updateList() {
    const query = searchInput.value.toLowerCase().trim();
    const type = filterType.value;
    const value = filterValue.value;

    const filtered = songs.filter(song => {
      const matchesSearch = !query ||
        song.songName.toLowerCase().includes(query) ||
        song.film.toLowerCase().includes(query) ||
        song.lyricist.toLowerCase().includes(query) ||
        song.musicDirector.toLowerCase().includes(query) ||
        song.singers.toLowerCase().includes(query) ||
        song.year.includes(query);

      const matchesFilter = type === 'all' || value === '' || song[type] === value;

      return matchesSearch && matchesFilter;
    });

    listEl.innerHTML = '';
    filtered.forEach(song => listEl.appendChild(renderSongCard(song)));
    countEl.textContent = `Showing ${filtered.length} of ${songs.length} songs`;
  }

  // Populate filter value dropdown based on type
  function populateFilterValues() {
    const type = filterType.value;
    filterValue.innerHTML = '<option value="">All</option>';
    if (type !== 'all') {
      const values = getFilterValues(songs, type);
      values.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        filterValue.appendChild(opt);
      });
    }
  }

  searchInput.addEventListener('input', updateList);
  filterType.addEventListener('change', () => {
    populateFilterValues();
    updateList();
  });
  filterValue.addEventListener('change', updateList);

  populateFilterValues();
  updateList();
}

init();
