// Netlify serverless function — sends welcome email via Resend when a team is created
// Called by AppContext after createTeam() succeeds
import { handleEmailRequest, sendResendEmail, escapeHtml, sanitizeScheduleUrl } from './lib/sendEmail.js';

export default async (req) => handleEmailRequest(req, async ({ body, auth, apiKey }) => {
  const { toName, teamName, inviteCode, scheduleUrl } = body;
  // The recipient is always the verified, signed-in caller — never a
  // client-supplied address — so this endpoint can't be used to spam an
  // arbitrary address even with a valid token.
  const toEmail = auth.email;

  if (!teamName || !inviteCode) {
    const err = new Error('Missing required fields');
    err.status = 400;
    throw err;
  }

  const firstName = toName ? escapeHtml(String(toName).split(' ')[0]) : 'there';
  const safeTeamName = escapeHtml(teamName);
  const safeInviteCode = escapeHtml(inviteCode);
  const safeUrl = sanitizeScheduleUrl(scheduleUrl);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your team is ready on Worship Schedule!</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(66,99,235,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4263eb 0%,#6b8cfa 100%);padding:32px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:36px;">🎵</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Worship Schedule</h1>
              <p style="margin:8px 0 0;color:#c7d4ff;font-size:14px;">Your team is ready!</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;">Hi ${firstName} 👋,</p>
              <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
                Your worship team has been created on <strong style="color:#4263eb;">Worship Schedule</strong>.
                You're all set to build lineups, assign instruments, and share your schedule with the team.
              </p>

              <!-- Team info card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7ff;border:1px solid #e0e7ff;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Team Details</p>
                    <table width="100%" cellpadding="0" cellspacing="4">
                      <tr>
                        <td style="font-size:13px;color:#6b7280;width:120px;padding:4px 0;">Team Name</td>
                        <td style="font-size:14px;font-weight:700;color:#1f2937;">${safeTeamName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:4px 0;">Invite Code</td>
                        <td>
                          <span style="display:inline-block;background:#4263eb;color:#ffffff;font-weight:700;font-size:15px;letter-spacing:2px;padding:4px 12px;border-radius:6px;">${safeInviteCode}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Share the invite code with your worship team members so they can join and view the schedule:</p>

              ${safeUrl ? `
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#4263eb;border-radius:10px;">
                    <a href="${safeUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.3px;">
                      View Your Schedule →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Or copy this link:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#4263eb;word-break:break-all;">${safeUrl}</p>
              ` : ''}

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
    subject: `Your team "${teamName}" is ready! 🎵`,
    html,
  });

  return { success: true, id: data.id };
});

export const config = {
  path: '/api/send-welcome-email',
};
