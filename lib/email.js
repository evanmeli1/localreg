// Transactional email.
//
// SERVER-ONLY. No delivery provider is wired up yet (there is no API key for
// one in this project), so sendEmail() renders the message and logs it instead
// of sending. That keeps the call sites — and the templates below — final:
// when a provider is added, only the transport in sendEmail() changes.

const FROM = 'localreg <hello@localreg.example>';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * "You're approved and live" — the only email that carries the reference id,
 * which is why the copy tells the owner to keep it.
 *
 * @param {{businessName: string, referenceId: string}} params
 * @returns {{subject: string, text: string, html: string}}
 */
export function renderApprovalEmail({ businessName, referenceId }) {
  const site = siteUrl();
  const subject = `${businessName} is live on localreg`;

  const text = [
    `Good news — ${businessName} is approved and live on localreg.`,
    '',
    `Your reference ID: ${referenceId}`,
    "Save this — you'll need it to request any changes to your listing.",
    '',
    `View the directory: ${site}`,
    `Request a change: ${site}/request-change`,
    '',
    '— localreg',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#fafafa;color:#14151a;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;">
    <div style="max-width:460px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #efefef;border-radius:12px;">
      <p style="margin:0 0 14px;">
        Good news — <strong>${escapeHtml(businessName)}</strong> is approved and live on localreg.
      </p>

      <p style="margin:0 0 6px;color:#6b6e76;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">
        Your reference ID
      </p>
      <p style="margin:0 0 6px;font-size:20px;font-weight:800;letter-spacing:0.06em;">
        ${escapeHtml(referenceId)}
      </p>
      <p style="margin:0 0 18px;color:#6b6e76;font-size:12.5px;">
        Save this — you&rsquo;ll need it to request any changes to your listing.
      </p>

      <p style="margin:0;">
        <a href="${escapeHtml(site)}" style="color:#1d4ed8;">View the directory</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(site)}/request-change" style="color:#1d4ed8;">Request a change</a>
      </p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

/**
 * Sends (currently: logs) one email. Never throws — an email failure must not
 * fail the admin action that triggered it, exactly like notifyDiscord.
 *
 * @returns {Promise<{delivered: boolean, reason?: string}>}
 */
export async function sendEmail({ to, subject, text, html }) {
  try {
    if (!to) {
      console.warn('[email] no recipient — skipping:', subject);
      return { delivered: false, reason: 'no_recipient' };
    }

    // TODO(email): swap for a real provider call. Until then the full rendered
    // message goes to the server log so the flow is verifiable end to end.
    console.log(
      [
        '[email] (no provider configured — logging instead)',
        `  from:    ${FROM}`,
        `  to:      ${to}`,
        `  subject: ${subject}`,
        '  ---',
        text
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n'),
        '  ---',
        `  (html body: ${html.length} chars)`,
      ].join('\n'),
    );

    return { delivered: false, reason: 'not_configured' };
  } catch (error) {
    console.error('[email] send failed:', error);
    return { delivered: false, reason: 'error' };
  }
}

/** Convenience wrapper used by the approve route. */
export async function sendApprovalEmail({ to, businessName, referenceId }) {
  const { subject, text, html } = renderApprovalEmail({ businessName, referenceId });
  return sendEmail({ to, subject, text, html });
}
