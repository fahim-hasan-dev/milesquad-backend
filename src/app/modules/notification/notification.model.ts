import { model, Schema } from 'mongoose';
import { INotification, NotificationModel } from './notification.interface';

const notificationSchema = new Schema<INotification, NotificationModel>(
    {
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        receiver: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        referenceId: {
            type: Schema.Types.ObjectId,
            required: false
        },
        screen: {
            type: String,
            required: false
        },
        read: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true
    }
);

export const Notification = model<INotification, NotificationModel>(
    'Notification',
    notificationSchema
);
