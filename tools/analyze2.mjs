import { readFileSync } from 'fs';
import { load } from 'cheerio';

console.log('Analyzing metadata structure...');
const html = readFileSync('debug/sample.html', 'utf8');
const $ = load(html);

console.log('\n--- .group-header HTML ---\n');
console.log($('.group-header').html());

console.log('\n\n--- Elements with class containing "field-name-" ---\n');
$('[class*="field-name-"]').each((i, el) => {
  const cls = $(el).attr('class') || '';
  const text = $(el).text().trim().replace(/\s+/g, ' ');
  if (text.length > 0 && text.length < 500) {
    console.log(`\nClass: ${cls}`);
    console.log(`Tag: ${el.tagName}`);
    console.log(`Text: ${text}`);
  }
});

console.log('\n--- Done ---');
