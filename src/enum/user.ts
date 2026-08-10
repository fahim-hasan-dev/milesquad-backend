export enum USER_ROLES {
    ADMIN = "admin",
    SUPER_ADMIN = "super_admin",
    USER = "user",
    SENDER = "sender",
    DRIVER = "driver"
}

export enum USER_STATUS {
    PENDING = 'pending',
    ACTIVE = 'active',
    RESTRICTED = 'restricted',
    DELETED = 'deleted',
}

export enum ADMIN_ROLES {
    ADMIN = "admin",
    SUPER_ADMIN = "super_admin"
}

export enum PROFILE_VERIFICATION_STATUS {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    RESUBMITTED = 'resubmitted',
}
