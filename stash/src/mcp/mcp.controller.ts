import { Controller, Get, Post, All, Body, Req, Res, UseGuards, Query } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { AuthGuard } from '../auth/auth.guard';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';

@Controller('mcp')
@UseGuards(AuthGuard)
export class McpController {
    private readonly logger: Logger = createLogger(McpController.name);

    constructor(private readonly mcpService: McpService) { }

    @All()
    async handleRequest(@Req() req: any, @Res() res: Response) {
        this.logger.info(`MCP Request from user ${req.user.uid} for ${req.method} ${req.url}`);
        await this.mcpService.handleIncomingRequest(req, res, req.user.uid);
    }
}
