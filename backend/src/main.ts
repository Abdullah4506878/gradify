import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());

  const allowedOrigins = ['http://localhost:3000', process.env.FRONTEND_URL].filter(
    (origin): origin is string => !!origin,
  );
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });


  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
