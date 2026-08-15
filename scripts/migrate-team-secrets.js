// One-time production migration: splits each team's inviteCode/adminUids/
// createdBy/createdByEmail off the public `teams/{id}` doc into a protected
// `teams/{id}/private/secrets` subdocument, and creates an `inviteCodes/{code}`
// lookup doc for each team — see firestore.rules for why (Firestore has no
// field-level read security, and the public team doc must stay world-readable
// for share links, so anything sensitive can't live there anymore).
//
// Idempotent: safe to re-run. Skips any team that's already migrated.
//
// Run this BEFORE deploying the new firestore.rules — the new rules assume
// every team already has a private/secrets doc.
//
// Usage:
//   node scripts/migrate-team-secrets.js path/to/serviceAccountKey.json
//
// Get a service account key from:
//   Firebase Console → Project Settings → Service Accounts → Generate new private key

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: node scripts/migrate-team-secrets.js path/to/serviceAccountKey.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function migrateTeam(teamDoc) {
  const teamId = teamDoc.id;
  const data = teamDoc.data();
  const summary = { teamId, name: data.name, secrets: 'skipped', inviteCodeDoc: 'skipped', publicDocCleaned: false };

  const secretsRef = db.doc(`teams/${teamId}/private/secrets`);
  const secretsSnap = await secretsRef.get();

  if (!secretsSnap.exists) {
    if (!data.inviteCode || !data.createdBy) {
      console.warn(`  ⚠ ${teamId}: no inviteCode/createdBy on the public doc and no existing secrets — skipping, check manually.`);
      return summary;
    }
    await secretsRef.set({
      inviteCode: data.inviteCode,
      adminUids: data.adminUids || [],
      createdBy: data.createdBy,
      createdByEmail: data.createdByEmail || null,
    });
    summary.secrets = 'created';
  }

  const inviteCode = secretsSnap.exists ? secretsSnap.data().inviteCode : data.inviteCode;
  if (inviteCode) {
    const codeRef = db.doc(`inviteCodes/${inviteCode}`);
    const codeSnap = await codeRef.get();
    if (!codeSnap.exists) {
      await codeRef.set({ teamId });
      summary.inviteCodeDoc = 'created';
    }
  }

  // Strip the moved fields from the public doc, and backfill contactEmail
  // (used by the join-notification email) from createdByEmail if not already set.
  const cleanup = {
    inviteCode: FieldValue.delete(),
    adminUids: FieldValue.delete(),
    createdBy: FieldValue.delete(),
    createdByEmail: FieldValue.delete(),
  };
  if (!data.contactEmail && data.createdByEmail) {
    cleanup.contactEmail = data.createdByEmail;
  }
  const needsCleanup = ['inviteCode', 'adminUids', 'createdBy', 'createdByEmail'].some(f => f in data);
  if (needsCleanup) {
    await teamDoc.ref.update(cleanup);
    summary.publicDocCleaned = true;
  }

  return summary;
}

async function main() {
  console.log('Migrating team documents...\n');
  const teamsSnap = await db.collection('teams').get();
  if (teamsSnap.empty) {
    console.log('No teams found — nothing to migrate.');
    return;
  }

  for (const teamDoc of teamsSnap.docs) {
    const summary = await migrateTeam(teamDoc);
    console.log(
      `  ${summary.teamId} (${summary.name || 'unnamed'}): ` +
      `secrets=${summary.secrets}, inviteCodeDoc=${summary.inviteCodeDoc}, ` +
      `publicDocCleaned=${summary.publicDocCleaned}`
    );
  }

  console.log(`\nDone — ${teamsSnap.size} team(s) processed.`);
  console.log('Next: review the output above, then deploy the new firestore.rules with:');
  console.log('  firebase deploy --only firestore:rules');
}

main().catch((e) => { console.error('Migration failed:', e); process.exit(1); });
