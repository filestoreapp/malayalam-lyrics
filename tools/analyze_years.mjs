import { writeFileSync, mkdirSync } from 'fs';
import { load } from 'cheerio';

const YEAR_LIST_URL = 'https://m3db.com/archive/lyrics/year';

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
  console.log('Fetching year list:', YEAR_LIST_URL);
  const html = await fetchPage(YEAR_LIST_URL);

  mkdirSync('debug', { recursive: true });
  writeFileSync('debug/year_list.html', html, 'utf8');
  console.log('✅ HTML saved to debug/year_list.html\n');

  const $ = load(html);

  console.log('Page Title:', $('title').text().trim());
  console.log('H1:', $('h1').first().text().trim());

  // Find all links containing /archive/lyrics/year/
  const yearLinks = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/archive/lyrics/year/')) {
      yearLinks.push(href.startsWith('http') ? href : 'https://m3db.com' + href);
    }
  });

  const uniqueYears = [...new Set(yearLinks)];
  console.log(`\nFound ${uniqueYears.length} year archive links.\n`);
  console.log('--- Year links ---\n');
  uniqueYears.forEach(link => console.log(link));

  console.log('\n--- Done ---');
} catch (error) {
  console.error('❌ Error:', error.message);
}
