import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieEntity } from './entities/movie.entity';

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

  constructor(
    @InjectRepository(MovieEntity)
    private readonly moviesRepository: Repository<MovieEntity>,
  ) {}

  async onModuleInit() {
    const movies = await this.loadMovies();
    await this.populateDatabase(movies);
    this.logger.log(
      `Carregamos ${movies.length} filmes no banco de dados em memória.`,
    );
  }

  async loadCustomSeed(records: MovieRecord[]) {
    await this.populateDatabase(records);
    this.logger.log(
      `Seed customizada carregada com ${records.length} registros.`,
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

  private async populateDatabase(movies: MovieRecord[]) {
    await this.moviesRepository.manager.transaction(async (manager) => {
      await manager.getRepository(MovieEntity).clear();
      if (movies.length === 0) {
        return;
      }
      const entries = movies.map((movie) =>
        manager.create(MovieEntity, {
          year: movie.year,
          title: movie.title,
          studios: movie.studios,
          producers: movie.producers,
          winner: movie.winner,
        }),
      );
      await manager.save(entries);
    });
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

  async findMovies(
    filters: FindMoviesFilters = {},
    pagination?: MoviesPaginationOptions,
  ): Promise<MoviesQueryResult> {
    const { page, perPage, offset } = this.resolvePagination(pagination);
    const { whereClause, parameters } = this.buildFilterQuery(filters);

    const rows: Array<
      MovieRecord & {
        total: number;
      }
    > = await this.moviesRepository.query(
      `
      SELECT
        year,
        title,
        studios,
        producers,
        winner,
        COUNT(*) OVER () AS total
      FROM movies
      ${whereClause}
      ORDER BY year ASC, title ASC
      LIMIT ? OFFSET ?
      `,
      [...parameters, perPage, offset],
    );

    const total = rows.length > 0 ? Number(rows[0].total ?? 0) : 0;
    const items = rows.map((row: any) => this.mapRowToRecord(row));
    return { total, page, perPage, items };
  }

  async findWinnerMovies(): Promise<MovieRecord[]> {
    const winners = await this.moviesRepository.query(
      `
      SELECT year, title, studios, producers, winner
      FROM movies
      WHERE winner = 1
      ORDER BY year ASC, title ASC
      `,
    );
    return winners.map((row: any) => this.mapRowToRecord(row));
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

  private mapEntityToRecord(movie: MovieEntity): MovieRecord {
    return {
      year: movie.year,
      title: movie.title,
      studios: movie.studios,
      producers: movie.producers,
      winner: movie.winner,
    };
  }

  private buildFilterQuery(filters: FindMoviesFilters) {
    const clauses: string[] = [];
    const parameters: Array<string | number> = [];

    if (typeof filters.year === 'number' && Number.isFinite(filters.year)) {
      clauses.push('year = ?');
      parameters.push(filters.year);
    }
    if (typeof filters.winner === 'boolean') {
      clauses.push('winner = ?');
      parameters.push(filters.winner ? 1 : 0);
    }

    const whereClause =
      clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    return { whereClause, parameters };
  }

  private mapRowToRecord(row: any): MovieRecord {
    return {
      year: Number(row.year),
      title: row.title,
      studios: row.studios,
      producers: row.producers,
      winner:
        typeof row.winner === 'boolean' ? row.winner : Number(row.winner) === 1,
    };
  }
}
