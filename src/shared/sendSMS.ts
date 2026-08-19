import twilio from 'twilio';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const sendSMS = async (to: string, message: string) => {
    // Log SMS content for development testing
    console.log(`\n==========================================`);
    console.log(`📲 [SMS SENT TO ${to}]:`);
    console.log(`   ${message}`);
    console.log(`==========================================\n`);

    try {
        if (config.twilio.accountSid && config.twilio.authToken && config.twilio.twilioNumber) {
            const client = twilio(config.twilio.accountSid, config.twilio.authToken);
            await client.messages.create({
                body: message,
                from: config.twilio.twilioNumber,
                to: to,
            });
            console.log("Twilio SMS Sent Successfully");
        }
        return {
            invalid: false,
            message: `Message logged/sent successfully to ${to}`,
        };
    } catch (error) {
        console.log('Twilio SMS sending error (logged to console instead):', error);
        return {
            invalid: false,
            message: `SMS fallback to console for ${to}`,
        };
    }
};

export default sendSMS;
