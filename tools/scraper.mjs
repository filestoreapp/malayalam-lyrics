import { writeFileSync, mkdirSync } from 'fs';
import { load } from 'cheerio';

console.log('Script started...');

const SAMPLE_URL = 'https://m3db.com/lyric/ammapputhappe';

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

try {
  console.log('Fetching:', SAMPLE_URL);
  const html = await fetchPage(SAMPLE_URL);

  mkdirSync('debug', { recursive: true });
  writeFileSync('debug/sample.html', html, 'utf8');
  console.log('✅ HTML saved to debug/sample.html\n');

  const $ = load(html);

  console.log('Page Title:', $('title').text().trim());
  console.log('H1:', $('h1').first().text().trim());
  console.log('H2:', $('h2').first().text().trim());

  const selectors = [
    '.lyric', '.lyrics', '#lyric', '#lyrics', '.song-lyrics',
    '.lyric-content', '.entry-content', 'article', '.content',
    '.lyric_text', '.lyrics_text', '.song_lyrics',
  ];

  console.log('\n--- Checking possible lyrics selectors ---');
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length > 0) {
      const text = el.first().text().trim();
      console.log(`✔ Found: ${sel} (${el.length} elements)`);
      console.log('  Preview:', text.substring(0, 150).replace(/\n/g, ' '));
      console.log('');
    }
  }

  console.log('--- Done ---');
} catch (error) {
  console.error('❌ Error:', error.message);
}
