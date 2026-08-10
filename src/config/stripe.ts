import Stripe from 'stripe';
import config from '.';

const stripe = new Stripe(config.stripe.stripeSecretKey as string, {
    apiVersion: '2025-01-27.acacia' as any
});

export default stripe;
