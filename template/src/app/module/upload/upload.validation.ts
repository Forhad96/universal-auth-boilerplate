import z from "zod";

export const uploadFileSchema = z.object({
    size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
    originalname: z.string().min(1, "File is required"),
});