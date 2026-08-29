import mongoose from 'mongoose';
import config from '../config';
import { Parcel } from '../app/modules/parcel/parcel.model';

async function migrateDropDistance() {
    try {
        console.log('Connecting to database:', config.database_url);
        await mongoose.connect(config.database_url as string);
        console.log('Connected successfully!');

        // Find parcels that have 'distance' but no 'dropDistance'
        const rawParcels = await Parcel.collection.find({
            $or: [
                { dropDistance: { $exists: false } },
                { dropDistance: null }
            ]
        }).toArray();

        console.log(`Found ${rawParcels.length} parcels needing dropDistance migration.`);

        let updatedCount = 0;
        for (const parcelDoc of rawParcels) {
            const legacyDistance = typeof parcelDoc.distance === 'number' ? parcelDoc.distance : 0;
            await Parcel.collection.updateOne(
                { _id: parcelDoc._id },
                { $set: { dropDistance: legacyDistance } }
            );
            updatedCount++;
        }

        console.log(`Successfully migrated ${updatedCount} parcels to dropDistance!`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateDropDistance();
