import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_PER_PAGE = 50;

export type MovieRecord = {
  year: number;
  title: string;
  studios: string;
  producers: string;
  winner: boolean;
};

export type FindMoviesFilters = {
  winner?: boolean;
  year?: number;
};

export type MoviesPaginationOptions = {
  page?: number;
  perPage?: number;
};

export type MoviesQueryResult = {
  total: number;
  page: number;
  perPage: number;
  items: MovieRecord[];
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private movies: MovieRecord[] = [];

  async onModuleInit() {
    const movies = await this.loadMovies();
    this.movies = movies;
    this.logger.log(
      `Carregamos ${movies.length} filmes no banco de dados em memória.`,
    );
  }

  private async loadMovies(): Promise<MovieRecord[]> {
    const csvPath = join(__dirname, 'Movielist.csv');
    const fileContent = await readFile(csvPath, 'utf-8');
    const rows = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length === 0) {
      return [];
    }

    const dataRows = rows.slice(1);
    return dataRows.map((line, index) => this.mapCsvLineToMovie(line, index));
  }

  private mapCsvLineToMovie(line: string, index: number): MovieRecord {
    const [year, title, studios, producers, winner = ''] = line
      .split(';')
      .map((value) => value.trim());

    if (!year || !title || !studios || !producers) {
      throw new Error(
        `Linha ${index + 2} do CSV está incompleta e não pôde ser carregada.`,
      );
    }

    const yearValue = Number(year);
    if (Number.isNaN(yearValue)) {
      throw new Error(
        `Linha ${index + 2}: o ano "${year}" não é um número válido.`,
      );
    }

    return {
      year: yearValue,
      title,
      studios,
      producers,
      winner: winner.toLowerCase() === 'yes',
    };
  }

  findMovies(
    filters: FindMoviesFilters = {},
    pagination?: MoviesPaginationOptions,
  ): MoviesQueryResult {
    const filtered = this.movies.filter((movie) => {
      if (
        typeof filters.year === 'number' &&
        Number.isFinite(filters.year) &&
        movie.year !== filters.year
      ) {
        return false;
      }
      if (
        typeof filters.winner === 'boolean' &&
        movie.winner !== filters.winner
      ) {
        return false;
      }
      return true;
    });
    const { page, perPage, offset } = this.resolvePagination(pagination);
    const items = filtered
      .slice()
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        return a.title.localeCompare(b.title);
      })
      .slice(offset, offset + perPage);
    return { total: filtered.length, page, perPage, items };
  }

  findWinnerMovies(): MovieRecord[] {
    return this.movies
      .filter((movie) => movie.winner)
      .slice()
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        return a.title.localeCompare(b.title);
      });
  }

  private resolvePagination(options?: MoviesPaginationOptions) {
    const rawPage = options?.page ?? 1;
    const rawPerPage = options?.perPage ?? MAX_PER_PAGE;

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const perPageCandidate =
      Number.isInteger(rawPerPage) && rawPerPage > 0
        ? rawPerPage
        : MAX_PER_PAGE;
    const perPage = Math.min(perPageCandidate, MAX_PER_PAGE);
    const offset = (page - 1) * perPage;

    return { page, perPage, offset };
  }
}
