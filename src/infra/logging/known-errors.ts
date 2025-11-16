import { HttpStatus } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';

type Ctor<T> = new (...args: any[]) => T;

export interface KnownErrorInfo {
  match: Ctor<Error>;
  status: number;
}

export const KNOWN_ERRORS: KnownErrorInfo[] = [
  {
    match: ZodValidationException as unknown as new (...args: any[]) => Error,
    status: HttpStatus.UNPROCESSABLE_ENTITY,
  },
];

export function classifyKnownError(
  err: unknown,
):
  | { isKnown: true; status: number; name: string; message: string }
  | { isKnown: false } {
  if (!(err instanceof Error)) return { isKnown: false };
  for (const entry of KNOWN_ERRORS) {
    if (err instanceof entry.match) {
      return {
        isKnown: true,
        status: entry.status,
        name: err.name ?? entry.match.name,
        message: err.message,
      } as const;
    }
  }
  return { isKnown: false } as const;
}
