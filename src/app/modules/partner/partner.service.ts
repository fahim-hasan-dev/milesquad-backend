import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IPartner } from "./partner.interface";
import { Partner } from "./partner.model";
import { cacheDelByPattern, getOrSetCache } from "../../../helpers/cacheHelper";

const CACHE_TTL_PARTNERS = 3600; // 1 hour

const createPartner = async (payload: IPartner) => {
    const existingEmail = await Partner.findOne({ email: payload.email.toLowerCase() });
    if (existingEmail) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "A partner with this email already exists.");
    }

    const existingPhone = await Partner.findOne({ phone: payload.phone });
    if (existingPhone) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "A partner with this phone number already exists.");
    }

    const partner = await Partner.create(payload);
    await cacheDelByPattern("cache:partner:*");
    return partner;
};

const getAllPartners = async (query: Record<string, unknown>) => {
    const queryKey = JSON.stringify(query || {});
    return getOrSetCache(
        `cache:partner:list:${queryKey}`,
        async () => {
            const partnerQuery = new QueryBuilder(
                Partner.find({ status: { $ne: 'deleted' } }),
                query
            )
                .search(["fullName", "email", "phone", "rolePosition", "partnerId"])
                .filter()
                .sort()
                .paginate()
                .fields();

            const meta = await partnerQuery.getPaginationInfo();
            const result = await partnerQuery.modelQuery;

            return {
                meta,
                data: result,
            };
        },
        CACHE_TTL_PARTNERS
    );
};

const getSinglePartner = async (id: string) => {
    const isObjectId = Types.ObjectId.isValid(id);
    const queryFilter = isObjectId ? { _id: id } : { partnerId: id };

    const partner = await Partner.findOne({ ...queryFilter, status: { $ne: 'deleted' } });
    if (!partner) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Partner not found.");
    }
    return partner;
};

const updatePartner = async (id: string, payload: Partial<IPartner>) => {
    const partner = await Partner.findOne({ _id: id, status: { $ne: 'deleted' } });
    if (!partner) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Partner not found.");
    }

    if (payload.email) {
        const existingEmail = await Partner.findOne({
            email: payload.email.toLowerCase(),
            _id: { $ne: id },
        });
        if (existingEmail) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Email already in use by another partner.");
        }
    }

    if (payload.phone) {
        const existingPhone = await Partner.findOne({
            phone: payload.phone,
            _id: { $ne: id },
        });
        if (existingPhone) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Phone number already in use by another partner.");
        }
    }

    const updatedPartner = await Partner.findByIdAndUpdate(id, payload, { new: true });
    await cacheDelByPattern("cache:partner:*");
    return updatedPartner;
};

const deletePartner = async (id: string) => {
    const partner = await Partner.findOne({ _id: id, status: { $ne: 'deleted' } });
    if (!partner) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Partner not found.");
    }
    const result = await Partner.findByIdAndUpdate(id, { status: 'deleted' }, { new: true });
    await cacheDelByPattern("cache:partner:*");
    return result;
};

export const PartnerService = {
    createPartner,
    getAllPartners,
    getSinglePartner,
    updatePartner,
    deletePartner,
};

