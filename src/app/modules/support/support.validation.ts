import { z } from 'zod';

const createSupportTicketZodSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        message: z.string().min(1, 'Message is required'),
        files: z.array(z.string()).optional(),
    }),
});

const replySupportTicketZodSchema = z.object({
    body: z.object({
        reply: z.string().min(1, 'Reply message is required'),
        status: z.enum(['pending', 'solved', 'closed']).optional(),
    }),
});

const updateSupportTicketStatusZodSchema = z.object({
    body: z.object({
        status: z.enum(['pending', 'solved', 'closed']),
    }),
});

export const SupportValidation = {
    createSupportTicketZodSchema,
    replySupportTicketZodSchema,
    updateSupportTicketStatusZodSchema,
};
