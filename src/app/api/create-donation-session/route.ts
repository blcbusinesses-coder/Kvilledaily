import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-02-24.acacia',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kendallvilledaily.com';

/**
 * POST /api/create-donation-session
 * Creates a Stripe Checkout session for a donation.
 */
export async function POST() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe not configured. Please add STRIPE_SECRET_KEY to environment.' },
      { status: 503 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Support Kendallville Daily',
              description: 'Help us keep local journalism alive in Noble County, Indiana.',
              images: [`${SITE_URL}/og-image.png`],
            },
            unit_amount: 500, // $5.00 default — Stripe allows custom amounts via adjustable_quantity
          },
          quantity: 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
            maximum: 1000,
          },
        },
      ],
      success_url: `${SITE_URL}?donation=success`,
      cancel_url: `${SITE_URL}?donation=cancelled`,
      metadata: {
        source: 'kendallville-daily-website',
        type: 'donation',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment error';
    console.error('Stripe error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
