import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './pushNotification.service';
import { FilterQuery } from 'mongoose';

const getNotificationFromDB = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.getNotificationFromDB(req.user, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Notifications Retrieved Successfully',
        data: result,
    });
}
); const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.getUnreadCountFromDB(req.user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Unread Notification Count Retrieved Successfully',
        data: result
    });
});


const sendTestPushNotification = catchAsync(async (req: Request, res: Response) => {
    const { token, title, body } = req.body;

    const result = await PushNotificationService.sendPushNotification(
        token || "c0UaCLXGSJ6JsC62K6NPq0:APA91bHzTTe3umtCk7TzNcOXN-aa3SPNQVOtgx6jwQvz1OiTDKLJEIPc-A-8Wn707pYzKnwDZA1nH2zDNvkxTPbpB7SUMAYO3odSW8PEFzCopYf930fNLHE",
        title || "Test Notification",
        body || "This is a test notification from the Backend Template! 🚀",
        {
            screen: "HOME",
            type: "TEST"
        }
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Test notification sent successfully',
        data: result
    });
});

export const NotificationController = {
    getNotificationFromDB,
    getUnreadCount,
    sendTestPushNotification
};
