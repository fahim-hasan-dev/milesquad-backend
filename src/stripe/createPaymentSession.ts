import stripe from "../config/stripe";
import { JwtPayload } from "jsonwebtoken";
import config from "../config";

export const createPaymentSession = async (user: JwtPayload, amount: number, referenceId: string) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'gbp',
                product_data: {
                    name: 'Payment',
                    description: `Payment for reference: ${referenceId}`,
                },
                unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${config.stripe.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.stripe.frontendUrl}/payment/cancel`,
        customer_email: user.email,
        metadata: {
            userId: user.id || (user as any).authId,
            referenceId: referenceId
        },
    });
    return session.url;
};
