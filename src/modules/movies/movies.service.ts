import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  FindMoviesFilters,
  MoviesPaginationOptions,
} from '@/infra/database/database.service';
import { ListMoviesResponseDto } from './dtos/list-movies-response.dto';

@Injectable()
export class MoviesService {
  constructor(private readonly database: DatabaseService) {}

  findMany(
    filters: FindMoviesFilters = {},
    pagination?: MoviesPaginationOptions,
  ): ListMoviesResponseDto {
    const result = this.database.findMovies(filters, pagination);
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

  private splitValueList(value: string) {
    return value
      .split(/\s*(?:,|\band\b)\s*/i)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
