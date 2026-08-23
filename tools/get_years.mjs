import { load } from 'cheerio';

const url = 'https://m3db.com/archive/lyrics/year';
const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0',
  },
});
const html = await res.text();
const $ = load(html);
const years = new Set();

$('a').each((i, el) => {
  const href = $(el).attr('href') || '';
  const match = href.match(/\/archive\/lyrics\/year\/(\d+)/);
  if (match) {
    years.add(match[1]);
  }
});

console.log([...years].join(' '));
