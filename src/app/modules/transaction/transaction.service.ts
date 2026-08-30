import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../builder/QueryBuilder";
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from "../../../enum/transaction";
import { ITransaction } from "./transaction.interface";
import { Transaction } from "./transaction.model";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enum/user";
import { NotificationService } from "../notification/notification.service";
import { getNextCustomId } from "../counter/counter.model";
import { cacheDel } from "../../../helpers/cacheHelper";

const createTransaction = async (payload: Partial<ITransaction>) => {
    if (!payload.transactionId) {
        payload.transactionId = await getNextCustomId("TXN");
    }
    const transaction = await Transaction.create(payload);
    return transaction;
};

const getMyTransactions = async (userId: string, query: Record<string, unknown>) => {
    const defaultFields = "transactionId type status amount paymentMethod createdAt user parcel";
    const selectedFields = query.fields ? (query.fields as string).split(',').join(' ') : defaultFields;

    const transactionQuery = new QueryBuilder(
        Transaction.find({ user: userId }),
        query
    )
        .search(["transactionId", "description", "paymentMethod"])
        .filter()
        .sort()
        .paginate();

    transactionQuery.modelQuery.select(selectedFields).lean();

    const result = await transactionQuery.modelQuery;
    const meta = await transactionQuery.getPaginationInfo();

    return {
        meta,
        data: result,
    };
};

const getAllTransactions = async (query: Record<string, unknown>) => {
    const transactionQuery = new QueryBuilder(
        Transaction.find().populate({
            path: "user parcel",
            select: "userId parcelId fullName phone email role goodType totalDeliveryFee"
        }),
        query
    )
        .search(["transactionId", "description", "paymentMethod", "accountDetails"])
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await transactionQuery.modelQuery;
    const meta = await transactionQuery.getPaginationInfo();

    return {
        meta,
        data: result,
    };
};

const getSingleTransaction = async (id: string) => {
    const transaction = await Transaction.findById(id).populate("user parcel");
    if (!transaction) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Transaction record not found.");
    }
    return transaction;
};

const requestPayout = async (
    driverId: string,
    amount: number,
    accountDetails: string,
    description?: string
) => {
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== USER_ROLES.DRIVER) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Driver profile not found.");
    }

    const currentWalletBalance = driver.driverInfo?.wallet || 0;
    if (currentWalletBalance < amount) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Insufficient wallet balance. Available balance: $${currentWalletBalance}`
        );
    }

    const transactionId = await getNextCustomId("TXN");

    const transaction = await Transaction.create({
        transactionId,
        user: driverId,
        amount,
        type: TRANSACTION_TYPE.PAYOUT,
        status: TRANSACTION_STATUS.PENDING,
        accountDetails,
        description: description || `Payout request of $${amount} to ${accountDetails}`,
    });

    return transaction;
};

const updatePayoutStatus = async (
    id: string,
    status: TRANSACTION_STATUS,
    rejectReason?: string
) => {
    const transaction = await Transaction.findById(id);
    if (!transaction) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Transaction not found.");
    }

    if (transaction.type !== TRANSACTION_TYPE.PAYOUT) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Only payout transactions can be updated.");
    }

    if (transaction.status !== TRANSACTION_STATUS.PENDING) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Payout request is already processed with status: ${transaction.status}`
        );
    }

    const driver = await User.findById(transaction.user);
    if (!driver) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Driver not found.");
    }

    if (status === TRANSACTION_STATUS.COMPLETED) {
        const currentWallet = driver.driverInfo?.wallet || 0;
        if (currentWallet < transaction.amount) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Driver wallet balance ($${currentWallet}) is lower than payout amount ($${transaction.amount}).`
            );
        }

        await User.findByIdAndUpdate(driver._id, {
            $inc: { 'driverInfo.wallet': -transaction.amount },
        });

        // Invalidate driver profile cache
        const driverIdStr = driver._id.toString();
        await cacheDel(`cache:user:profile:${driverIdStr}`, `cache:user:single:${driverIdStr}`);

        transaction.status = TRANSACTION_STATUS.COMPLETED;
        await transaction.save();

        try {
            await NotificationService.insertNotification({
                receiver: driver._id,
                title: "Payout Approved",
                message: `Your payout request of $${transaction.amount} has been approved and processed.`,
                screen: "WALLET",
                type: USER_ROLES.DRIVER,
            });
        } catch (err) {
            console.log("Failed to send notification:", err);
        }
    } else {
        transaction.status = status;
        transaction.rejectReason = rejectReason || "";
        await transaction.save();

        try {
            await NotificationService.insertNotification({
                receiver: driver._id,
                title: "Payout Request Update",
                message: `Your payout request of $${transaction.amount} was ${status}.${rejectReason ? ` Reason: ${rejectReason}` : ''}`,
                screen: "WALLET",
                type: USER_ROLES.DRIVER,
            });
        } catch (err) {
            console.log("Failed to send notification:", err);
        }
    }

    return transaction;
};

const exportTransactionsData = async (query: Record<string, any>) => {
    const { startDate, endDate, status, type, filter } = query;

    const filterObj: Record<string, any> = {};

    if (type) {
        filterObj.type = new RegExp(`^${type.trim()}$`, "i");
    }

    if (startDate || endDate) {
        filterObj.createdAt = {};
        if (startDate) {
            filterObj.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filterObj.createdAt.$lte = end;
        }
    }

    const statusVal = filter || status;
    if (statusVal && statusVal.toUpperCase() !== "ALL") {
        filterObj.status = new RegExp(`^${statusVal.trim()}$`, "i");
    }

    const transactions = await Transaction.find(filterObj)
        .populate("user parcel")
        .sort({ createdAt: -1 });

    return transactions.map((tx: any) => {
        return {
            "Transaction ID": tx.transactionId || `#${tx._id.toString().slice(-6).toUpperCase()}`,
            "Date": tx.createdAt ? new Date(tx.createdAt).toISOString().replace("T", " ").substring(0, 19) : "",
            "User Name": tx.user?.fullName || "N/A",
            "User Email": tx.user?.email || "N/A",
            "User Phone": tx.user?.phone || "N/A",
            "Parcel ID": tx.parcel?.parcelId || (tx.parcel?._id ? `#${tx.parcel._id.toString().slice(-6).toUpperCase()}` : "N/A"),
            "Type": (tx.type || "").toUpperCase(),
            "Amount (XOF)": tx.amount || 0,
            "Payment Method": (tx.paymentMethod || "N/A").replace(/_/g, " ").toUpperCase(),
            "Status": (tx.status || "").toUpperCase(),
            "Description": tx.description || tx.accountDetails || "N/A",
        };
    });
};

export const TransactionService = {
    createTransaction,
    getMyTransactions,
    getAllTransactions,
    getSingleTransaction,
    requestPayout,
    updatePayoutStatus,
    exportTransactionsData,
};
