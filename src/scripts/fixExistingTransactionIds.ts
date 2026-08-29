import mongoose from 'mongoose';
import config from '../config';
import { Transaction } from '../app/modules/transaction/transaction.model';
import { getNextCustomId } from '../app/modules/counter/counter.model';

async function fixExistingTransactionIds() {
    try {
        console.log('Connecting to database:', config.database_url);
        await mongoose.connect(config.database_url as string);
        console.log('Connected successfully!');

        // Find transactions where transactionId does NOT match the standard MS-TXN-XXXXXXX format
        const nonStandardTransactions = await Transaction.find({
            transactionId: { $not: /^MS-TXN-\d{7}$/ }
        }).sort({ createdAt: 1 });

        console.log(`Found ${nonStandardTransactions.length} transactions with non-standard transactionId.`);

        for (const tx of nonStandardTransactions) {
            const oldId = tx.transactionId;
            const newId = await getNextCustomId('TXN');
            await Transaction.updateOne({ _id: tx._id }, { $set: { transactionId: newId } });
            console.log(`Updated Transaction [${tx._id}]: '${oldId}' -> '${newId}'`);
        }

        console.log('\nMigration completed successfully!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixExistingTransactionIds();
