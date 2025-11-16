import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

type MovieRecord = {
  year: number;
  title: string;
  studios: string;
  producers: string;
  winner: boolean;
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

  findAllMovies(): MovieRecord[] {
    const queryResult = this.connection.exec(`
      SELECT year, title, studios, producers, winner FROM movies
      ORDER BY year ASC, title ASC;
    `);

    if (!queryResult.length) {
      return [];
    }

    const [result] = queryResult;
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
}
