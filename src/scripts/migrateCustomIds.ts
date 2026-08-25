import mongoose from "mongoose";
import config from "../config";
import { User } from "../app/modules/user/user.model";
import { Parcel } from "../app/modules/parcel/parcel.model";
import { Partner } from "../app/modules/partner/partner.model";
import { Transaction } from "../app/modules/transaction/transaction.model";
import { Review } from "../app/modules/review/review.model";
import { getNextCustomId } from "../app/modules/counter/counter.model";
import { USER_ROLES } from "../enum/user";
import 'dotenv/config';

async function migrateCustomIds() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(config.database_url as string);
        console.log("Connected successfully!");

        // 1. Migrate Users
        const usersToUpdate = await User.find({
            $or: [{ userId: { $exists: false } }, { userId: null }, { userId: "" }]
        });
        console.log(`Found ${usersToUpdate.length} users to update with userId...`);

        for (const user of usersToUpdate) {
            const prefix = user.role === USER_ROLES.DRIVER ? "DRV" : (user.role === USER_ROLES.CUSTOMER ? "CUS" : "ADM");
            const newUserId = await getNextCustomId(prefix);
            await User.updateOne({ _id: user._id }, { $set: { userId: newUserId } });
            console.log(`Updated User [${user.fullName}] (${user._id}) -> ${newUserId}`);
        }

        // 2. Migrate Parcels
        const parcelsToUpdate = await Parcel.find({
            $or: [{ parcelId: { $exists: false } }, { parcelId: null }, { parcelId: "" }]
        });
        console.log(`Found ${parcelsToUpdate.length} parcels to update with parcelId...`);

        for (const parcel of parcelsToUpdate) {
            const newParcelId = await getNextCustomId("PAR");
            await Parcel.updateOne({ _id: parcel._id }, { $set: { parcelId: newParcelId } });
            console.log(`Updated Parcel (${parcel._id}) -> ${newParcelId}`);
        }

        // 3. Migrate Partners
        const partnersToUpdate = await Partner.find({
            $or: [{ partnerId: { $exists: false } }, { partnerId: null }, { partnerId: "" }]
        });
        console.log(`Found ${partnersToUpdate.length} partners to update with partnerId...`);

        for (const partner of partnersToUpdate) {
            const newPartnerId = await getNextCustomId("PTR");
            await Partner.updateOne({ _id: partner._id }, { $set: { partnerId: newPartnerId } });
            console.log(`Updated Partner [${partner.fullName}] (${partner._id}) -> ${newPartnerId}`);
        }

        // 4. Migrate Transactions (Legacy TXN- format or missing)
        const transactionsToUpdate = await Transaction.find({
            $or: [
                { transactionId: { $exists: false } },
                { transactionId: null },
                { transactionId: "" },
                { transactionId: { $regex: /^TXN-/ } }
            ]
        });
        console.log(`Found ${transactionsToUpdate.length} transactions to update with transactionId...`);

        for (const transaction of transactionsToUpdate) {
            const newTransactionId = await getNextCustomId("TXN");
            await Transaction.updateOne({ _id: transaction._id }, { $set: { transactionId: newTransactionId } });
            console.log(`Updated Transaction (${transaction._id}) -> ${newTransactionId}`);
        }

        // 5. Migrate Reviews
        const reviewsToUpdate = await Review.find({
            $or: [{ reviewId: { $exists: false } }, { reviewId: null }, { reviewId: "" }]
        });
        console.log(`Found ${reviewsToUpdate.length} reviews to update with reviewId...`);

        for (const review of reviewsToUpdate) {
            const newReviewId = await getNextCustomId("REV");
            await Review.updateOne({ _id: review._id }, { $set: { reviewId: newReviewId } });
            console.log(`Updated Review (${review._id}) -> ${newReviewId}`);
        }

        console.log("\n✅ All existing database records successfully updated with custom IDs!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed with error:", error);
        process.exit(1);
    }
}

migrateCustomIds();
