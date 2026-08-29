import mongoose from 'mongoose';
import config from '../config';
import { Parcel } from '../app/modules/parcel/parcel.model';

const parseTextToMinutes = (durationText: string | number): number => {
    if (typeof durationText === "number") return isNaN(durationText) ? 0 : durationText;
    if (!durationText) return 0;
    let totalMinutes = 0;
    const hoursMatch = String(durationText).match(/(\d+)\s*hour/i);
    const minsMatch = String(durationText).match(/(\d+)\s*min/i);

    if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
    if (minsMatch) totalMinutes += parseInt(minsMatch[1], 10);
    if (!hoursMatch && !minsMatch) {
        const num = parseFloat(String(durationText));
        if (!isNaN(num)) totalMinutes = num;
    }

    return totalMinutes;
};

async function migrateDurationToMinutes() {
    try {
        console.log('Connecting to database:', config.database_url);
        await mongoose.connect(config.database_url as string);
        console.log('Connected successfully!');

        // Find parcels where dropDuration or pickUpDuration is a string
        const rawParcels = await Parcel.collection.find({
            $or: [
                { dropDuration: { $type: 'string' } },
                { pickUpDuration: { $type: 'string' } },
                { duration: { $type: 'string' } }
            ]
        }).toArray();

        console.log(`Found ${rawParcels.length} parcels needing numeric duration migration.`);

        let updatedCount = 0;
        for (const parcelDoc of rawParcels) {
            const legacyDropDuration = parcelDoc.dropDuration || parcelDoc.duration || 0;
            const legacyPickUpDuration = parcelDoc.pickUpDuration || 0;

            const numericDropDuration = parseTextToMinutes(legacyDropDuration);
            const numericPickUpDuration = parseTextToMinutes(legacyPickUpDuration);

            await Parcel.collection.updateOne(
                { _id: parcelDoc._id },
                {
                    $set: {
                        dropDuration: numericDropDuration,
                        pickUpDuration: numericPickUpDuration
                    }
                }
            );
            updatedCount++;
        }

        console.log(`Successfully migrated ${updatedCount} parcels to numeric minutes!`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateDurationToMinutes();
