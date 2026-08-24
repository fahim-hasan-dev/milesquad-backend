import express from 'express';
import handleStripeWebhook from '../../stripe/handleStripeWebhook';
import { UserRoutes } from '../modules/user/user.route';
import { AuthRoutes } from '../modules/auth/auth.route';
import { AdminRoutes } from '../modules/admin/admin.route';
import { ReviewRoutes } from '../modules/review/review.route';
import { PaymentRoutes } from '../modules/payment/payment.route';
import { PublicRoutes } from '../modules/public/public.route';
import { TokenRoutes } from '../modules/token/token.route';
import { ChatRoutes } from '../modules/chat/chat.routes';
import { MessageRoutes } from '../modules/message/message.routes';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { ParcelRoutes } from '../modules/parcel/parcel.route';
import { SettingRoutes } from '../modules/setting/setting.route';
import { AdminStatsRoutes } from '../modules/adminStats/adminStats.routes';
import { DriverStatsRoutes } from '../modules/driverStats/driverStats.route';
import { PartnerRoutes } from '../modules/partner/partner.route';
import { TransactionRoutes } from '../modules/transaction/transaction.route';

const router = express.Router();

const apiRoutes = [
    { path: "/user", route: UserRoutes },
    { path: "/auth", route: AuthRoutes },
    { path: "/admin", route: AdminRoutes },
    { path: "/review", route: ReviewRoutes },
    { path: "/payment", route: PaymentRoutes },
    { path: "/public", route: PublicRoutes },
    { path: "/token", route: TokenRoutes },
    { path: "/chat", route: ChatRoutes },
    { path: "/message", route: MessageRoutes },
    { path: "/notification", route: NotificationRoutes },
    { path: "/parcel", route: ParcelRoutes },
    { path: "/settings", route: SettingRoutes },
    { path: "/admin-stats", route: AdminStatsRoutes },
    { path: "/driver-stats", route: DriverStatsRoutes },
    { path: "/partner", route: PartnerRoutes },
    { path: "/transaction", route: TransactionRoutes },
];

router.post('/webhook', handleStripeWebhook);

apiRoutes.forEach(route => router.use(route.path, route.route));
export default router;
