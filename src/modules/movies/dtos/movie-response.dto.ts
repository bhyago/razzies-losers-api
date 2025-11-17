import { z } from 'zod';

export const movieResponseSchema = z.object({
  year: z.number().int(),
  title: z.string(),
  studios: z.array(z.string()),
  producers: z.array(z.string()),
  winner: z.boolean(),
});

export type MovieResponseDto = z.infer<typeof movieResponseSchema>;
