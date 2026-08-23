import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IPartner } from "./partner.interface";
import { Partner } from "./partner.model";

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
    return partner;
};

const getAllPartners = async (query: Record<string, unknown>) => {
    const partnerQuery = new QueryBuilder(
        Partner.find({ status: { $ne: 'deleted' } }),
        query
    )
        .search(["fullName", "email", "phone", "rolePosition"])
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
};

const getSinglePartner = async (id: string) => {
    const partner = await Partner.findOne({ _id: id, status: { $ne: 'deleted' } });
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
    return updatedPartner;
};

const deletePartner = async (id: string) => {
    const partner = await Partner.findOne({ _id: id, status: { $ne: 'deleted' } });
    if (!partner) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Partner not found.");
    }
    return await Partner.findByIdAndUpdate(id, { status: 'deleted' }, { new: true });
};

export const PartnerService = {
    createPartner,
    getAllPartners,
    getSinglePartner,
    updatePartner,
    deletePartner,
};
