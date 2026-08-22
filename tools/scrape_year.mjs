import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { load } from 'cheerio';

const BASE_URL = 'https://m3db.com';
const DELAY_MS = 2000;
const YEAR = process.argv[2];

if (!YEAR) {
  console.error('Usage: node tools/scrape_year.mjs <year>');
  process.exit(1);
}

const YEAR_URL = `https://m3db.com/archive/lyrics/year/${YEAR}`;

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
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

function extractLyrics($) {
  const lyricsEl = $('.field-name-body .field-item').first();
  if (!lyricsEl.length) return '';
  let html = lyricsEl.html() || '';
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<\/(p|div)>/gi, '\n');
  html = html.replace(/<[^>]+>/g, '');
  const $decoded = load('<div>' + html + '</div>');
  return $decoded('div').text().trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeSong(url) {
  const html = await fetchPage(url);
  const $ = load(html);
  const id = url.split('/').pop();
  const songName = extractText($, 'h1');
  const lyrics = extractLyrics($);
  const music = extractList($, '.field-name-field-music');
  const lyricist = extractList($, '.field-name-field-lyricist');
  const singers = extractList($, '.field-name-field-singer');
  const film = extractList($, '.field-name-field-film');
  const yearField = extractText($, '.field-name-field-year');
  const year = yearField.replace(/^Year:\s*/i, '').trim();

  return {
    id,
    songName,
    film: film.join(', '),
    lyricist: lyricist.join(', '),
    musicDirector: music.join(', '),
    singers: singers.join(', '),
    year: year || '',
    lyrics
  };
}

try {
  console.log(`Processing year ${YEAR}...`);
  const yearHtml = await fetchPage(YEAR_URL);
  const $ = load(yearHtml);

  const linksSet = new Set();
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/lyric/')) {
      linksSet.add(href.startsWith('http') ? href : BASE_URL + href);
    }
  });

  const songUrls = [...linksSet];
  console.log(`Found ${songUrls.length} songs.`);

  mkdirSync('data/lyrics', { recursive: true });

  let success = 0, skipped = 0, failed = 0;

  for (let i = 0; i < songUrls.length; i++) {
    const url = songUrls[i];
    const id = url.split('/').pop();
    const file = `data/lyrics/${id}.json`;

    if (existsSync(file)) {
      console.log(`⏭️  [${i+1}/${songUrls.length}] Already exists: ${id}`);
      skipped++;
      continue;
    }

    try {
      console.log(`🎵 [${i+1}/${songUrls.length}] Scraping: ${id}`);
      const song = await scrapeSong(url);
      writeFileSync(file, JSON.stringify(song, null, 2), 'utf8');
      console.log(`   ✅ Saved: ${song.songName} (${song.year})`);
      success++;
    } catch (err) {
      console.error(`   ❌ Failed: ${id} - ${err.message}`);
      failed++;
    }

    if (i < songUrls.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nYear ${YEAR} complete: success=${success}, skipped=${skipped}, failed=${failed}`);
} catch (err) {
  console.error(`❌ Year ${YEAR} failed: ${err.message}`);
  process.exit(1);
}
