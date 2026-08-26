import { Schema, model } from "mongoose";
import { ICounter, CounterModel } from "./counter.interface";

const counterSchema = new Schema<ICounter, CounterModel>({
    id: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
});

export const Counter = model<ICounter, CounterModel>("Counter", counterSchema);

export const getNextCustomId = async (prefix: string): Promise<string> => {
    const sequenceDocument = await Counter.findOneAndUpdate(
        { id: prefix },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const paddedSeq = sequenceDocument.seq.toString().padStart(7, "0");
    return `MS-${prefix}-${paddedSeq}`;
};
