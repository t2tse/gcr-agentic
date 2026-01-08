import { Module } from '@nestjs/common';
import { LinksModule } from './links/links.module';
import { HealthModule } from './health/health.module';
import { McpModule } from './mcp/mcp.module';

import { ConfigModule } from '@nestjs/config';

import { AuthDiscoveryController } from './auth/auth-discovery.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LinksModule,
    HealthModule,
    McpModule,
  ],
  controllers: [AuthDiscoveryController],
})
export class AppModule { }
