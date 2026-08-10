import { Model, Types } from 'mongoose';
import { USER_ROLES } from '../../../enum/user';

export type INotification = {
    title: string;
    message: string;
    receiver: Types.ObjectId;
    read: boolean;
    referenceId?: Types.ObjectId;
    screen?: string;
    type: USER_ROLES | string;
};

export type NotificationModel = Model<INotification>;