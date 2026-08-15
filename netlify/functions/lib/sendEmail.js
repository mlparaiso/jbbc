// Shared helpers for the Resend-backed email functions: request validation,
// auth verification, HTML escaping for interpolated user-controlled strings,
// and the actual Resend API call — factored out since all three functions
// (send-welcome-email, send-signup-welcome, send-join-emails) repeated this
// boilerplate almost verbatim.
import { verifyAuth } from './verifyAuth.js';

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escapes a value for safe interpolation into HTML email bodies. Every
// user-controlled string (names, team names) must go through this before
// being embedded in a template — otherwise a crafted name/team-name value
// could inject markup into an email sent from this app's trusted domain.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

// Only accepts a URL that actually points back at this app's own /team/*
// share links — rejects anything else (open-redirect / phishing-link risk)
// rather than trying to escape an arbitrary href value.
export function sanitizeScheduleUrl(url) {
  if (typeof url !== 'string') return null;
  return /^https:\/\/[a-z0-9.-]+\/team\/[A-Za-z0-9_-]+(?:\?[\w=&-]*)?$/i.test(url) ? url : null;
}

// Wraps a handler with: method check, auth verification, JSON body parsing,
// and generic error handling. `handler({ body, auth }) => Promise<object>`
// returns the response body to send back with a 200; throw an Error with a
// `status` property for a specific error status, or a plain Error for a
// generic 500 (its message is logged server-side only, never echoed back).
export async function handleEmailRequest(req, handler) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let auth;
  try {
    auth = await verifyAuth(req);
  } catch (e) {
    console.error('Auth verification failed:', e.message);
    return json({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json({ error: 'Email service not configured' }, 500);

  try {
    const result = await handler({ body, auth, apiKey });
    return json(result ?? { success: true }, 200);
  } catch (e) {
    if (e.status) return json({ error: e.message }, e.status);
    console.error('Function error:', e);
    return json({ error: 'Email send failed' }, 500);
  }
}

export async function sendResendEmail(apiKey, { from, to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('Resend error:', data);
    const err = new Error('Email send failed');
    err.status = 502;
    throw err;
  }
  return res.json();
}
