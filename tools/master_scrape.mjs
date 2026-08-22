import { writeFileSync, mkdirSync, readFileSync, existsSync, appendFileSync } from 'fs';
import { load } from 'cheerio';

const BASE_URL = 'https://m3db.com';
const YEAR_LIST_URL = 'https://m3db.com/archive/lyrics/year';
const DELAY_BETWEEN_SONGS = 2000; // 2 seconds
const DELAY_BETWEEN_YEARS = 5000; // 5 seconds
const MAX_RETRIES = 3;
const LOG_FILE = 'scrape_log.txt';

async function fetchPage(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (response.status === 429) {
        console.log(`   ⚠️ Rate limited, waiting 15s...`);
        await sleep(15000);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (err) {
      lastError = err;
      console.log(`   ⚠️ Attempt ${attempt} failed: ${err.message}. Waiting ${attempt * 5}s...`);
      await sleep(attempt * 5000);
    }
  }
  throw lastError;
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

function logMessage(message) {
  console.log(message);
  appendFileSync(LOG_FILE, message + '\n', 'utf8');
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

async function processYear(yearUrl) {
  logMessage(`\n📅 Processing year: ${yearUrl}`);
  const yearHtml = await fetchPage(yearUrl);
  const $ = load(yearHtml);

  const linksSet = new Set();
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/lyric/')) {
      const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
      linksSet.add(fullUrl);
    }
  });

  const songUrls = [...linksSet];
  logMessage(`Found ${songUrls.length} songs in this year.`);

  let success = 0, skipped = 0, failed = 0;

  for (let i = 0; i < songUrls.length; i++) {
    const url = songUrls[i];
    const id = url.split('/').pop();
    const lyricsFile = `data/lyrics/${id}.json`;

    if (existsSync(lyricsFile)) {
      logMessage(`⏭️  [${i+1}/${songUrls.length}] Already exists: ${id}`);
      skipped++;
      continue;
    }

    try {
      logMessage(`🎵 [${i+1}/${songUrls.length}] Scraping: ${id}`);
      const song = await scrapeSong(url);
      logMessage(`   ✅ Saved: ${song.songName} (${song.year})`);
      success++;
    } catch (err) {
      logMessage(`   ❌ Failed: ${id} - ${err.message}`);
      failed++;
    }

    if (i < songUrls.length - 1) {
      await sleep(DELAY_BETWEEN_SONGS);
    }
  }

  logMessage(`Year complete: success=${success}, skipped=${skipped}, failed=${failed}`);
}

async function main() {
  logMessage('=== Master Scraper Started ===');
  logMessage('Fetching year list...');
  const yearListHtml = await fetchPage(YEAR_LIST_URL);
  const $ = load(yearListHtml);

  const yearUrls = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/archive/lyrics/year/')) {
      const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
      yearUrls.push(fullUrl);
    }
  });

  const uniqueYears = [...new Set(yearUrls)];
  logMessage(`Found ${uniqueYears.length} year archives.`);

  // Optional: process only a subset for testing
  // uniqueYears = uniqueYears.slice(0, 3);

  for (let i = 0; i < uniqueYears.length; i++) {
    const yearUrl = uniqueYears[i];
    try {
      await processYear(yearUrl);
    } catch (err) {
      logMessage(`❌ Failed to process year ${yearUrl}: ${err.message}`);
    }

    if (i < uniqueYears.length - 1) {
      logMessage(`\n⏳ Waiting ${DELAY_BETWEEN_YEARS/1000}s before next year...\n`);
      await sleep(DELAY_BETWEEN_YEARS);
    }
  }

  logMessage('\n=== Master Scraper Finished ===');
  const totalSongs = Object.keys(JSON.parse(readFileSync('data/index.json', 'utf8'))).length;
  logMessage(`Total songs in index: ${totalSongs}`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  appendFileSync(LOG_FILE, '❌ Fatal error: ' + err.message + '\n', 'utf8');
});
