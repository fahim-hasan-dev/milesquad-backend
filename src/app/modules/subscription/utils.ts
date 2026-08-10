import { User } from '../user/user.model'
import { Subscription } from './subscription.model'

export const checkAndUpdateExpiredSubscriptions = async (): Promise<void> => {
  try {
    const now = new Date()

    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      currentPeriodEnd: { $lt: now },
    })

    for (const subscription of expiredSubscriptions) {
      try {
        // Update subscription status to expired
        await Subscription.findByIdAndUpdate(subscription._id, {
          status: 'expired',
        })

        const anotherSubscription = await Subscription.findOne({
          user: subscription.user,
          status: 'active',
        })

        if (!anotherSubscription) {
          await User.findOneAndUpdate(
            { _id: subscription.user },
            { subscribe: false },
          )
        }

        console.log(`Updated expired subscription: ${subscription._id}`)
      } catch (error) {
        console.error(`Error updating subscription ${subscription._id}:`, error)
      }
    }

    console.log(
      `Processed ${expiredSubscriptions.length} expired subscriptions`,
    )
  } catch (error) {
    console.error('Error in checkAndUpdateExpiredSubscriptions:', error)
    throw error
  }
}

export const isSubscriptionExpired = (currentPeriodEnd: string): boolean => {
  return new Date(currentPeriodEnd) < new Date()
}
