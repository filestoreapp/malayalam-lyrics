import { readFileSync } from 'fs';
import { load } from 'cheerio';

console.log('Analyzing saved HTML...');
const html = readFileSync('debug/sample.html', 'utf8');
const $ = load(html);

$('script, style').remove();

const candidates = [];
$('body *').each((i, el) => {
  const text = $(el).text().trim();
  if (text.length > 80) {
    candidates.push({
      tag: el.tagName,
      id: $(el).attr('id') || '',
      cls: $(el).attr('class') || '',
      text: text.substring(0, 300).replace(/\s+/g, ' '),
      length: text.length
    });
  }
});

candidates.sort((a, b) => b.length - a.length);

console.log(`\nFound ${candidates.length} elements with text > 80 chars.\n`);
console.log('--- Top 30 longest text elements ---\n');
for (let i = 0; i < Math.min(30, candidates.length); i++) {
  const c = candidates[i];
  console.log(`#${i+1} <${c.tag}> id="${c.id}" class="${c.cls}" length=${c.length}`);
  console.log(`  Text: ${c.text}\n`);
}
