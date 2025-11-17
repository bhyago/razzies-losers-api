import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import {
  ListMoviesDTO,
  ListMoviesSchemaValidation,
} from './dtos/list-movies-response.dto';
import {
  ProducersIntervalDTO,
  ProducersIntervalSchemaValidation,
} from './dtos/producer-interval-response.dto';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar filmes',
    description:
      'Lista filmes indicados ao Golden Raspberry Awards com filtros e paginação.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Filtra pelo ano da premiação.',
    example: 2015,
    schema: { type: 'integer', minimum: 1 },
  })
  @ApiQuery({
    name: 'winner',
    required: false,
    description:
      'Filtra por vencedores. Aceita true/false/1/0/yes/no (case-insensitive).',
    enum: ['true', 'false', '1', '0', 'yes', 'no'],
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Itens por página (1-50). Padrão: 50.',
    example: 20,
    schema: { type: 'integer', minimum: 1, maximum: 50 },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página (>= 1). Padrão: 1.',
    example: 1,
    schema: { type: 'integer', minimum: 1 },
  })
  @ApiOkResponse({
    description: 'Lista paginada recuperada com sucesso.',
    type: ListMoviesDTO.ListMoviesOutput,
  })
  @ApiBadRequestResponse({
    description: 'Parâmetros de consulta inválidos.',
  })
  async listMovies(
    @Query(new ZodValidationPipe(ListMoviesSchemaValidation.queryParams))
    query: ListMoviesDTO.ListMoviesQueryValidation,
  ): Promise<ListMoviesDTO.ListMoviesOutput> {
    return this.moviesService.findMany(query);
  }

  @Get('producers/intervals')
  @ApiOperation({
    summary: 'Intervalo de prêmios por produtor',
    description:
      'Retorna produtores com menor e maior intervalo entre vitórias consecutivas.',
  })
  @ApiOkResponse({
    description: 'Intervalos calculados com sucesso.',
    type: ProducersIntervalDTO.ProducersIntervalResponse,
  })
  getProducersIntervals(): ProducersIntervalDTO.ProducersIntervalResponse {
    const response = this.moviesService.getProducersAwardIntervals();
    return ProducersIntervalSchemaValidation.response.parse(response);
  }
}
