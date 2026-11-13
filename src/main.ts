import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  const config = app.get(ConfigService);

  // Sécurité HTTP
  app.use(helmet());

  // CORS : origines listées dans CORS_ORIGINS, plus tout port localhost en développement
  // (ng serve prend un autre port quand 4200 est occupé).
  const originesAutorisees = config.get<string[]>('cors.origins') ?? [];
  const enDev = config.get<string>('nodeEnv') !== 'production';
  const localhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.enableCors({
    origin: (origin, callback) => {
      const autorisee =
        !origin || originesAutorisees.includes(origin) || (enDev && localhost.test(origin));
      callback(null, autorisee);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Préfixe global
  app.setGlobalPrefix('api');

  // Validation globale des DTOs (whitelist = rejette les champs inconnus)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filtre d'exceptions global
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`🚀 SOFARY API démarrée sur http://localhost:${port}/api`);
}

bootstrap();
