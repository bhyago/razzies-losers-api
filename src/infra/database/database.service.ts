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
    const queryBuilder = this.moviesRepository.createQueryBuilder('movie');

    if (typeof filters.year === 'number' && Number.isFinite(filters.year)) {
      queryBuilder.andWhere('movie.year = :year', { year: filters.year });
    }
    if (typeof filters.winner === 'boolean') {
      queryBuilder.andWhere('movie.winner = :winner', {
        winner: filters.winner,
      });
    }

    const { page, perPage, offset } = this.resolvePagination(pagination);
    const [movies, total] = await queryBuilder
      .orderBy('movie.year', 'ASC')
      .addOrderBy('movie.title', 'ASC')
      .skip(offset)
      .take(perPage)
      .getManyAndCount();

    const items = movies.map((movie) => this.mapEntityToRecord(movie));
    return { total, page, perPage, items };
  }

  async findWinnerMovies(): Promise<MovieRecord[]> {
    const winners = await this.moviesRepository.find({
      where: { winner: true },
      order: { year: 'ASC', title: 'ASC' },
    });
    return winners.map((movie) => this.mapEntityToRecord(movie));
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
}
