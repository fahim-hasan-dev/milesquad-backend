export enum PARCEL_STATUS {
    CREATED = 'CREATED',
    CONFIRMED = 'CONFIRMED',
    PENDING = 'PENDING',
    RIDER_ASSIGNED = 'RIDER_ASSIGNED',
    ON_THE_WAY_TO_PICKUP = 'ON_THE_WAY_TO_PICKUP',
    PICKED_UP = 'PICKED_UP',
    ON_THE_WAY_TO_DELIVERY = 'ON_THE_WAY_TO_DELIVERY',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED'
}

export enum VEHICLE_TYPE {
    MOTORCYCLE = 'motorcycle',
    TRICYCLE = 'tricycle',
    VAN = 'van',
    CAR = 'car',
    TRUCK = 'truck'
}

export enum PAYMENT_METHOD {
    ONLINE = 'online',
    HAND_CASH = 'hand_cash',
}
