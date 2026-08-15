// Netlify serverless function — sends a welcome email when a user signs in for the first time
// Called by AppContext after the first Google sign-in (new user)
import { handleEmailRequest, sendResendEmail, escapeHtml } from './lib/sendEmail.js';

export default async (req) => handleEmailRequest(req, async ({ body, auth, apiKey }) => {
  const { toName } = body;
  const toEmail = auth.email; // verified caller — never client-supplied

  const firstName = toName ? escapeHtml(String(toName).split(' ')[0]) : 'there';
  const appUrl = 'https://worshipschedule.netlify.app';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Worship Schedule!</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(66,99,235,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4263eb 0%,#6b8cfa 100%);padding:36px 32px 28px;text-align:center;">
              <p style="margin:0 0 10px;font-size:40px;">🙏</p>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Welcome to Worship Schedule!</h1>
              <p style="margin:10px 0 0;color:#c7d4ff;font-size:14px;">Your church music team, organized.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:16px;color:#374151;font-weight:600;">Hi ${firstName}! 🎉</p>
              <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
                Welcome to <strong style="color:#4263eb;">Worship Schedule</strong> — a simple tool built for church music teams to organize lineups, track worship leaders, and share schedules with the congregation.
              </p>

              <!-- What you can do -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7ff;border:1px solid #e0e7ff;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">What you can do</p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#374151;">🎤&nbsp; <strong>Create a team</strong> — set up your worship team and invite members</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#374151;">📋&nbsp; <strong>Build lineups</strong> — assign worship leaders, instruments & songs per Sunday</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#374151;">📅&nbsp; <strong>Share schedules</strong> — your team gets a public schedule link with an invite code</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#374151;">🎵&nbsp; <strong>Track songs</strong> — build a song library used across all your lineups</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">Ready to get started? Head over to the app and create or join your team:</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#4263eb;border-radius:10px;">
                    <a href="${appUrl}" style="display:inline-block;padding:13px 30px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.3px;">
                      Go to Worship Schedule →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">App link:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#4263eb;word-break:break-all;">${appUrl}</p>

              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;" />

              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.6;text-align:center;">
                Worship Schedule · Made for church music teams<br />
                This email was sent to ${escapeHtml(toEmail)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const data = await sendResendEmail(apiKey, {
    from: 'Worship Schedule <onboarding@resend.dev>',
    to: [toEmail],
    subject: `Welcome to Worship Schedule, ${firstName}! 🙏`,
    html,
  });

  return { success: true, id: data.id };
});

export const config = {
  path: '/api/send-signup-welcome',
};
