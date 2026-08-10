import { z } from "zod";
import mongoose from "mongoose";

export const checkZodIDValidation = (fieldName: string) =>
    z.string().refine(
        (val) => {
            if (!val) {
                return false;
            }
            if (!mongoose.isValidObjectId(val)) {
                return false;
            }
            return true;
        },
        {
            message:`${fieldName}`,
        }
    );
