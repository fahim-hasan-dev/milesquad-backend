import { StatusCodes } from "http-status-codes";
import stripe from "../config/stripe";
import { IPlan } from "../app/modules/plan/plan.interface";
import ApiError from "../errors/ApiError";

export const createStripeProductCatalog = async (
    payload: Partial<IPlan>
): Promise<{ productId: string; priceId: string } | null> => {
    // Create Product in Stripe
    const product = await stripe.products.create({
        name: payload.title as string,
        description: payload.description as string,
    });

    // Determine interval based on duration
    let interval: "month" | "year" = "month";
    let intervalCount = 1;

    switch (payload.duration) {
        case "1 month":
            interval = "month";
            intervalCount = 1;
            break;
        case "3 months":
            interval = "month";
            intervalCount = 3;
            break;
        case "6 months":
            interval = "month";
            intervalCount = 6;
            break;
        case "1 year":
            interval = "year";
            intervalCount = 1;
            break;
    }

    // Create Price for the Product
    const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(Number(payload.price) * 100),
        currency: "gbp",
        recurring: { interval, interval_count: intervalCount },
    });

    if (!price) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Stripe price");
    }

    return { productId: product.id, priceId: price.id };
};
