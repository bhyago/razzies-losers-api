import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { SchemaValidation } from '@/common/schema-validation-type';

export const producerIntervalEntrySchema = z.object({
  producer: z.string(),
  interval: z.number().int().min(0),
  previousWin: z.number().int(),
  followingWin: z.number().int(),
});

export const ProducersIntervalSchemaValidation = {
  response: z.object({
    min: z.array(producerIntervalEntrySchema),
    max: z.array(producerIntervalEntrySchema),
  }),
} satisfies SchemaValidation;

export namespace ProducersIntervalDTO {
  export class ProducersIntervalResponse extends createZodDto(
    ProducersIntervalSchemaValidation.response,
  ) {}
}

export type ProducerIntervalEntry = z.infer<typeof producerIntervalEntrySchema>;
export type ProducersIntervalResponseDto = z.infer<
  typeof ProducersIntervalSchemaValidation.response
>;
