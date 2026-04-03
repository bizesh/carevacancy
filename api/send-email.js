// api/send-email.js
// Central email sending function using Resend
// Called by other API functions - not called directly from frontend

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'CareVacancy <onboarding@resend.dev>';
const BASE_URL = 'https://carevacancy.vercel.app';

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Email send failed');
  return data;
}

// EMAIL TEMPLATES

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:#0f2942;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:white;">Care<span style="color:#5eead4;">Vacancy</span></div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">Australia's NDIS Provider Marketplace</div>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="font-size:12px;color:#94a3b8;margin:0;">
        CareVacancy · Australia's NDIS Marketplace<br/>
        <a href="${BASE_URL}" style="color:#0d9488;text-decoration:none;">carevacancy.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function approvedEmail(name) {
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f2942;margin:0 0 8px;">You're approved!</h1>
      <p style="font-size:15px;color:#64748b;margin:0;">Your CareVacancy profile is now live</p>
    </div>
    <p style="font-size:14px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="font-size:14px;color:#475569;line-height:1.7;">Great news — your CareVacancy provider account has been verified and approved. Your profile is now visible in search results.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="font-size:13px;color:#166534;margin:0;font-weight:600;">✓ Your profile is live</p>
      <p style="font-size:13px;color:#166534;margin:4px 0 0;">✓ You can now post vacancies and services</p>
      <p style="font-size:13px;color:#166534;margin:4px 0 0;">✓ Participants and coordinators can find you</p>
    </div>
    <p style="font-size:14px;color:#475569;line-height:1.7;">To unlock direct enquiries and priority search placement, upgrade to a Featured or Premium plan.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${BASE_URL}/pages/login.html" style="background:#0d9488;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Go to my dashboard →</a>
    </div>
  `);
}

function rejectedEmail(name, reason) {
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f2942;margin:0 0 8px;">Application not approved</h1>
    </div>
    <p style="font-size:14px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="font-size:14px;color:#475569;line-height:1.7;">Unfortunately we were unable to approve your CareVacancy application at this time.</p>
    ${reason ? `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="font-size:13px;color:#991b1b;margin:0;font-weight:600;">Reason:</p>
      <p style="font-size:13px;color:#991b1b;margin:6px 0 0;">${reason}</p>
    </div>` : ''}
    <p style="font-size:14px;color:#475569;line-height:1.7;">If you believe this is an error or would like to discuss your application, please contact us at <a href="mailto:hello@carevacancy.com.au" style="color:#0d9488;">hello@carevacancy.com.au</a></p>
  `);
}

function enquiryEmail(providerName, senderName, senderRole, subject, message, contactPref, dashboardUrl) {
  const prefMap = {
    email: '📧 Prefers to be contacted by email',
    phone: '📞 Prefers to be contacted by phone',
    either: '✓ Happy to be contacted by email or phone'
  };
  return emailWrapper(`
    <div style="margin-bottom:24px;">
      <h1 style="font-size:20px;font-weight:800;color:#0f2942;margin:0 0 8px;">New enquiry received</h1>
      <p style="font-size:14px;color:#64748b;margin:0;">Someone is interested in your services</p>
    </div>
    <p style="font-size:14px;color:#475569;line-height:1.7;">Hi ${providerName},</p>
    <p style="font-size:14px;color:#475569;line-height:1.7;">You have a new enquiry on CareVacancy.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0;">
      <div style="margin-bottom:12px;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">From</span>
        <div style="font-size:14px;font-weight:600;color:#0f2942;margin-top:4px;">${senderName}</div>
        <div style="font-size:13px;color:#64748b;">${senderRole}</div>
      </div>
      <div style="margin-bottom:12px;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Subject</span>
        <div style="font-size:14px;color:#0f2942;margin-top:4px;">${subject}</div>
      </div>
      <div style="margin-bottom:12px;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Message</span>
        <div style="font-size:14px;color:#475569;line-height:1.6;margin-top:4px;">${message}</div>
      </div>
      <div style="background:white;border-radius:8px;padding:10px 14px;font-size:13px;color:#475569;">
        ${prefMap[contactPref] || prefMap.either}
      </div>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}" style="background:#0d9488;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">View in dashboard →</a>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;">Log in to reply, add notes, and manage your enquiries.</p>
  `);
}

module.exports = { sendEmail, emailWrapper, approvedEmail, rejectedEmail, enquiryEmail };