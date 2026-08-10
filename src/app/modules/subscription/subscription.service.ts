import { JwtPayload } from "jsonwebtoken";
import { ISubscription } from "./subscription.interface";
import { Subscription } from "./subscription.model";
import stripe from "../../../config/stripe";
import { User } from "../user/user.model";
import QueryBuilder from "../../builder/QueryBuilder";



const subscriptionDetailsFromDB = async (user: JwtPayload): Promise<ISubscription | {}> => {

    const subscription = await Subscription.findOne({ vendor: user.id }).populate("plan", "title price duration ").lean();
    if (!subscription) {
        return {}; // Return empty object if no subscription found
    }

    const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

    // Check subscription status and update database accordingly
    if (subscriptionFromStripe?.status !== "active") {
        await Promise.all([
            User.findByIdAndUpdate(user.id, { subscribe: false }, { new: true }),
            Subscription.findOneAndUpdate({ vendor: user.id }, { status: "expired" }, { new: true })
        ]);
    }

    return subscription;
};

const subscriptionsFromDB = async (query: Record<string, unknown>) => {

    const result = new QueryBuilder(Subscription.find(), query).paginate();
    const subscriptions = await result.modelQuery
        .populate([
            {
                path: "plan",
                select: "title price duration"
            },
            {
                path: "customerId",
                select: "name email profile"
            }
        ])
        .select("-createdAt -updatedAt -__v -customerId -subscriptionId")
        .lean();
    const pagination = await result.getPaginationInfo();

    return { subscriptions, pagination };
}

export const SubscriptionService = {
    subscriptionDetailsFromDB,
    subscriptionsFromDB
}
