import { Controller, Get, Query } from '@nestjs/common';
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

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  async listMovies(
    @Query(new ZodValidationPipe(ListMoviesSchemaValidation.queryParams))
    query: ListMoviesDTO.ListMoviesQueryValidation,
  ): Promise<ListMoviesDTO.ListMoviesOutput> {
    return this.moviesService.findMany(query);
  }

  @Get('producers/intervals')
  getProducersIntervals(): ProducersIntervalDTO.ProducersIntervalResponse {
    const response = this.moviesService.getProducersAwardIntervals();
    return ProducersIntervalSchemaValidation.response.parse(response);
  }
}
