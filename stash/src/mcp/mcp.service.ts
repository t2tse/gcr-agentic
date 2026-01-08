import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { LinksService } from '../links/links.service';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import { Request, Response } from 'express';

@Injectable()
export class McpService implements OnModuleDestroy {
    private readonly logger: Logger = createLogger(McpService.name);
    private sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

    constructor(
        private readonly linksService: LinksService,
    ) { }

    onModuleDestroy() {
        this.sessions.clear();
    }

    async handleIncomingRequest(req: Request, res: Response, userId: string) {
        const sessionId = req.query.sessionId as string;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.sessions.has(sessionId)) {
            transport = this.sessions.get(sessionId)!.transport;
        } else {
            transport = new StreamableHTTPServerTransport();
            const server = new McpServer({
                name: 'Stash',
                version: '0.0.1',
                description: 'Stash allows users to save, categorize, and summarize web links. It leverages AI to automatically generate summaries and tags for saved content',
            });

            server.registerTool(
                'stash_link',
                {
                    description: 'Stash a new website link with option to automatically summarize and tag.',
                    inputSchema: {
                        url: z.string(),
                        generateSummary: z.boolean().optional(),
                        autoTag: z.boolean().optional()
                    }
                },
                async ({ url, generateSummary, autoTag }) => {
                    const link = await this.linksService.create(userId, { url, generateSummary, autoTag });
                    return { content: [{ type: 'text', text: JSON.stringify(link) }] };
                }
            );

            server.registerTool(
                'get_stashed_links',
                {
                    description: 'Get all stashed website links, optionally filtered by tag',
                    inputSchema: { tag: z.string().optional() }
                },
                async ({ tag }) => {
                    const links = await this.linksService.findAll(userId, tag);
                    return { content: [{ type: 'text', text: JSON.stringify(links) }] };
                }
            );

            server.registerTool(
                'delete_link',
                {
                    description: 'Delete a stashed website link',
                    inputSchema: { id: z.string() }
                },
                async ({ id }) => {
                    try {
                        await this.linksService.remove(userId, id);
                        return { content: [{ type: 'text', text: `Link ${id} deleted` }] };
                    } catch (e) {
                        return { content: [{ type: 'text', text: 'Link not found or delete failed' }], isError: true };
                    }
                }
            );

            server.registerTool(
                'get_stash_stats',
                { description: 'Get stash statistics for the authenticated user. Returns how many links stashed and how many are processed by AI' },
                async () => {
                    const stats = await this.linksService.getStats(userId);
                    return { content: [{ type: 'text', text: JSON.stringify(stats) }] };
                }
            );

            await server.connect(transport);
            if (transport.sessionId) {
                this.sessions.set(transport.sessionId, { server, transport });

                req.on('close', () => {
                    this.logger.info(`SSE connection closed for session ${transport.sessionId}`);
                    this.sessions.delete(transport.sessionId!);
                });
            }
        }

        await transport.handleRequest(req, res, req.body);
    }
}
