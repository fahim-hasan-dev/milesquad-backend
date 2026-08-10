import express, { Request, Response } from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import { Morgan } from "./shared/morgan";
import router from './app/routes';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import requestIp from 'request-ip';
import rateLimit from 'express-rate-limit';
import ApiError from "./errors/ApiError";
import compression from "compression";
const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        if (!req.clientIp) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Unable to determine client IP!');
        }
        return req.clientIp;
    },
    handler: (req, res, next, options) => {
        throw new ApiError(options?.statusCode, `Rate limit exceeded. Try again in ${options.windowMs / 60000} minutes.`);
    }
});


// morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);


//body parser
app.use(cors());
app.use('/api/v1/webhook', express.raw({ type: 'application/json' })); // Global webhook path
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIp.mw());
// app.use(limiter);

//file retrieve
app.use(express.static('uploads'));

//router
app.use('/api/v1', router);




app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to the Backend Template!");
})

//global error handle
app.use(globalErrorHandler);

// handle not found route
app.use((req: Request, res: Response) => {
    res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Not Found",
        errorMessages: [
            {
                path: req.originalUrl,
                message: "API DOESN'T EXIST"
            }
        ]
    })
});

export default app;
