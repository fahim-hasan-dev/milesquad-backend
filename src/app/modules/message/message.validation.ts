import { z } from 'zod';
import { MESSAGE } from '../../../enum/message';

export const sendMessageZod = z.object({
    body: z.object({
        chatId: z.string().min(1, 'Chat ID is required'),
        text: z.string().optional(),
        files: z.array(z.string()).optional(),
        type: z.nativeEnum(MESSAGE).optional(),
    }).refine(
        (data) => data.text || data.files,
        {
            message: 'Either text or files must be provided',
        }
    ),
});

export const getMessageZod = z.object({
    params: z.object({
        id: z.string().min(1, 'Chat ID is required'),
    }),
});

export const markAsReadZod = z.object({
    params: z.object({
        chatId: z.string().min(1, 'Chat ID is required'),
    }),
});
