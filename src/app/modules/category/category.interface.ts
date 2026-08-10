import { Types } from "mongoose";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  image: string;
  parent: Types.ObjectId | null;
  isActive: boolean;
}
