import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const lyricsDir = 'data/lyrics';
const outputFile = 'data/movies.json';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

if (!TMDB_API_KEY) {
  console.log('No TMDB_API_KEY set. Skipping poster fetch.');
  process.exit(0);
}

async function searchMovie(title, year) {
  const url = new URL('https://api.themoviedb.org/3/search/movie');
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('query', title);
  if (year) url.searchParams.set('year', year);
  url.searchParams.set('language', 'ml');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb API error: ${res.status}`);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    const movie = data.results[0];
    return movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '';
  }
  return '';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

try {
  const files = readdirSync(lyricsDir).filter(f => f.endsWith('.json'));
  const songsByFilm = {};

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(lyricsDir, file), 'utf8'));
    if (!data.film) continue;
    if (!songsByFilm[data.film]) {
      songsByFilm[data.film] = {
        film: data.film,
        year: data.year || '',
        songs: []
      };
    }
    songsByFilm[data.film].songs.push({
      id: data.id,
      songName: data.songName,
      lyricist: data.lyricist,
      musicDirector: data.musicDirector,
      singers: data.singers
    });
  }

  const filmNames = Object.keys(songsByFilm);
  console.log(`Found ${filmNames.length} unique films.`);

  const movies = [];
  for (let i = 0; i < filmNames.length; i++) {
    const film = filmNames[i];
    const entry = songsByFilm[film];
    console.log(`[${i+1}/${filmNames.length}] Searching TMDb for: ${film}`);
    try {
      const poster = await searchMovie(film, entry.year);
      movies.push({
        film,
        year: entry.year,
        poster,
        songs: entry.songs
      });
    } catch (err) {
      console.error(`   ❌ TMDb search failed for ${film}: ${err.message}`);
      movies.push({
        film,
        year: entry.year,
        poster: '',
        songs: entry.songs
      });
    }
    await sleep(300);
  }

  writeFileSync(outputFile, JSON.stringify(movies, null, 2), 'utf8');
  console.log(`✅ Saved ${movies.length} movies to ${outputFile}`);
} catch (err) {
  console.error('❌ Error in fetch_posters:', err.message);
  process.exit(1);
}
