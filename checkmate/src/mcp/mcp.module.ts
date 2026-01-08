import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { ListsModule } from '../lists/lists.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
    imports: [ListsModule, TasksModule],
    controllers: [McpController],
    providers: [McpService],
})
export class McpModule { }
