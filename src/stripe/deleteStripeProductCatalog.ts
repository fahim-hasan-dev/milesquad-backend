import stripe from "../config/stripe";

export const deleteStripeProductCatalog = async (productId: string): Promise<{ success: boolean }> => {

    // Fetch all active prices for the product
    const prices = await stripe.prices.list({ product: productId, active: true });

    // deactivated all the prices 
    await Promise.all(
        prices.data.map((price) => stripe.prices.update(price.id, { active: false }))
    );

    // deactivated all the products
    const archivedProduct = await stripe.products.update(productId, { active: false });

    if (archivedProduct) {
        return { success: true };
    }

    return { success: false };
};
