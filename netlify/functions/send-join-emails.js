// Netlify serverless function — sends two emails when someone joins a team:
// 1. Welcome email to the person who joined
// 2. Notification email to the team admin
import { handleEmailRequest, sendResendEmail, escapeHtml, sanitizeScheduleUrl } from './lib/sendEmail.js';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

// Reads the team's public doc straight from the Firestore REST API — no
// credentials needed, since firestore.rules already makes this doc world-
// readable. Used so `teamName`/`adminEmail` come from the real, authoritative
// team record rather than being trusted verbatim from the request body.
async function fetchPublicTeam(teamId) {
  if (!PROJECT_ID || !teamId) return null;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/teams/${encodeURIComponent(teamId)}`
  );
  if (!res.ok) return null;
  const doc = await res.json();
  const fields = doc.fields || {};
  return {
    name: fields.name?.stringValue || null,
    contactEmail: fields.contactEmail?.stringValue || null,
  };
}

export default async (req) => handleEmailRequest(req, async ({ body, auth, apiKey }) => {
  const { teamId, scheduleUrl } = body;
  const joinerEmail = auth.email; // verified caller — never client-supplied
  const joinerName = auth.email.split('@')[0];

  const team = await fetchPublicTeam(teamId);
  if (!team) {
    const err = new Error('Team not found');
    err.status = 400;
    throw err;
  }
  const teamName = escapeHtml(team.name || 'your team');
  const adminEmail = team.contactEmail || null;
  const joinerFirst = escapeHtml(joinerName);
  const safeUrl = sanitizeScheduleUrl(scheduleUrl);

  // ── Email 1: Welcome to the person who joined ─────────────────────────────
  const joinerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You joined ${teamName}!</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(66,99,235,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4263eb 0%,#6b8cfa 100%);padding:36px 32px 28px;text-align:center;">
              <p style="margin:0 0 10px;font-size:40px;">🎶</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">You joined the team!</h1>
              <p style="margin:10px 0 0;color:#c7d4ff;font-size:14px;">${teamName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:16px;color:#374151;font-weight:600;">Hi ${joinerFirst}! 👋</p>
              <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
                You've successfully joined <strong style="color:#4263eb;">${teamName}</strong> on Worship Schedule.
                You can now view the team's upcoming worship lineups and schedule.
              </p>

              <!-- What's available -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7ff;border:1px solid #e0e7ff;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">What you can see</p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#374151;">📅&nbsp; <strong>Worship lineups</strong> — who's leading, playing, and singing each Sunday</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#374151;">🎵&nbsp; <strong>Song lists</strong> — songs planned for each service</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#374151;">📋&nbsp; <strong>Practice dates</strong> — when rehearsals are scheduled</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#374151;">👥&nbsp; <strong>Team members</strong> — the full roster of your worship team</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${safeUrl ? `
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#4263eb;border-radius:10px;">
                    <a href="${safeUrl}" style="display:inline-block;padding:13px 30px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.3px;">
                      View Team Schedule →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Schedule link:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#4263eb;word-break:break-all;">${safeUrl}</p>
              ` : ''}

              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;" />

              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.6;text-align:center;">
                Worship Schedule · Made for church music teams<br />
                This email was sent to ${escapeHtml(joinerEmail)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // ── Email 2: Notification to the admin ────────────────────────────────────
  const adminHtml = adminEmail ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New member joined your team</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(66,99,235,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4263eb 0%,#6b8cfa 100%);padding:32px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:36px;">👤</p>
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New Member Joined!</h1>
              <p style="margin:8px 0 0;color:#c7d4ff;font-size:14px;">${teamName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:16px;color:#374151;">Hi 👋,</p>
              <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
                Someone just joined your worship team on <strong style="color:#4263eb;">Worship Schedule</strong>.
              </p>

              <!-- Member info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7ff;border:1px solid #e0e7ff;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">New Member</p>
                    <table width="100%" cellpadding="0" cellspacing="4">
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:4px 0;">Email</td>
                        <td style="font-size:14px;color:#4263eb;">${escapeHtml(joinerEmail)}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:4px 0;">Team</td>
                        <td style="font-size:14px;color:#1f2937;">${teamName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:14px;color:#6b7280;">
                They now have viewer access to the team schedule. If you'd like to grant them admin access, you can do so from the team settings.
              </p>

              <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 20px;" />

              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.6;text-align:center;">
                Worship Schedule · Made for church music teams<br />
                This email was sent to ${escapeHtml(adminEmail)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>` : null;

  await sendResendEmail(apiKey, {
    from: 'Worship Schedule <onboarding@resend.dev>',
    to: [joinerEmail],
    subject: `You joined ${team.name || 'your team'} on Worship Schedule 🎶`,
    html: joinerHtml,
  });

  if (adminEmail && adminHtml) {
    await sendResendEmail(apiKey, {
      from: 'Worship Schedule <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `${joinerName} joined ${team.name || 'your team'} 👤`,
      html: adminHtml,
    });
  }

  return { success: true };
});

export const config = {
  path: '/api/send-join-emails',
};
