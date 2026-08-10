import { Request, Response } from 'express'
import Stripe from 'stripe'
import { StatusCodes } from 'http-status-codes'
import config from '../config'
import stripe from '../config/stripe'
import ApiError from '../errors/ApiError'
import { handleSubscriptionCreated } from './handleSubscriptionCreated'
import { logger } from '../shared/logger'
import { User } from '../app/modules/user/user.model'
import { Subscription } from '../app/modules/subscription/subscription.model'
import { Payment } from '../app/modules/payment/payment.model'

const handleStripeWebhook = async (req: Request, res: Response) => {
    console.log('hit stripe webhook')
    const signature = req.headers['stripe-signature'] as string
    const webhookSecret = config.stripe.webhookSecret as string
    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret)
    } catch (error) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Webhook verification failed: ${error}`,
        )
    }

    const data = event.data.object as any
    const eventType = event.type

    try {
        switch (eventType) {
            case 'checkout.session.completed': {
                const session = data as Stripe.Checkout.Session
                logger.info('✅ Checkout completed:', session.id)

                const mode = session.mode;
                if (mode === 'payment') {
                    // Handle one-time payment
                    await Payment.create({
                        email: session.customer_details?.email,
                        amount: (session.amount_total || 0) / 100,
                        transactionId: session.payment_intent as string || session.id,
                        dateTime: new Date(),
                        customerName: session.customer_details?.name,
                        referenceId: session.metadata?.referenceId,
                    });
                }

                // ✅ AUTO-RENEW OFF for subscriptions
                if (session.subscription) {
                    await stripe.subscriptions.update(
                        session.subscription as string,
                        { cancel_at_period_end: true }
                    )
                }
                break
            }

            case 'customer.subscription.created':
                await handleSubscriptionCreated(data as Stripe.Subscription)
                break

            case 'customer.subscription.updated': {
                const subscription = data as Stripe.Subscription

                if (
                    subscription.cancel_at_period_end &&
                    subscription.status === 'active'
                ) {
                    logger.info(
                        `Subscription for user ${subscription.metadata.userId} will expire`,
                    )

                    await User.findByIdAndUpdate(subscription.metadata.userId, {
                        subscribe: false,
                    })

                    await Subscription.findOneAndUpdate(
                        { user: subscription.metadata.userId },
                        { status: 'expired' },
                    )
                }
                break
            }

            case 'customer.subscription.deleted': {
                const deletedSub = data as Stripe.Subscription

                await User.findByIdAndUpdate(deletedSub.metadata.userId, {
                    subscribe: false,
                })

                await Subscription.findOneAndUpdate(
                    { user: deletedSub.metadata.userId },
                    { status: 'expired' },
                )
                break
            }

            default:
                logger.info(`⚠️ Unhandled event type: ${eventType}`)
        }
    } catch (error) {
        logger.error('Webhook error:', error)
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `${error}`)
    }

    res.sendStatus(200)
}

export default handleStripeWebhook
