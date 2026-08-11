import config from '../../config';
import { ADMIN_ROLES, USER_STATUS } from '../../enum/user';
import { Admin } from '../modules/admin/admin.model';
import { logger } from '../../shared/logger';
import colors from 'colors';

export const seedAdmin = async () => {
    const adminEmail = config.super_admin.email;
    const adminPassword = config.super_admin.password;

    if (!adminEmail || !adminPassword) {
        logger.warn(colors.yellow('⚠️ Super Admin email/password not configured in .env. Skipping seeding.'));
        return;
    }

    try {
        const isSuperAdminExist = await Admin.findOne({
            $or: [
                { role: ADMIN_ROLES.SUPER_ADMIN },
                { email: adminEmail }
            ]
        });

        if (isSuperAdminExist) {
            logger.info(colors.blue('ℹ️ Super Admin account already exists. Skipping creation.'));
            return;
        }

        const adminData = {
            fullName: config.super_admin.name || 'Super Admin',
            email: adminEmail,
            password: adminPassword,
            role: ADMIN_ROLES.SUPER_ADMIN,
            status: USER_STATUS.ACTIVE,
        };

        await Admin.create(adminData);
        logger.info(colors.green('🚀 Super Admin account seeded successfully!'));
    } catch (error) {
        logger.error(colors.red('❌ Failed to seed Super Admin account:'), error);
    }
};
