import mongoose from 'mongoose';
import config from '../config';
import { Parcel } from '../app/modules/parcel/parcel.model';

async function migrateDropDuration() {
    try {
        console.log('Connecting to database:', config.database_url);
        await mongoose.connect(config.database_url as string);
        console.log('Connected successfully!');

        // Find parcels that have 'duration' but no 'dropDuration'
        const rawParcels = await Parcel.collection.find({
            $or: [
                { dropDuration: { $exists: false } },
                { dropDuration: '' },
                { dropDuration: null }
            ]
        }).toArray();

        console.log(`Found ${rawParcels.length} parcels needing dropDuration migration.`);

        let updatedCount = 0;
        for (const parcelDoc of rawParcels) {
            const legacyDuration = parcelDoc.duration || 'N/A';
            await Parcel.collection.updateOne(
                { _id: parcelDoc._id },
                { $set: { dropDuration: legacyDuration } }
            );
            updatedCount++;
        }

        console.log(`Successfully migrated ${updatedCount} parcels to dropDuration!`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateDropDuration();
