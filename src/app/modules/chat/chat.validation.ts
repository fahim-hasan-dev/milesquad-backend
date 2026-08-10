import { z } from 'zod';

export const createChatZod = z.object({
    body: z.object({
        participant: z.string().min(1, 'Participant ID is required'),
    }),
});

export const deleteChatZod = z.object({
    params: z.object({
        id: z.string().min(1, 'Chat ID is required'),
    }),
});
