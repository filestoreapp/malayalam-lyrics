import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const lyricsDir = 'data/lyrics';
const indexFile = 'data/index.json';

try {
  const files = readdirSync(lyricsDir).filter(f => f.endsWith('.json'));
  const index = {};

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(lyricsDir, file), 'utf8'));
    const { id, songName, film, lyricist, musicDirector, singers, year } = data;
    index[id] = { id, songName, film, lyricist, musicDirector, singers, year };
  }

  writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf8');
  console.log(`Index built with ${Object.keys(index).length} songs.`);
} catch (err) {
  console.error('Error building index:', err.message);
  process.exit(1);
}
