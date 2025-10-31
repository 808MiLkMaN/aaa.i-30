import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/(auth)/auth';
import Stripe from 'stripe';
import { updateUserStripeCustomerId } from '@/lib/db/queries';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { priceId, credits } = body;

    if (!priceId || !credits) {
      return NextResponse.json(
        { error: 'Missing priceId or credits' },
        { status: 400 }
      );
    }

    // Create or get Stripe customer
    let customerId = session.user.email
      ? (
          await stripe.customers.list({
            email: session.user.email,
            limit: 1,
          })
        ).data[0]?.id
      : undefined;

    if (!customerId && session.user.email) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;
      await updateUserStripeCustomerId({
        userId: session.user.id,
        stripeCustomerId: customerId,
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      metadata: {
        userId: session.user.id,
        credits: credits.toString(),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
