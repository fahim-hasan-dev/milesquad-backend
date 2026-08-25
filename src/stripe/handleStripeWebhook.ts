import { Request, Response } from 'express'
import Stripe from 'stripe'
import { StatusCodes } from 'http-status-codes'
import config from '../config'
import stripe from '../config/stripe'
import ApiError from '../errors/ApiError'
import { logger } from '../shared/logger'
import { Payment } from '../app/modules/payment/payment.model'
import { Parcel } from '../app/modules/parcel/parcel.model'
import { PARCEL_STATUS } from '../enum/parcel'
import { Transaction } from '../app/modules/transaction/transaction.model'
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from '../enum/transaction'
import { User } from '../app/modules/user/user.model'
import { emailHelper } from '../helpers/emailHelper'
import { generateInvoiceHTML, generateInvoicePDFBuffer } from '../helpers/invoiceHelper'

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

                    if (session.metadata?.referenceId) {
                        const parcelId = session.metadata.referenceId;
                        const parcel = await Parcel.findById(parcelId);
                        if (parcel) {
                            await Parcel.findByIdAndUpdate(parcelId, {
                                $set: {
                                    status: PARCEL_STATUS.PENDING,
                                    paymentId: session.payment_intent as string || session.id,
                                    'statusProgress.CREATED': true,
                                    'statusProgress.CONFIRMED': true,
                                    'statusProgress.PENDING': true,
                                }
                            });

                            try {
                                await Transaction.create({
                                    transactionId: session.payment_intent as string || session.id,
                                    user: parcel.sender,
                                    parcel: parcel._id,
                                    amount: (session.amount_total || 0) / 100,
                                    type: TRANSACTION_TYPE.PAYMENT,
                                    status: TRANSACTION_STATUS.COMPLETED,
                                    paymentMethod: 'online',
                                    description: `Online payment for Parcel #${parcel._id}`,
                                });
                            } catch (txnError) {
                                logger.error('Failed to log payment transaction:', txnError);
                            }

                            // Send Online Paid Invoice Email to Customer if email exists
                            try {
                                const updatedParcel = await Parcel.findById(parcelId);
                                const customer = await User.findById(parcel.sender);
                                if (customer?.email && updatedParcel) {
                                    const html = generateInvoiceHTML(updatedParcel, customer);
                                    const pdfBuffer = await generateInvoicePDFBuffer(updatedParcel, customer);
                                    const invoiceNo = `INV-${updatedParcel._id.toString().slice(-8).toUpperCase()}`;

                                    await emailHelper.sendEmail({
                                        to: customer.email,
                                        subject: `Payment Successful & Invoice #${invoiceNo} - Milesquad`,
                                        html,
                                        attachments: [
                                            {
                                                filename: `${invoiceNo}.pdf`,
                                                content: pdfBuffer,
                                                contentType: 'application/pdf',
                                            },
                                        ],
                                    });
                                }
                            } catch (mailErr) {
                                logger.error("Failed to send online payment invoice email:", mailErr);
                            }
                        }
                    }
                }

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
