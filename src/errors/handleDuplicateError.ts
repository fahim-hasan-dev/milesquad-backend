import { IGenericErrorMessage } from '../interfaces/error';

const handleDuplicateError = (error: any) => {
    const match = error.message.match(/"([^"]*)"/);
    const name = match && match[1];
    const errors: IGenericErrorMessage[] = [
        {
            path: '',
            message: `${name} is already exists`,
        },
    ];

    const statusCode = 409;
    return {
        statusCode,
        message: 'Duplicate Key Error',
        errorMessages: errors,
    };
};

export default handleDuplicateError;
