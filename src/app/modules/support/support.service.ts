import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ISupportTicket } from './support.interface';
import { SupportTicket } from './support.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { Counter } from '../counter/counter.model';
import { NotificationService } from '../notification/notification.service';
import { USER_ROLES } from '../../../enum/user';

const getNextTicketCustomId = async (): Promise<string> => {
    const sequenceDocument = await Counter.findOneAndUpdate(
        { id: 'SUPPORT' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    const paddedSeq = sequenceDocument.seq.toString().padStart(3, '0');
    return `SUP-${paddedSeq}`;
};

const createSupportTicket = async (payload: Partial<ISupportTicket>, userId: string): Promise<ISupportTicket> => {
    const ticketId = await getNextTicketCustomId();

    const ticketData: Partial<ISupportTicket> = {
        ...payload,
        ticketId,
        user: userId as any,
        status: 'pending',
    };

    const ticket = await SupportTicket.create(ticketData);
    return ticket;
};

const getAllSupportTickets = async (query: Record<string, unknown>, userId?: string, userRole?: string) => {
    const filter: Record<string, any> = {};
    if (userRole === USER_ROLES.CUSTOMER || userRole === USER_ROLES.DRIVER) {
        filter.user = userId;
    }

    const supportQueryBuilder = new QueryBuilder(
        SupportTicket.find(filter).populate('user', 'fullName email phone image role userId'),
        query
    )
        .search(['title', 'ticketId', 'message'])
        .filter()
        .sort()
        .fields()
        .paginate();

    const tickets = await supportQueryBuilder.modelQuery.lean();
    const paginationInfo = await supportQueryBuilder.getPaginationInfo();

    return {
        data: tickets,
        meta: paginationInfo,
    };
};

const getSingleSupportTicket = async (id: string): Promise<ISupportTicket> => {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isObjectId ? { _id: id } : { ticketId: id.toUpperCase() };

    const ticket = await SupportTicket.findOne(filter).populate('user', 'fullName email phone image role userId');
    if (!ticket) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Support ticket not found');
    }
    return ticket;
};

const replySupportTicket = async (
    id: string,
    payload: { reply: string; status?: 'pending' | 'solved' | 'closed' }
): Promise<ISupportTicket> => {
    const ticket = await getSingleSupportTicket(id);

    const updateObj: Record<string, any> = {
        reply: payload.reply,
    };

    if (payload.status) {
        updateObj.status = payload.status;
    } else {
        updateObj.status = 'solved';
    }

    const updatedTicket = await SupportTicket.findByIdAndUpdate(ticket._id, updateObj, { new: true });

    if (!updatedTicket) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Support ticket update failed');
    }

    if (ticket.user) {
        try {
            await NotificationService.insertNotification({
                receiver: (ticket.user as any)._id || (ticket.user as any),
                title: 'Support Ticket Update',
                message: `Admin has replied to your support ticket #${ticket.ticketId}: "${payload.reply.slice(0, 80)}..."`,
                screen: 'SUPPORT',
                type: (ticket.user as any).role || USER_ROLES.CUSTOMER,
            });
        } catch (err) {
            console.log('Failed to send support notification:', err);
        }
    }

    return updatedTicket;
};

const updateSupportTicketStatus = async (
    id: string,
    status: 'pending' | 'solved' | 'closed'
): Promise<ISupportTicket> => {
    const ticket = await getSingleSupportTicket(id);

    const updatedTicket = await SupportTicket.findByIdAndUpdate(
        ticket._id,
        { status },
        { new: true }
    );

    if (!updatedTicket) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update support ticket status');
    }

    return updatedTicket;
};

const deleteSupportTicket = async (id: string): Promise<ISupportTicket> => {
    const ticket = await getSingleSupportTicket(id);
    const deleted = await SupportTicket.findByIdAndDelete(ticket._id);
    if (!deleted) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Support ticket not found for deletion');
    }
    return deleted;
};

export const SupportService = {
    createSupportTicket,
    getAllSupportTickets,
    getSingleSupportTicket,
    replySupportTicket,
    updateSupportTicketStatus,
    deleteSupportTicket,
};
