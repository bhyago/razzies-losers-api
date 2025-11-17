import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MoviesModule } from './movies.module';
import { DatabaseModule } from '@/infra/database/database.module';
import {
  DatabaseService,
  type MovieRecord,
} from '@/infra/database/database.service';

async function setupApplication(seed?: MovieRecord[]) {
  const moduleRef = await Test.createTestingModule({
    imports: [DatabaseModule, MoviesModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  if (seed) {
    const database = app.get(DatabaseService) as Record<string, unknown>;
    Reflect.set(database, 'movies', seed);
  }

  return { app, httpServer: app.getHttpServer() };
}

describe('MoviesController (integration)', () => {
  let app: INestApplication;
  let httpServer: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    ({ app, httpServer } = await setupApplication());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /movies', () => {
    it('deve ser capaz de listar filmes sem filtros', async () => {
      const response = await request(httpServer).get('/movies');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total: 206,
        page: 1,
        perPage: 50,
      });
      expect(response.body.items).toHaveLength(50);
      expect(response.body.items[0]).toEqual({
        year: 1980,
        title: "Can't Stop the Music",
        studios: ['Associated Film Distribution'],
        producers: ['Allan Carr'],
        winner: true,
      });
    });

    it('deve ser capaz de filtrar filmes por ano', async () => {
      const response = await request(httpServer)
        .get('/movies')
        .query({ year: 2014 });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(5);
      expect(response.body.items).toHaveLength(5);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            year: 2014,
            title: 'Left Behind',
            studios: ['Freestyle Releasing', 'Entertainment One'],
            producers: ['Michael Walker', 'Paul LaLonde'],
            winner: false,
          }),
          expect.objectContaining({
            year: 2014,
            title: 'Saving Christmas',
            studios: ['Samuel Goldwyn Films'],
            producers: [
              'Darren Doane',
              'Raphi Henley',
              'Amanda Rosser',
              'David Shannon',
            ],
            winner: true,
          }),
          expect.objectContaining({
            year: 2014,
            title: 'Teenage Mutant Ninja Turtles',
            studios: [
              'Paramount Pictures',
              'Nickelodeon Movies',
              'Platinum Dunes',
            ],
            producers: [
              'Michael Bay',
              'Ian Bryce',
              'Andrew Form',
              'Bradley Fuller',
              'Scott Mednick',
              'Galen Walker',
            ],
            winner: false,
          }),
          expect.objectContaining({
            year: 2014,
            title: 'The Legend of Hercules',
            studios: ['Summit Entertainment'],
            producers: [
              'Boaz Davidson',
              'Renny Harlin',
              'Danny Lerner',
              'Les Weldon',
            ],
            winner: false,
          }),
          expect.objectContaining({
            year: 2014,
            title: 'Transformers: Age of Extinction',
            studios: ['Paramount Pictures'],
            producers: [
              'Ian Bryce',
              'Tom DeSanto',
              'Lorenzo di Bonaventura',
              'Don Murphy',
            ],
            winner: false,
          }),
        ]),
      );
    });

    it('deve ser capaz de filtrar filmes pelo status de vencedor', async () => {
      const response = await request(httpServer)
        .get('/movies')
        .query({ winner: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(42);
      expect(response.body.items).toHaveLength(42);
      expect(response.body.items.at(0)).toEqual({
        year: 1980,
        title: "Can't Stop the Music",
        studios: ['Associated Film Distribution'],
        producers: ['Allan Carr'],
        winner: true,
      });
      expect(response.body.items.at(-1)).toEqual({
        year: 2019,
        title: 'Cats',
        studios: ['Universal Pictures'],
        producers: ['Debra Hayward', 'Tim Bevan', 'Eric Fellner', 'Tom Hooper'],
        winner: true,
      });
    });

    it('deve ser capaz de paginar os resultados da listagem', async () => {
      const response = await request(httpServer)
        .get('/movies')
        .query({ page: 2, perPage: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total: 206,
        page: 2,
        perPage: 10,
      });
      expect(response.body.items).toHaveLength(10);
      expect(response.body.items[0]).toEqual({
        year: 1981,
        title: 'Endless Love',
        studios: ['Universal Studios', 'PolyGram'],
        producers: ['Dyson Lovell'],
        winner: false,
      });
      expect(response.body.items.at(-1)).toEqual({
        year: 1982,
        title: 'The Pirate Movie',
        studios: ['20th Century Fox'],
        producers: ['David Joseph'],
        winner: false,
      });
    });

    it('deve ser capaz de rejeitar requisições com parâmetros inválidos', async () => {
      const response = await request(httpServer)
        .get('/movies')
        .query({ perPage: 200 });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Validation failed',
      });
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /movies/producers/intervals', () => {
    it('deve ser capaz de listar os intervalos mínimo e máximo de premiações consecutivas', async () => {
      const response = await request(httpServer).get(
        '/movies/producers/intervals',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        min: [
          {
            producer: 'Joel Silver',
            interval: 1,
            previousWin: 1990,
            followingWin: 1991,
          },
        ],
        max: [
          {
            producer: 'Matthew Vaughn',
            interval: 13,
            previousWin: 2002,
            followingWin: 2015,
          },
        ],
      });
    });

    it('deve ser capaz de calcular intervalos a partir de uma seed customizada', async () => {
      const customSeed: MovieRecord[] = [
        {
          year: 2000,
          title: 'Alpha',
          studios: 'Test Studios',
          producers: 'Alice',
          winner: true,
        },
        {
          year: 2001,
          title: 'Beta',
          studios: 'Test Studios',
          producers: 'Alice',
          winner: true,
        },
        {
          year: 2010,
          title: 'Gamma',
          studios: 'Test Studios',
          producers: 'Bob',
          winner: true,
        },
        {
          year: 2015,
          title: 'Delta',
          studios: 'Test Studios',
          producers: 'Bob',
          winner: true,
        },
        {
          year: 2030,
          title: 'Theta',
          studios: 'Test Studios',
          producers: 'Bob',
          winner: true,
        },
        {
          year: 2020,
          title: 'Zeta',
          studios: 'Test Studios',
          producers: 'Carol',
          winner: true,
        },
        {
          year: 2021,
          title: 'Eta',
          studios: 'Test Studios',
          producers: 'Carol',
          winner: true,
        },
      ];

      const { app: seededApp, httpServer: seededHttpServer } =
        await setupApplication(customSeed);

      try {
        const response = await request(seededHttpServer).get(
          '/movies/producers/intervals',
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          min: [
            {
              producer: 'Alice',
              interval: 1,
              previousWin: 2000,
              followingWin: 2001,
            },
            {
              producer: 'Carol',
              interval: 1,
              previousWin: 2020,
              followingWin: 2021,
            },
          ],
          max: [
            {
              producer: 'Bob',
              interval: 15,
              previousWin: 2015,
              followingWin: 2030,
            },
          ],
        });
      } finally {
        await seededApp.close();
      }
    });
  });
});
