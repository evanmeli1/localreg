import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { getAdminClient, isAdminConfigured } from '@/lib/supabase-admin';
import { COLORS, DISCORD_WEBHOOKS, notifyDiscord } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Stripe webhook receiver.
//
// SIGNATURE VERIFICATION IS MANDATORY. This endpoint is public and unguessable
// only by obscurity, so every request is authenticated with the Stripe-Signature
// header against STRIPE_WEBHOOK_SECRET before a single byte is trusted. Without
// it, anyone could POST a fake customer.subscription.deleted and unpublish a
// paying listing. The raw request body is required — parsing it first would
// change the bytes and break the HMAC.

const AMBER = 16093727; // payment failed — warning, not yet critical

export async function POST(request) {
  if (!isStripeConfigured) {
    console.error('[stripe-webhook] Stripe not configured');
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET missing — refusing to trust payload');
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  // Raw body, exactly as sent.
  const rawBody = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe-webhook] signature verification FAILED:', error.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (!isAdminConfigured) {
    console.error('[stripe-webhook] Supabase admin not configured');
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const supabase = getAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, supabase);
        break;
      case 'charge.dispute.created':
        await handleDisputeCreated(event, supabase);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event, supabase);
        break;
      default:
        console.log(`[stripe-webhook] ignoring ${event.type}`);
    }
  } catch (error) {
    // Returning 500 makes Stripe retry with backoff, which is what we want for
    // a transient database failure.
    console.error(`[stripe-webhook] handler for ${event.type} threw:`, error);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Deliberately does NOT create the businesses row — Stripe has the payment but
 * none of the business details, which only the /welcome form collects. The
 * gate is that /welcome now verifies the session against Stripe before showing
 * the form.
 *
 * TODO: if abandoned-checkout detection is ever wanted, persist these into a
 * `checkout_sessions` tracking table and diff against businesses rows. Not
 * built yet — intentionally out of scope for this phase.
 */
async function handleCheckoutCompleted(event) {
  const session = event.data.object;
  console.log(
    '[stripe-webhook] checkout.session.completed',
    JSON.stringify({
      session_id: session.id,
      customer_id: session.customer,
      subscription_id: session.subscription,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
    }),
  );
}

/** Looks up a business by Stripe customer id; logs and returns null when absent. */
async function findBusinessByCustomer(supabase, customerId, eventType) {
  if (!customerId) {
    console.warn(`[stripe-webhook] ${eventType}: event carried no customer id`);
    return null;
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, status, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (error) {
    console.error(`[stripe-webhook] ${eventType}: lookup failed`, error);
    return null;
  }

  if (!data) {
    // Legitimate: CLI-triggered test events, or a customer who paid but never
    // completed the intake form. Not an error condition.
    console.warn(`[stripe-webhook] ${eventType}: no business for customer ${customerId}`);
    return null;
  }

  return data;
}

async function handleSubscriptionDeleted(event, supabase) {
  const customerId = event.data.object.customer;
  const business = await findBusinessByCustomer(supabase, customerId, 'customer.subscription.deleted');
  if (!business) return;

  const { error } = await supabase
    .from('businesses')
    .update({ status: 'cancelled' })
    .eq('id', business.id);

  if (error) {
    console.error('[stripe-webhook] failed to mark cancelled', error);
    throw error;
  }

  await supabase.from('events').insert({
    event_type: 'subscription_cancelled',
    business_id: business.id,
    stripe_customer_id: customerId,
    metadata: { subscription_id: event.data.object.id, previous_status: business.status },
  });

  console.log(`[stripe-webhook] ${business.name} -> cancelled`);

  await notifyDiscord(DISCORD_WEBHOOKS.alerts, {
    title: '🚫 Subscription cancelled',
    description: 'The listing has been removed from the public directory.',
    color: COLORS.red,
    fields: [
      { name: 'Business name', value: business.name },
      { name: 'Customer', value: customerId, inline: true },
      { name: 'Previous status', value: business.status, inline: true },
    ],
  });
}

async function handleDisputeCreated(event, supabase) {
  const dispute = event.data.object;
  // A dispute arrives against a charge; the customer may need resolving from it.
  let customerId = dispute.customer ?? null;
  if (!customerId && dispute.charge) {
    try {
      const charge = await stripe.charges.retrieve(
        typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id,
      );
      customerId = charge.customer ?? null;
    } catch (error) {
      console.warn('[stripe-webhook] could not resolve customer from charge:', error.message);
    }
  }

  const business = await findBusinessByCustomer(supabase, customerId, 'charge.dispute.created');

  // Alert regardless of whether the business resolved — a dispute always needs
  // a human, even if it can't be matched to a listing.
  await supabase.from('events').insert({
    event_type: 'dispute_opened',
    business_id: business?.id ?? null,
    stripe_customer_id: customerId,
    metadata: {
      charge_id: typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? null,
      dispute_id: dispute.id,
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
    },
  });

  // NOTE: the listing is deliberately NOT unpublished here. A dispute is a
  // claim, not a finding — it can be resolved in our favour, and pulling a
  // paying customer's listing on an unproven claim is the worse error.
  await notifyDiscord(DISCORD_WEBHOOKS.alerts, {
    title: '⚠️ DISPUTE OPENED, needs immediate attention',
    description:
      '**This is the most urgent alert type.** A cardholder has disputed a charge. '
      + 'Respond in the Stripe Dashboard before the evidence deadline or the funds are lost by default.\n\n'
      + 'The listing has been left live on purpose, because a dispute is a claim, not proof.',
    color: COLORS.red,
    fields: [
      { name: 'Business name', value: business?.name ?? '⚠️ no matching listing found' },
      { name: 'Customer', value: customerId ?? 'unknown' },
      { name: 'Charge', value: (typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id) ?? 'unknown' },
      { name: 'Amount', value: `${(dispute.amount / 100).toFixed(2)} ${String(dispute.currency).toUpperCase()}`, inline: true },
      { name: 'Reason', value: dispute.reason ?? 'unspecified', inline: true },
    ],
  });
}

async function handlePaymentFailed(event, supabase) {
  const invoice = event.data.object;
  const customerId = invoice.customer;
  const business = await findBusinessByCustomer(supabase, customerId, 'invoice.payment_failed');
  if (!business) return;

  await supabase.from('events').insert({
    event_type: 'payment_failed',
    business_id: business.id,
    stripe_customer_id: customerId,
    metadata: {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
    },
  });

  await notifyDiscord(DISCORD_WEBHOOKS.alerts, {
    title: '💳 Payment failed',
    description: 'Stripe will retry automatically. The listing stays live for now.',
    color: AMBER,
    fields: [
      { name: 'Business name', value: business.name },
      { name: 'Amount due', value: `${(invoice.amount_due / 100).toFixed(2)} ${String(invoice.currency).toUpperCase()}`, inline: true },
      { name: 'Attempt', value: String(invoice.attempt_count ?? 1), inline: true },
    ],
  });
}
