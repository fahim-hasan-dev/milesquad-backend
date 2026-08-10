import { StatusCodes } from 'http-status-codes'
import Stripe from 'stripe'
import { User } from '../app/modules/user/user.model'
import { Subscription } from '../app/modules/subscription/subscription.model'
import { Plan } from '../app/modules/plan/plan.model'
import stripe from '../config/stripe'
import ApiError from '../errors/ApiError'
import { emailHelper } from '../helpers/emailHelper'
import { emailTemplate } from '../shared/emailTemplate'

export const handleSubscriptionCreated = async (data: Stripe.Subscription) => {
    try {
        // 🔹 Step 1: Retrieve the full subscription with expanded data
        const subscriptionResponse = await stripe.subscriptions.retrieve(data.id, {
            expand: ['latest_invoice.payment_intent'],
        })

        const subscription =
            subscriptionResponse as unknown as Stripe.Subscription & {
                current_period_start: number
                current_period_end: number
            }

        // 🔹 Step 2: Retrieve customer
        const customerResponse = await stripe.customers.retrieve(
            subscription.customer as string,
        )
        const customer = customerResponse as Stripe.Customer

        // 🔹 Step 3: Extract necessary info
        const productId = subscription.items.data[0]?.price?.product as string
        // Use a custom type that includes payment_intent
        const invoice = subscription.latest_invoice as Stripe.Invoice & {
            payment_intent?: string | Stripe.PaymentIntent
        }

        const invoicePdf = invoice?.invoice_pdf

        // Get transaction ID from invoice or generate one
        let trxId = null
        if (invoice?.payment_intent) {
            const paymentIntent =
                typeof invoice.payment_intent === 'string'
                    ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
                    : invoice.payment_intent
            trxId = paymentIntent?.id
        } else if (invoice?.id) {
            trxId = invoice.id // Use invoice ID as fallback
        } else {
            trxId = `sub_${subscription.id}_${Date.now()}` // Generate a fallback ID
        }

        const amountPaid = (invoice?.total || 0) / 100

        // 🔹 Step 4: Match user by email
        const user = await User.findOne({ email: customer.email })
        if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')

        // 🔹 Step 5: Match plan by Stripe productId
        const plan = await Plan.findOne({ productId })
        if (!plan) throw new ApiError(StatusCodes.NOT_FOUND, 'Plan not found')

        // 🔹 Step 6: Period dates
        const currentPeriodStart = subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000)
            : new Date()
        const currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default to 30 days if missing

        // 🔹 Step 7: Save subscription info in DB
        const subscriptionData = {
            customerId: customer.id,
            price: amountPaid,
            user: user._id,
            plan: plan._id,
            trxId,
            subscriptionId: subscription.id,
            status: 'active',
            invoice: invoicePdf,
            currentPeriodStart,
            currentPeriodEnd,
        }
        console.log('subscriptionData', subscriptionData)
        await Subscription.create(subscriptionData)

        // 🔹 Step 8: Update user subscription status
        await User.findByIdAndUpdate(user._id, { subscribe: true })

        await emailHelper.sendEmail(
            emailTemplate.subscriptionActivatedEmail({
                user,
                plan,
                amountPaid,
                trxId,
                invoicePdf: invoicePdf || '',
            }),
        )
    } catch (error) {
        console.error('Error in handleSubscriptionCreated:', error)
        return error
    }
}
