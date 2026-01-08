import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { LinksModule } from '../links/links.module';

@Module({
    imports: [LinksModule],
    controllers: [McpController],
    providers: [McpService],
})
export class McpModule { }
