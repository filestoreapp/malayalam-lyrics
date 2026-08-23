import { writeFileSync, mkdirSync, readFileSync, existsSync, appendFileSync } from 'fs';
import { load } from 'cheerio';

const BASE_URL = 'https://m3db.com';
const YEAR_LIST_URL = 'https://m3db.com/archive/lyrics/year';
const DELAY_BETWEEN_SONGS = 2000;
const DELAY_BETWEEN_YEARS = 5000;
const DELAY_BETWEEN_PAGES = 3000;
const MAX_RETRIES = 3;
const LOG_FILE = 'scrape_log.txt';

const requestedYears = process.argv.slice(2);
const onlySpecificYears = requestedYears.length > 0;

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

function extractLyricsWithLineBreaks($, selector) {
  const html = $(selector).html() || '';
  if (!html) return '';

  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/\u200d/g, '');
  return text.trim();
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
  const lyrics = extractLyricsWithLineBreaks($, '#protectedText') ||
                 extractLyricsWithLineBreaks($, '.field-name-body .field-item');
  const music = extractList($, '.field-name-field-music');
  const lyricist = extractList($, '.field-name-field-lyricist');
  const singers = extractList($, '.field-name-field-singer');
  const film = extractList($, '.field-name-field-film');
  const yearField = extractText($, '.field-name-field-year');
  const year = yearField.replace(/^Year:\s*/i, '').trim();

  // Determine folder name: year or 'unknown'
  const folderName = year || 'unknown';

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

  // Save lyrics in year-based folder
  const lyricsDir = `data/lyrics/${folderName}`;
  mkdirSync(lyricsDir, { recursive: true });
  const lyricsFile = `${lyricsDir}/${id}.json`;
  writeFileSync(lyricsFile, JSON.stringify(songData, null, 2), 'utf8');

  // Update index (same for all, flat index.json)
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
  let currentPageUrl = yearUrl;
  let pageNum = 1;
  let allSongUrls = new Set();

  while (currentPageUrl) {
    logMessage(`   Page ${pageNum}: ${currentPageUrl}`);
    const html = await fetchPage(currentPageUrl);
    const $ = load(html);

    const pageLinks = new Set();
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('/lyric/')) {
        const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
        pageLinks.add(fullUrl);
      }
    });

    if (pageLinks.size === 0) {
      logMessage(`   No songs found on page ${pageNum}. Stopping pagination.`);
      break;
    }

    const previousSize = allSongUrls.size;
    pageLinks.forEach(link => allSongUrls.add(link));
    logMessage(`   Found ${pageLinks.size} songs on this page. Total unique so far: ${allSongUrls.size}`);

    let nextPageUrl = null;
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().toLowerCase();
      if (href.match(/[?&]page=\d+/) && text.match(/next|»|›|more|അടുത്തത്/i)) {
        const resolved = href.startsWith('http') ? href : BASE_URL + href;
        nextPageUrl = resolved;
        return false;
      }
    });

    if (!nextPageUrl && pageNum === 1) {
      if (pageLinks.size >= 500) {
        const sep = yearUrl.includes('?') ? '&' : '?';
        nextPageUrl = `${yearUrl}${sep}page=2`;
        logMessage(`   Guessing next page URL: ${nextPageUrl}`);
      }
    }

    if (nextPageUrl) {
      currentPageUrl = nextPageUrl;
      pageNum++;
      await sleep(DELAY_BETWEEN_PAGES);
    } else {
      currentPageUrl = null;
    }
  }

  const songUrls = [...allSongUrls];
  logMessage(`Total songs to scrape for this year: ${songUrls.length}`);

  let success = 0, skipped = 0, failed = 0;

  for (let i = 0; i < songUrls.length; i++) {
    const url = songUrls[i];
    const id = url.split('/').pop();
    // Check if file exists in any year folder (we don't know year yet without fetching)
    // We'll fetch the song page to get year; but to skip, we need to check if any file with this id exists.
    // Simpler: try to find in index first; if index has id, assume done.
    // But index may be updated after each song, so we can use index to skip.
    const indexFile = 'data/index.json';
    if (existsSync(indexFile)) {
      const index = JSON.parse(readFileSync(indexFile, 'utf8'));
      if (index[id]) {
        logMessage(`⏭️  [${i+1}/${songUrls.length}] Already exists in index: ${id}`);
        skipped++;
        continue;
      }
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

  let yearUrls = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/archive/lyrics/year/')) {
      const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
      yearUrls.push(fullUrl);
    }
  });

  let uniqueYears = [...new Set(yearUrls)];

  if (onlySpecificYears) {
    uniqueYears = uniqueYears.filter(url => {
      const yearPart = url.split('/').pop();
      return requestedYears.includes(yearPart);
    });
    logMessage(`Filtered to years: ${requestedYears.join(', ')}`);
  }

  logMessage(`Found ${uniqueYears.length} year archives to process.`);

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
