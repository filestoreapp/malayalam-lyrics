import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const lyricsDir = 'data/lyrics';
const files = readdirSync(lyricsDir).filter(f => f.endsWith('.json'));

function addLineBreaks(text) {
  // Patterns that likely indicate a new line in Malayalam lyrics
  const breakBeforePatterns = [
    /\(2\)/g,
    /\(3\)/g,
    /\(4\)/g,
    /\(കോറസ്സ്\)/g,
    /\(കോറസ്സിനൊപ്പം\)/g,
    /\(ചരണം\)/g,
    /\(പല്ലവി\)/g,
    /\(അനുപല്ലവി\)/g,
    /\- 2/g,
    /\- 3/g,
    /\- 4/g,
    /ആ\.\.\./g,
    /അ\.\.\./g,
  ];

  // Insert newline before these patterns
  breakBeforePatterns.forEach(pattern => {
    text = text.replace(pattern, (match) => `\n${match}`);
  });

  // Insert newline after sentence-ending punctuation if followed by space and a Malayalam letter
  text = text.replace(/([.!?])\s+(?=[അ-ഹ])/g, '$1\n');

  // Clean up multiple newlines
  text = text.replace(/\n{2,}/g, '\n').trim();
  return text;
}

let processed = 0;
for (const file of files) {
  const filePath = join(lyricsDir, file);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  if (data.lyrics && data.lyrics.includes('\n') === false) {
    data.lyrics = addLineBreaks(data.lyrics);
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    processed++;
  }
}

console.log(`✅ Formatting complete. Updated ${processed} songs.`);
