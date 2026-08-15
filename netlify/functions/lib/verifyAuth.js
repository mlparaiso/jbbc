// Verifies a Firebase Auth ID token without the Admin SDK (no service account
// needed) — Firebase ID tokens are standard JWTs signed by Google, verifiable
// against Google's public JWKS using only the project's (already-public)
// project id. See: https://firebase.google.com/docs/auth/admin/verify-id-tokens
// ("Verify ID tokens using a third-party JWT library").
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

// Extracts and verifies the bearer token from a request's Authorization
// header. Returns { uid, email } on success. Throws on any failure (missing
// header, expired/invalid/malformed token, wrong project) — callers should
// treat any throw as "unauthenticated" and reject the request.
export async function verifyAuth(req) {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) throw new Error('Missing Authorization header');
  if (!PROJECT_ID) throw new Error('Server misconfigured: no Firebase project id');

  const { payload } = await jwtVerify(match[1], JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });

  if (!payload.sub || !payload.email) throw new Error('Token missing required claims');
  return { uid: payload.sub, email: payload.email };
}
