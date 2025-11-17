import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvService } from './env/env.service';
import { patchNestJsSwagger } from 'nestjs-zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  const configService = app.get(EnvService);

  app.setGlobalPrefix('razzies-losers-api');

  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,POST,PUT,PATCH,DELETE',
    allowedHeaders:
      'Content-Type,Accept, Authorization,Access-Control-Allow-Origin,x-access-token',
  });

  patchNestJsSwagger();
  const config = new DocumentBuilder()
    .setTitle('Razzies Losers API')
    .setDescription(
      [
        'API para consulta aos indicados e vencedores do Golden Raspberry Awards.',
        '- Dados carregados a partir do CSV e mantidos em memória.',
        '- Filtros por ano e flag de vencedor, com paginação configurável.',
        '- Rotas validadas com Zod; erros de validação retornam status 400.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addTag(
      'movies',
      'Consulta de filmes e intervalos de prêmios por produtor.',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document, {
    useGlobalPrefix: true,
  });

  const port = configService.get('PORT');
  await app.listen(port);
}
bootstrap();
