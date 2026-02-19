// Extracts INITIAL_LINEUPS from initialData.js and saves as scripts/lineups.json
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import the data
const { INITIAL_LINEUPS } = await import('../src/data/initialData.js');

const outPath = join(__dirname, 'lineups.json');
writeFileSync(outPath, JSON.stringify(INITIAL_LINEUPS, null, 2));
console.log(`✅ Extracted ${INITIAL_LINEUPS.length} lineups to scripts/lineups.json`);
