import { Model, Document } from "mongoose";

export interface ICounter extends Document {
    id: string;
    seq: number;
}

export type CounterModel = Model<ICounter>;
