import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

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
  private database: SqlJsDatabase | null = null;

  async onModuleInit() {
    const SQL = await initSqlJs({
      locateFile: (file) =>
        join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });

    this.database = new SQL.Database();
    this.createSchema();
    const movies = await this.loadMovies();
    this.seedMovies(movies);
    this.logger.log(
      `Carregamos ${movies.length} filmes no banco de dados em memória.`,
    );
  }

  get connection() {
    if (!this.database) {
      throw new Error('Banco de dados não inicializado.');
    }
    return this.database;
  }

  private createSchema() {
    this.connection.run(`
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        title TEXT NOT NULL,
        studios TEXT NOT NULL,
        producers TEXT NOT NULL,
        winner INTEGER NOT NULL
      );
    `);
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

  private seedMovies(movies: MovieRecord[]) {
    if (movies.length === 0) {
      return;
    }

    const insert = this.connection.prepare(`
      INSERT INTO movies (year, title, studios, producers, winner)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.connection.run('BEGIN TRANSACTION;');
    try {
      for (const movie of movies) {
        insert.run([
          movie.year,
          movie.title,
          movie.studios,
          movie.producers,
          movie.winner ? 1 : 0,
        ]);
      }
      insert.free();
      this.connection.run('COMMIT;');
    } catch (error) {
      insert.free();
      this.connection.run('ROLLBACK;');
      throw error;
    }
  }

  findMovies(
    filters: FindMoviesFilters = {},
    pagination?: MoviesPaginationOptions,
  ): MoviesQueryResult {
    const whereClause: string[] = [];

    if (typeof filters.year === 'number' && Number.isFinite(filters.year)) {
      whereClause.push(`year = ${filters.year}`);
    }

    if (typeof filters.winner === 'boolean') {
      whereClause.push(`winner = ${filters.winner ? 1 : 0}`);
    }

    const whereStatement = whereClause.length
      ? `WHERE ${whereClause.join(' AND ')}`
      : '';

    const { page, perPage, offset } = this.resolvePagination(pagination);

    const totalResult = this.connection.exec(`
      SELECT COUNT(*) as total FROM movies
      ${whereStatement};
    `);

    const total =
      totalResult.length && totalResult[0].values.length
        ? Number(totalResult[0].values[0][0])
        : 0;

    const queryResult = this.connection.exec(`
      SELECT year, title, studios, producers, winner FROM movies
      ${whereStatement}
      ORDER BY year ASC, title ASC
      LIMIT ${perPage}
      OFFSET ${offset};
    `);

    const items = queryResult.length ? this.mapResultRows(queryResult[0]) : [];

    return { total, page, perPage, items };
  }

  private mapResultRows(result: {
    columns: string[];
    values: Array<Array<string | number>>;
  }): MovieRecord[] {
    const { columns, values } = result;
    return values.map((row) => {
      const record: Record<string, string | number> = {};
      columns.forEach((column, columnIndex) => {
        record[column] = row[columnIndex];
      });
      return {
        year: record['year'] as number,
        title: record['title'] as string,
        studios: record['studios'] as string,
        producers: record['producers'] as string,
        winner: (record['winner'] as number) === 1,
      };
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
