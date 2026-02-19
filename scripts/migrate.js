// Migration script: uploads JBBC data to Firestore via REST API
// Run with: node scripts/migrate.js
import 'dotenv/config';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Firestore REST helpers ────────────────────────────────────────────────────
function toFirestore(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestore) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestore(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

async function setDoc(path, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestore(v);
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Failed to write ${path}: ${await res.text()}`);
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c.slice(0, 4) + '-' + c.slice(4);
}

// ── Members data ──────────────────────────────────────────────────────────────
const MEMBERS = [
  { id: 'mem-beng',     name: 'Ate Beng',   nickname: 'Ate Beng',     roles: ['Vocalist'], isTeamA: true },
  { id: 'mem-zarie',    name: 'Ate Zarie',  nickname: 'Ate Zarie',    roles: ['Vocalist'], isTeamA: true },
  { id: 'mem-lito',     name: 'Kuya Lito',  nickname: 'Kuya Lito',    roles: ['Vocalist'], isTeamA: true },
  { id: 'mem-meo',      name: 'Kuya Meo',   nickname: 'Kuya Meo',     roles: ['Vocalist', 'Sound Engineer'], isTeamA: true },
  { id: 'mem-nems',     name: 'Ate Nems',   nickname: 'Ate Nems',     roles: ['Vocalist'], isTeamA: true },
  { id: 'mem-aljune',   name: 'Aljune',     nickname: 'Aljune',       roles: ['Vocalist', 'Sound Engineer'], isTeamA: false },
  { id: 'mem-jasper',   name: 'Jasper',     nickname: 'Japs',         roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-miho',     name: 'Miho',       nickname: 'Miho',         roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-shana',    name: 'Shana',      nickname: 'Shana',        roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-rc',       name: 'RC',         nickname: 'RC',           roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-khrizzy',  name: 'Khrizzy',    nickname: 'Khrizzy',      roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-myk',      name: 'Myk',        nickname: 'Myk',          roles: ['Vocalist', 'Bass', 'Guitar'], isTeamA: false },
  { id: 'mem-princess', name: 'Princess',   nickname: 'Princess',     roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-intet',    name: 'Intet',      nickname: 'Intet',        roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-malou',    name: 'Malou',      nickname: 'Malou',        roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-mac',      name: 'Mac',        nickname: 'Mac / Macmac', roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-nissi',    name: 'Nissi',      nickname: 'Nissi',        roles: ['Vocalist', 'Bass'], isTeamA: false },
  { id: 'mem-lalaine',  name: 'Lalaine',    nickname: 'Lalaine',      roles: ['Vocalist'], isTeamA: false },
  { id: 'mem-anjie',    name: 'Anjie',      nickname: 'Anjie',        roles: ['Keyboard'], isTeamA: false },
  { id: 'mem-jireh',    name: 'Jireh',      nickname: 'Jireh',        roles: ['Keyboard'], isTeamA: false },
  { id: 'mem-cj',       name: 'CJ',         nickname: 'CJ',           roles: ['Keyboard'], isTeamA: false },
  { id: 'mem-job',      name: 'Job',        nickname: 'Job',          roles: ['Bass', 'Vocalist'], isTeamA: false },
  { id: 'mem-thony',    name: 'Thony',      nickname: 'Thony',        roles: ['Bass', 'Guitar', 'Vocalist'], isTeamA: false },
  { id: 'mem-elvin',    name: 'Elvin',      nickname: 'Elvin',        roles: ['Guitar'], isTeamA: false },
  { id: 'mem-joril',    name: 'Joril',      nickname: 'Joril',        roles: ['Guitar', 'Drums'], isTeamA: false },
  { id: 'mem-jm',       name: 'JM',         nickname: 'JM',           roles: ['Guitar', 'Drums'], isTeamA: false },
  { id: 'mem-janful',   name: 'Janful',     nickname: 'Janful',       roles: ['Guitar'], isTeamA: false },
  { id: 'mem-dave',     name: 'Dave',       nickname: 'Dave',         roles: ['Drums'], isTeamA: false },
  { id: 'mem-samm',     name: 'Samm',       nickname: 'Samm',         roles: ['Drums'], isTeamA: false },
  { id: 'mem-travis',   name: 'Travis',     nickname: 'Travis',       roles: ['Drums'], isTeamA: false },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!PROJECT_ID) throw new Error('VITE_FIREBASE_PROJECT_ID not set in .env');

  // Extract lineups from initialData.js
  const lineupsPath = join(__dirname, 'lineups.json');
  if (!existsSync(lineupsPath)) {
    console.log('Extracting lineups from initialData.js...');
    execSync('node scripts/extract-lineups.mjs', { stdio: 'inherit', cwd: join(__dirname, '..') });
  }
  const LINEUPS = JSON.parse(readFileSync(lineupsPath, 'utf8'));

  console.log('🚀 Migrating JBBC data to Firestore...');
  console.log(`   Project: ${PROJECT_ID}\n`);

  const inviteCode = generateInviteCode();
  const TEAM_ID = 'jbbc-main';

  // 1. Create team doc
  await setDoc(`teams/${TEAM_ID}`, {
    name: 'JBBC Music Team',
    createdBy: 'mlparaiso@gmail.com',
    createdByEmail: 'mlparaiso@gmail.com',
    inviteCode,
    adminUids: [],
    createdAt: new Date().toISOString(),
  });
  console.log(`✅ Team created  |  Invite Code: ${inviteCode}`);

  // 2. Upload members
  process.stdout.write(`👥 Uploading ${MEMBERS.length} members `);
  for (const m of MEMBERS) {
    await setDoc(`teams/${TEAM_ID}/members/${m.id}`, m);
    process.stdout.write('.');
  }
  console.log(' done');

  // 3. Upload lineups
  process.stdout.write(`📅 Uploading ${LINEUPS.length} lineups `);
  for (const l of LINEUPS) {
    await setDoc(`teams/${TEAM_ID}/lineups/${l.id}`, l);
    process.stdout.write('.');
  }
  console.log(' done');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ Migration complete!`);
  console.log(`🔑 YOUR INVITE CODE: ${inviteCode}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Next: Sign in with Google → "Join with invite code" → enter the code above');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
