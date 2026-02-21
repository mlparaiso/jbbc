// Netlify serverless function — sends welcome email via Resend when a team is created
// Called by AppContext after createTeam() succeeds

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { toEmail, toName, teamName, inviteCode, scheduleUrl } = body;

  if (!toEmail || !teamName || !inviteCode) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Worship Schedule Manager</title>
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
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Worship Schedule Manager</h1>
              <p style="margin:8px 0 0;color:#c7d4ff;font-size:14px;">Your team is ready!</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;">Hi ${toName ? toName.split(' ')[0] : 'there'} 👋,</p>
              <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
                Your worship team has been created on <strong style="color:#4263eb;">Worship Schedule Manager</strong>. 
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
                        <td style="font-size:14px;font-weight:700;color:#1f2937;">${teamName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:4px 0;">Invite Code</td>
                        <td>
                          <span style="display:inline-block;background:#4263eb;color:#ffffff;font-weight:700;font-size:15px;letter-spacing:2px;padding:4px 12px;border-radius:6px;">${inviteCode}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Share the invite code with your worship team members so they can join and view the schedule:</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#4263eb;border-radius:10px;">
                    <a href="${scheduleUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.3px;">
                      View Your Schedule →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Or copy this link:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#4263eb;word-break:break-all;">${scheduleUrl}</p>

              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;" />

              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.6;text-align:center;">
                Worship Schedule Manager · Made for church music teams<br />
                This email was sent to ${toEmail}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Worship Schedule Manager <onboarding@resend.dev>',
        to: [toEmail],
        subject: `Your team "${teamName}" is ready! 🎵`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: data.message || 'Email send failed' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/api/send-welcome-email',
};
