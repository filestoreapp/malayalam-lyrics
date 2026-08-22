import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { load } from 'cheerio';

const ARCHIVE_URL = process.argv[2] || 'https://m3db.com/archive/lyrics/year/2026';
const DELAY_MS = 2000; // 2 seconds between songs
const BASE_URL = 'https://m3db.com';

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
  if (items.length === 0) {
    const text = $(selector).text().trim().replace(/\s+/g, ' ');
    if (text) items.push(text);
  }
  return items;
}

function extractText($, selector) {
  return $(selector).text().trim().replace(/\s+/g, ' ');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeSong(songUrl) {
  const html = await fetchPage(songUrl);
  const $ = load(html);

  const id = songUrl.split('/').pop();
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

  return songData;
}

try {
  console.log('Fetching archive:', ARCHIVE_URL);
  const archiveHtml = await fetchPage(ARCHIVE_URL);
  const $ = load(archiveHtml);

  // Extract unique lyric links
  const linksSet = new Set();
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/lyric/')) {
      // Ensure absolute URL
      const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
      linksSet.add(fullUrl);
    }
  });

  const songUrls = [...linksSet];
  console.log(`Found ${songUrls.length} songs to scrape.\n`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < songUrls.length; i++) {
    const url = songUrls[i];
    const id = url.split('/').pop();
    const lyricsFile = `data/lyrics/${id}.json`;

    if (existsSync(lyricsFile)) {
      console.log(`⏭️  [${i+1}/${songUrls.length}] Already exists: ${id}`);
      skipCount++;
      continue;
    }

    try {
      console.log(`🎵 [${i+1}/${songUrls.length}] Scraping: ${id}`);
      const song = await scrapeSong(url);
      console.log(`   ✅ Saved: ${song.songName} (${song.year})`);
      successCount++;
    } catch (err) {
      console.error(`   ❌ Failed: ${id} - ${err.message}`);
      failCount++;
    }

    // Delay before next request
    if (i < songUrls.length - 1) {
      console.log(`   ⏳ Waiting ${DELAY_MS/1000}s...\n`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n--- Bulk Scrape Complete ---');
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Total songs in index: ${Object.keys(JSON.parse(readFileSync('data/index.json', 'utf8'))).length}`);
} catch (error) {
  console.error('❌ Archive error:', error.message);
}
