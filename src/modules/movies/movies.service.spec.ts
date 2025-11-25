import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi } from 'vitest';
import {
  type DatabaseService,
  type MovieRecord,
} from '@/infra/database/database.service';
import { MoviesService } from './movies.service';

describe('MoviesService (unit)', () => {
  it('mede o desempenho do loop linear (map/hash) com 10k vencedores', async () => {
    const total = 10_000;
    const winners: MovieRecord[] = Array.from(
      { length: total },
      (_, index) => ({
        year: 1980 + index,
        title: `Movie ${index}`,
        studios: 'Studio',
        producers: `Producer ${index % 50}`,
        winner: true,
      }),
    );

    const findWinnerMovies = vi.fn().mockResolvedValue(winners);
    const databaseStub = { findWinnerMovies } as unknown as DatabaseService;
    const service = new MoviesService(databaseStub);

    const iterationCounters = { moviesLoop: 0, producersLoop: 0 };
    const originalSplit = (service as any).splitValueList;

    vi.spyOn(service as any, 'splitValueList').mockImplementation((value) => {
      iterationCounters.moviesLoop += 1;
      const producers = originalSplit.call(service, value);
      iterationCounters.producersLoop += producers.length;
      return producers;
    });

    const start = performance.now();
    const result = await service.getProducersAwardIntervals();
    const elapsedMs = performance.now() - start;

    expect(findWinnerMovies).toHaveBeenCalledOnce();
    expect(iterationCounters.moviesLoop).toBe(total);
    expect(iterationCounters.producersLoop).toBe(total);
    expect(result.min.length).toBeGreaterThan(0);
    expect(result.max.length).toBeGreaterThan(0);

    expect(elapsedMs).toBeLessThan(250);
  });
});
