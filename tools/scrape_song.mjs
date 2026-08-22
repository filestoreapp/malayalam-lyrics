import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { load } from 'cheerio';

const SAMPLE_URL = process.argv[2] || 'https://m3db.com/lyric/ammapputhappe';

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} - Status: ${response.status}`);
  }
  return await response.text();
}

function extractList($, selector) {
  const items = [];
  $(selector + ' .field-item').each((i, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text) items.push(text);
  });
  // If no .field-item, try direct text of the field
  if (items.length === 0) {
    const text = $(selector).text().trim().replace(/\s+/g, ' ');
    if (text) items.push(text);
  }
  return items;
}

function extractText($, selector) {
  return $(selector).text().trim().replace(/\s+/g, ' ');
}

try {
  console.log('Fetching:', SAMPLE_URL);
  const html = await fetchPage(SAMPLE_URL);
  const $ = load(html);

  const id = SAMPLE_URL.split('/').pop();
  const songName = extractText($, 'h1');
  const lyrics = extractText($, '.field-name-body .field-item');
  const music = extractList($, '.field-name-field-music');
  const lyricist = extractList($, '.field-name-field-lyricist');
  const singers = extractList($, '.field-name-field-singer');
  const film = extractList($, '.field-name-field-film');
  const yearField = extractText($, '.field-name-field-year');
  const year = yearField.replace(/^Year:\s*/i, '').trim();

  const songData = {
    id,
    songName,
    film: film.join(', '),
    lyricist: lyricist.join(', '),
    musicDirector: music.join(', '),
    singers: singers.join(', '),
    year: year || '',
    lyrics
  };

  // Save lyrics
  const lyricsDir = 'data/lyrics';
  mkdirSync(lyricsDir, { recursive: true });
  const lyricsFile = `${lyricsDir}/${id}.json`;
  writeFileSync(lyricsFile, JSON.stringify(songData, null, 2), 'utf8');
  console.log(`✅ Lyrics saved to ${lyricsFile}`);

  // Update index
  const indexFile = 'data/index.json';
  let index = {};
  if (existsSync(indexFile)) {
    index = JSON.parse(readFileSync(indexFile, 'utf8'));
  }
  index[id] = {
    id,
    songName,
    film: film.join(', '),
    lyricist: lyricist.join(', '),
    musicDirector: music.join(', '),
    singers: singers.join(', '),
    year: year || '',
  };
  mkdirSync('data', { recursive: true });
  writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf8');
  console.log(`✅ Index updated in ${indexFile}`);

  console.log('\n--- Extracted Data ---');
  console.log(JSON.stringify(songData, null, 2));
} catch (error) {
  console.error('❌ Error:', error.message);
}
