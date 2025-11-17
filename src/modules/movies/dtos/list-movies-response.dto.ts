import { MovieResponseDto } from './movie-response.dto';
import { createZodDto } from 'nestjs-zod';
import type { SchemaValidation } from '@/common/schema-validation-type';
import { z } from 'zod';
export type ListMoviesResponseDto = {
  total: number;
  page: number;
  perPage: number;
  items: MovieResponseDto[];
};

export const movieResponseSchema = z.object({
  year: z.number().int(),
  title: z.string(),
  studios: z.array(z.string()),
  producers: z.array(z.string()),
  winner: z.boolean(),
});

const TRUE_VALUES = ['true', '1', 'yes'] as const;
const FALSE_VALUES = ['false', '0', 'no'] as const;
export const ListMoviesSchemaValidation = {
  queryParams: z.object({
    year: z.coerce.number().positive().optional(),
    winner: z.enum([...TRUE_VALUES, ...FALSE_VALUES]).optional(),
    perPage: z.coerce.number().positive().min(0).max(50).default(50).optional(),
    page: z.coerce.number().optional(),
  }),
  response: z.object({
    total: z.number().min(0),
    page: z.number().min(1),
    perPage: z.number().min(1),
    items: z.array(movieResponseSchema),
  }),
} satisfies SchemaValidation;

export namespace ListMoviesDTO {
  export class ListMoviesQueryValidation extends createZodDto(
    ListMoviesSchemaValidation.queryParams,
  ) {}
  export class ListMoviesInput extends createZodDto(
    ListMoviesSchemaValidation.queryParams,
  ) {}
  export class ListMoviesOutput extends createZodDto(
    ListMoviesSchemaValidation.response,
  ) {}
}
