import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { ListsModule } from './lists/lists.module';
import { HealthModule } from './health/health.module';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TasksModule,
    ListsModule,
    HealthModule,
  ],
})
export class AppModule { }
