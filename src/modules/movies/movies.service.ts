import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  FindMoviesFilters,
  MovieRecord,
  MoviesPaginationOptions,
} from '@/infra/database/database.service';
import { ListMoviesDTO } from './dtos/list-movies-response.dto';
import { ProducersIntervalResponseDto } from './dtos/producer-interval-response.dto';

type ProducerInterval = {
  producer: string;
  previousWin: number;
  followingWin: number;
  interval: number;
};

@Injectable()
export class MoviesService {
  constructor(private readonly database: DatabaseService) {}

  async findMany(
    input: ListMoviesDTO.ListMoviesInput,
  ): Promise<ListMoviesDTO.ListMoviesOutput> {
    const filters: FindMoviesFilters = {};

    if (typeof input.year === 'number' && Number.isFinite(input.year)) {
      filters.year = input.year;
    }

    const winnerFilter = this.normalizeWinnerFilter(input.winner);
    if (typeof winnerFilter === 'boolean') {
      filters.winner = winnerFilter;
    }

    const pagination: MoviesPaginationOptions = {
      page: input.page,
      perPage: input.perPage,
    };

    const result = await this.database.findMovies(filters, pagination);
    return {
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      items: result.items.map((movie) => ({
        year: movie.year,
        title: movie.title,
        studios: this.splitValueList(movie.studios),
        producers: this.splitValueList(movie.producers),
        winner: movie.winner,
      })),
    };
  }

  async getProducersAwardIntervals(): Promise<ProducersIntervalResponseDto> {
    const winners = await this.database.findWinnerMovies();
    const intervals = this.calculateProducerIntervals(winners);

    if (intervals.length === 0) {
      return { min: [], max: [] };
    }

    const minInterval = Math.min(...intervals.map((item) => item.interval));
    const maxInterval = Math.max(...intervals.map((item) => item.interval));

    return {
      min: this.sortIntervalEntries(
        intervals.filter((item) => item.interval === minInterval),
      ),
      max: this.sortIntervalEntries(
        intervals.filter((item) => item.interval === maxInterval),
      ),
    };
  }

  private calculateProducerIntervals(
    movies: MovieRecord[],
  ): ProducerInterval[] {
    const producerWins = new Map<string, number[]>();

    for (const movie of movies) {
      const producers = this.splitValueList(movie.producers);
      for (const producer of producers) {
        if (!producerWins.has(producer)) {
          producerWins.set(producer, []);
        }
        producerWins.get(producer)!.push(movie.year);
      }
    }

    const intervals: ProducerInterval[] = [];

    for (const [producer, wins] of producerWins.entries()) {
      if (wins.length < 2) {
        continue;
      }
      wins.sort((a, b) => a - b);
      for (let index = 1; index < wins.length; index++) {
        intervals.push({
          producer,
          previousWin: wins[index - 1],
          followingWin: wins[index],
          interval: wins[index] - wins[index - 1],
        });
      }
    }
    return intervals;
  }

  private sortIntervalEntries(entries: ProducerInterval[]) {
    return entries.sort((a, b) => {
      if (a.interval !== b.interval) {
        return a.interval - b.interval;
      }
      if (a.followingWin !== b.followingWin) {
        return a.followingWin - b.followingWin;
      }
      return a.producer.localeCompare(b.producer);
    });
  }

  private splitValueList(value: string) {
    return value
      .split(/\s*(?:,|\band\b)\s*/i)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeWinnerFilter(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no'].includes(normalized)) {
        return false;
      }
    }
    return undefined;
  }
}
