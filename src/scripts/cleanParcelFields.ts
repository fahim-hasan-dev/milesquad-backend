import mongoose from 'mongoose';
import config from '../config';

const VALID_FIELDS = new Set([
    '_id',
    'parcelId',
    'sameDayPickup',
    'itemValue',
    'numberOfGoods',
    'goodType',
    'totalWeight',
    'dimension',
    'pickupLocation',
    'dropLocation',
    'vehicleType',
    'images',
    'pdfDocument',
    'distance',
    'duration',
    'volume',
    'volumeUtilization',
    'weightUtilization',
    'effectiveUtilization',
    'loadFactor',
    'baseFee',
    'fuelCost',
    'timeCost',
    'goodRisks',
    'totalPrice',
    'additionalCost',
    'totalRun',
    'overhead',
    'milesquadInsurance',
    'marginMilesquad',
    'totalOfRun',
    'serviceFee',
    'totalToPay',
    'totalDeliveryFee',
    'paymentId',
    'paymentMethod',
    'sender',
    'deliveryDate',
    'receiverPhone',
    'isDriverAssigned',
    'driver',
    'partner',
    'status',
    'statusProgress',
    'note',
    'pickedUpAt',
    'deliveredAt',
    'deliveryProof',
    'createdAt',
    'updatedAt',
    '__v'
]);

async function cleanParcelFields() {
    try {
        console.log('Connecting to database:', config.database_url);
        await mongoose.connect(config.database_url as string);
        console.log('Connected to MongoDB successfully!');

        const collection = mongoose.connection.db?.collection('parcels');
        if (!collection) {
            throw new Error('Parcels collection not found');
        }

        const parcels = await collection.find({}).toArray();
        console.log(`Found ${parcels.length} parcel documents in database.`);

        const extraFields = new Set<string>();

        for (const doc of parcels) {
            for (const key of Object.keys(doc)) {
                if (!VALID_FIELDS.has(key)) {
                    extraFields.add(key);
                }
            }
        }

        if (extraFields.size === 0) {
            console.log('No unnecessary fields found in parcel documents. Everything is clean!');
        } else {
            console.log('Found unnecessary fields in database:', Array.from(extraFields));
            
            const unsetObject: Record<string, string> = {};
            for (const field of extraFields) {
                unsetObject[field] = "";
            }

            const result = await collection.updateMany({}, { $unset: unsetObject });
            console.log(`Cleaned up unnecessary fields successfully! Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        }

        await mongoose.disconnect();
        console.log('Database disconnected cleanly.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

cleanParcelFields();
