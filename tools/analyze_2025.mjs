import { writeFileSync, mkdirSync } from 'fs';
import { load } from 'cheerio';

const ARCHIVE_URL = 'https://m3db.com/archive/lyrics/year/2025';

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
  console.log('Fetching:', ARCHIVE_URL);
  const html = await fetchPage(ARCHIVE_URL);

  mkdirSync('debug', { recursive: true });
  writeFileSync('debug/archive_2025.html', html, 'utf8');
  console.log('✅ HTML saved to debug/archive_2025.html\n');

  const $ = load(html);

  console.log('Page Title:', $('title').text().trim());
  console.log('H1:', $('h1').first().text().trim());

  const links = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/lyric/')) {
      links.push(href);
    }
  });

  const unique = [...new Set(links)];
  console.log(`\nFound ${unique.length} unique lyric links on this page.\n`);
  console.log('--- First 50 lyric links ---\n');
  unique.slice(0, 50).forEach(link => console.log(link));

  console.log('\n--- Pagination links (containing "page" or "?page") ---\n');
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (href.match(/page|paged|\?page/i) || text.match(/next|»|last|next ›/i)) {
      console.log(`Text: "${text}" -> href: ${href}`);
    }
  });

  console.log('\n--- Done ---');
} catch (error) {
  console.error('❌ Error:', error.message);
}
