// Discord webhook notifications.
//
// SERVER-ONLY. The webhook URLs are secrets (anyone holding one can post to the
// channel), so they are deliberately not NEXT_PUBLIC_ — never import this from
// a client component. Notifications that follow a public form submission are
// therefore fired from an API route, not from the browser.

/** Discord's decimal colour values. */
export const COLORS = {
  green: 3066993,
  // Reserved for the alert notifications listed in the TODO below — nothing
  // currently posts in red.
  red: 15158332,
  gray: 9807270,
};

export const DISCORD_WEBHOOKS = {
  signups: process.env.DISCORD_WEBHOOK_SIGNUPS,
  alerts: process.env.DISCORD_WEBHOOK_ALERTS,
};

// TODO(stripe): the alerts channel (DISCORD_WEBHOOKS.alerts) has no senders
// yet. Once Stripe Checkout and its webhook land in the next phase, add
// subscription_cancelled, dispute_opened and payment_failed notifications —
// they fire from the Stripe webhook handler and should post in red.

const MAX_TITLE = 256;
const MAX_FIELD_VALUE = 1024;

// Ceiling on how long a notification may delay the request that triggered it.
const REQUEST_TIMEOUT_MS = 5000;

function truncate(value, max) {
  const s = String(value ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Posts an embed to a Discord webhook.
 *
 * Never throws and never rejects: a Discord outage, a revoked webhook or a
 * malformed payload must not break the flow that triggered it (a paying
 * customer's submission is not allowed to fail because a chat message did).
 * Failures are logged and swallowed.
 *
 * @param {string|undefined} webhookUrl  Caller picks the channel — see DISCORD_WEBHOOKS.
 * @param {{title: string, description?: string, color?: number,
 *          fields?: {name: string, value: string, inline?: boolean}[]}} embed
 * @returns {Promise<boolean>} true when Discord accepted the message.
 */
export async function notifyDiscord(webhookUrl, { title, description, color, fields } = {}) {
  try {
    if (!webhookUrl) {
      console.warn('[discord] no webhook URL configured — skipping:', title);
      return false;
    }

    const embed = {
      title: truncate(title, MAX_TITLE),
      color: color ?? COLORS.gray,
      timestamp: new Date().toISOString(),
    };

    if (description) embed.description = truncate(description, 4096);

    if (Array.isArray(fields) && fields.length > 0) {
      embed.fields = fields
        // Discord rejects the whole payload on an empty field value.
        .filter((f) => f && f.name && f.value !== undefined && f.value !== null && f.value !== '')
        .slice(0, 25)
        .map((f) => ({
          name: truncate(f.name, MAX_TITLE),
          value: truncate(f.value, MAX_FIELD_VALUE),
          inline: Boolean(f.inline),
        }));
    }

    // ?wait=true makes Discord return the created message (200 + JSON) instead
    // of a blind 204, so a rejected payload surfaces a real reason in the log.
    //
    // The timeout matters as much as the try/catch: fetch has no default one,
    // so a Discord endpoint that accepts the connection and then stalls would
    // hold the caller's request open indefinitely — and these calls are awaited
    // inside the submission and change-request routes, i.e. in front of a
    // paying customer. Aborting throws, which the catch below turns into the
    // same swallowed failure as any other outage.
    const res = await fetch(`${webhookUrl}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[discord] webhook rejected (${res.status}):`, detail.slice(0, 300));
      return false;
    }

    const message = await res.json().catch(() => null);
    console.log(`[discord] sent "${embed.title}"${message?.id ? ` (message ${message.id})` : ''}`);
    if (process.env.DISCORD_DEBUG === '1' && message) {
      console.log('[discord] stored embed:', JSON.stringify(message.embeds?.[0], null, 2));
    }

    return true;
  } catch (error) {
    // Includes network failures and JSON errors — all non-fatal by design.
    console.error('[discord] notification failed:', error);
    return false;
  }
}
