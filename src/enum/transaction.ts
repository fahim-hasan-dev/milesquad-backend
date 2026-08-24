export enum TRANSACTION_TYPE {
    PAYMENT = 'payment',
    PAYOUT = 'payout',
    WALLET_CREDIT = 'wallet_credit',
    WALLET_DEBIT = 'wallet_debit',
    REFUND = 'refund',
}

export enum TRANSACTION_STATUS {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    REJECTED = 'rejected',
}
