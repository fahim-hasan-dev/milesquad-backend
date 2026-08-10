import config from '../../config'
import { USER_ROLES, USER_STATUS } from '../../enum/user'
import { User } from '../modules/user/user.model'
import { logger } from '../../shared/logger'
import colors from 'colors'

export const seedAdmin = async () => {
    const adminEmail = config.super_admin.email
    const adminPassword = config.super_admin.password

    if (!adminEmail || !adminPassword) {
        logger.warn(
            colors.yellow(
                '⚠️ Admin email or password is not configured in .env. Skipping admin seeding.'
            )
        )
        return
    }

    try {
        // Check if an admin user already exists (by role 'admin' or by configured admin email)
        const isAdminExist = await User.findOne({
            $or: [
                { role: USER_ROLES.ADMIN },
                { email: adminEmail }
            ]
        })

        if (isAdminExist) {
            logger.info(
                colors.blue(
                    'ℹ️ Admin account already exists. Skipping admin creation.'
                )
            )
            return
        }

        // Split name or use elegant defaults
        const adminName = config.super_admin.name || 'Admin System'
        const nameParts = adminName.trim().split(/\s+/)
        const firstName = nameParts[0] || 'Admin'
        const lastName = nameParts.slice(1).join(' ') || 'System'

        // Construct the admin user data
        const adminData = {
            email: adminEmail,
            password: adminPassword,
            firstName,
            lastName,
            role: USER_ROLES.ADMIN,
            verified: true,
            status: USER_STATUS.ACTIVE,
        }

        // Create the admin user
        await User.create(adminData)
        logger.info(colors.green('🚀 Admin account created successfully!'))
    } catch (error) {
        logger.error(colors.red('❌ Failed to seed admin account:'), error)
    }
}
