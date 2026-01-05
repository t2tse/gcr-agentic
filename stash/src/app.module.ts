import { Module } from '@nestjs/common';
import { LinksModule } from './links/links.module';
import { HealthModule } from './health/health.module';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LinksModule,
    HealthModule,
  ],
})
export class AppModule { }
