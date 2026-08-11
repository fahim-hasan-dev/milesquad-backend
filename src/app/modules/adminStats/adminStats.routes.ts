import express from 'express';
import { AdminStatsController } from './adminStats.controller';
import auth from '../../middleware/auth';
import { ADMIN_ROLES } from '../../../enum/user';

const router = express.Router();

router.get(
    '/overview',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
    AdminStatsController.getAdminDashboardStats
);

export const AdminStatsRoutes = router;
