import { Module } from '@nestjs/common';
import { envSchema } from './env/env';
import { EnvModule } from './env/env.module';
import { AppLoggingInterceptor } from './logging/app-logging.interceptor';
import { StructuredLoggerService } from './logging/structured-logger.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
    EnvModule,
  ],
  providers: [
    StructuredLoggerService,
    { provide: APP_INTERCEPTOR, useClass: AppLoggingInterceptor },
  ],
})
export class AppModule {}
