import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, paymentMethodType, ccName, ccEmail } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Missing required field: amount' });
  }

  // Load Stripe secret key
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey);
      
      // Stripe expects amount in cents
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        payment_method_types: [paymentMethodType || 'card'],
        receipt_email: ccEmail || undefined,
        metadata: {
          customerName: ccName || 'Anonymous Traveler',
          platform: 'Aether Co-Pilot Checkout'
        }
      });

      console.log(`Stripe PaymentIntent created: ${paymentIntent.id}`);
      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        status: paymentIntent.status
      });

    } catch (err) {
      console.error('Stripe API error:', err.message);
      return res.status(500).json({ error: `Stripe charge creation failed: ${err.message}` });
    }
  } else {
    // Graceful fallback for sandbox testing without Stripe keys
    console.warn('STRIPE_SECRET_KEY is missing. Falling back to sandbox payment simulator.');
    
    // Simulate payment intent parameters
    const mockIntentId = 'pi_mock_' + Math.random().toString(36).substring(2, 10);
    const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 10)}`;

    return res.status(200).json({
      clientSecret: mockClientSecret,
      id: mockIntentId,
      status: 'succeeded',
      message: 'Sandbox transaction authorized (Mock Mode)'
    });
  }
}
