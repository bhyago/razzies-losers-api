import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { ListMoviesResponseDto } from './dtos/list-movies-response.dto';

const TRUE_VALUES = ['true', '1', 'yes'];
const FALSE_VALUES = ['false', '0', 'no'];

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  listMovies(
    @Query('winner') winner?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): ListMoviesResponseDto {
    const filters = {
      ...this.parseWinnerFilter(winner),
      ...this.parseYearFilter(year),
    };
    const pagination = this.parsePagination(page, perPage);
    return this.moviesService.findMany(filters, pagination);
  }

  private parseWinnerFilter(winner?: string) {
    if (typeof winner === 'undefined') {
      return {};
    }

    const normalized = winner.trim().toLowerCase();
    if (TRUE_VALUES.includes(normalized)) {
      return { winner: true };
    }
    if (FALSE_VALUES.includes(normalized)) {
      return { winner: false };
    }

    throw new BadRequestException(
      `Parâmetro "winner" inválido: ${winner}. Utilize true/false.`,
    );
  }

  private parseYearFilter(year?: string) {
    if (typeof year === 'undefined') {
      return {};
    }

    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < 1900) {
      throw new BadRequestException(
        `Parâmetro "year" inválido: ${year}. Informe um ano numérico.`,
      );
    }

    return { year: parsedYear };
  }

  private parsePagination(page?: string, perPage?: string) {
    const parsedPage = this.parsePositiveInteger(page, 1, 'page');
    const parsedPerPage = this.parsePositiveInteger(perPage, 50, 'perPage');

    if (parsedPerPage > 50) {
      throw new BadRequestException(
        'Parâmetro "perPage" deve ser menor ou igual a 50.',
      );
    }

    return { page: parsedPage, perPage: parsedPerPage };
  }

  private parsePositiveInteger(
    value: string | undefined,
    defaultValue: number,
    label: string,
  ) {
    if (typeof value === 'undefined') {
      return defaultValue;
    }

    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      throw new BadRequestException(
        `Parâmetro "${label}" inválido: ${value}. Informe um inteiro positivo.`,
      );
    }

    return parsedValue;
  }
}
