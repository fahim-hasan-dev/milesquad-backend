import express from 'express';
import { AdminStatsController } from './adminStats.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.get(
    '/overview',
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AdminStatsController.getAdminDashboardStats
);

export const AdminStatsRoutes = router;
