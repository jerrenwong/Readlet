import { z } from "zod";

export const entrySchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z
    .string()
    .trim()
    .max(2000)
    .url()
    .refine((u) => /^https?:\/\//i.test(u))
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export type EntryInput = z.infer<typeof entrySchema>;
