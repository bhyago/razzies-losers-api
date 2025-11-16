import { MovieResponseDto } from './movie-response.dto';

export type ListMoviesResponseDto = {
  total: number;
  page: number;
  perPage: number;
  items: MovieResponseDto[];
};
