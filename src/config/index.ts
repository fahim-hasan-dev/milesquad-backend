/* eslint-disable no-undef */
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env') })

export default {
    ip_address: process.env.IP_ADDRESS,
    database_url: process.env.DATABASE_URL,
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    firebase_service_account_base64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
    jwt: {
        jwt_secret: process.env.JWT_SECRET,
        jwt_expire_in: process.env.JWT_EXPIRE_IN,
        jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
        jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRES_IN,
        temp_jwt_secret: process.env.TEMP_JWT_SECRET || process.env.JWT_SECRET
    },
    email: {
        from: process.env.EMAIL_FROM,
        user: process.env.EMAIL_USER,
        port: process.env.EMAIL_PORT,
        host: process.env.EMAIL_HOST,
        pass: process.env.EMAIL_PASS,
    },
    super_admin: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        name: process.env.ADMIN_NAME,
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        twilioNumber: process.env.TWILIO_NUMBER
    },
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    },
    frontend_url: process.env.FRONTEND_URL,
    backend_url: process.env.BACKEND_URL,
    stripe: {
        stripeSecretKey: process.env.STRIPE_API_SECRET,
        webhookSecret: process.env.WEBHOOK_SECRET,
        paymentSuccess: process.env.SUCCESS_URL,
        frontendUrl: process.env.FRONTEND_URL,
    },
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
    },
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
}
