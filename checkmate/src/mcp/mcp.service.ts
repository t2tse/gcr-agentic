import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { ListsService } from '../lists/lists.service';
import { TasksService } from '../tasks/tasks.service';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import { Request, Response } from 'express';

@Injectable()
export class McpService implements OnModuleDestroy {
    private readonly logger: Logger = createLogger(McpService.name);
    private sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

    constructor(
        private readonly listsService: ListsService,
        private readonly tasksService: TasksService,
    ) { }

    onModuleDestroy() {
        this.sessions.clear();
    }

    async handleIncomingRequest(req: Request, res: Response, userId: string) {
        const sessionId = req.query.sessionId as string;
        this.logger.debug(`Handling MCP request for user ${userId}, session ${sessionId || 'new'}`);
        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.sessions.has(sessionId)) {
            this.logger.debug(`Reusing existing MCP session: ${sessionId}`);
            transport = this.sessions.get(sessionId)!.transport;
        } else {
            transport = new StreamableHTTPServerTransport();
            this.logger.debug(`Creating new MCP session: ${sessionId || 'new'}`);
            const server = new McpServer({
                name: 'Checkmate',
                version: '0.0.1',
                description: 'Checkmate provides users with a comprehensive interface to manage tasks, organized by lists (e.g., Personal, Work). It supports task creation, filtering, sorting, and status tracking.',
            });

            // --- List Tools ---
            server.registerTool(
                'create_list',
                {
                    description: 'Create a new user defined task list for the authenticated user',
                    inputSchema: { title: z.string(), icon: z.string().optional() }
                },
                async ({ title, icon }) => {
                    const list = await this.listsService.create(userId, { title, icon });
                    return { content: [{ type: 'text', text: JSON.stringify(list) }] };
                }
            );

            server.registerTool(
                'get_lists',
                {
                    description: 'Get all user defined task lists and the system default Inbox count for the authenticated user'
                },
                async () => {
                    const result = await this.listsService.findAll(userId);
                    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
                }
            );

            server.registerTool(
                'get_list',
                {
                    description: 'Get a specific user defined task list by List ID',
                    inputSchema: { id: z.string() }
                },
                async ({ id }) => {
                    const list = await this.listsService.findOne(userId, id);
                    if (!list) return { content: [{ type: 'text', text: 'List not found' }], isError: true };
                    return { content: [{ type: 'text', text: JSON.stringify(list) }] };
                }
            );

            server.registerTool(
                'update_list',
                {
                    description: 'Update a user defined task list by List ID',
                    inputSchema: { id: z.string(), title: z.string().optional(), icon: z.string().optional() }
                },
                async ({ id, title, icon }) => {
                    const list = await this.listsService.update(userId, id, { title, icon });
                    if (!list) return { content: [{ type: 'text', text: 'List not found or update failed' }], isError: true };
                    return { content: [{ type: 'text', text: JSON.stringify(list) }] };
                }
            );

            server.registerTool(
                'delete_list',
                {
                    description: 'Delete a user defined task list by List ID',
                    inputSchema: { id: z.string() }
                },
                async ({ id }) => {
                    await this.listsService.remove(userId, id);
                    return { content: [{ type: 'text', text: `List ${id} deleted` }] };
                }
            );

            server.registerTool(
                'clear_list_tasks',
                {
                    description: 'Clear all tasks in a user defined task list by List ID',
                    inputSchema: { listId: z.string() }
                },
                async ({ listId }) => {
                    await this.listsService.clearTasks(userId, listId);
                    return { content: [{ type: 'text', text: `Tasks cleared for list ${listId}` }] };
                }
            );

            // --- Task Tools ---
            server.registerTool(
                'create_task',
                {
                    description: 'Create a new task for the authenticated user. If no listId is provided, the task will be added to the system default Inbox.',
                    inputSchema: {
                        title: z.string(),
                        description: z.string().optional(),
                        listId: z.string().optional(),
                        priority: z.enum(['low', 'medium', 'high']).optional(),
                        dueDate: z.string().optional()
                    }
                },
                async (args) => {
                    const task = await this.tasksService.create(userId, args);
                    return { content: [{ type: 'text', text: JSON.stringify(task) }] };
                }
            );

            server.registerTool(
                'get_tasks',
                {
                    description: 'Get tasks for the authenticated user, optionally filtered by listId or status. Returns all tasks if no filters are provided. Only system default inbox tasks returned if listId = inbox',
                    inputSchema: { listId: z.string().optional(), status: z.string().optional() }
                },
                async ({ listId, status }) => {
                    const tasks = await this.tasksService.findAll(userId, listId, status);
                    return { content: [{ type: 'text', text: JSON.stringify(tasks) }] };
                }
            );

            server.registerTool(
                'get_task',
                {
                    description: 'Get a specific task by task ID',
                    inputSchema: { id: z.string() }
                },
                async ({ id }) => {
                    try {
                        const task = await this.tasksService.findOne(userId, id);
                        return { content: [{ type: 'text', text: JSON.stringify(task) }] };
                    } catch (e) {
                        return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
                    }
                }
            );

            server.registerTool(
                'update_task',
                {
                    description: 'Update a task and its properties by task ID',
                    inputSchema: {
                        id: z.string(),
                        title: z.string().optional(),
                        description: z.string().optional(),
                        listId: z.string().optional(),
                        priority: z.enum(['low', 'medium', 'high']).optional(),
                        status: z.enum(['todo', 'done']).optional(),
                        dueDate: z.string().optional()
                    }
                },
                async ({ id, ...updateDto }) => {
                    try {
                        const task = await this.tasksService.update(userId, id, updateDto);
                        return { content: [{ type: 'text', text: JSON.stringify(task) }] };
                    } catch (e) {
                        return { content: [{ type: 'text', text: 'Task not found or update failed' }], isError: true };
                    }
                }
            );

            server.registerTool(
                'delete_task',
                {
                    description: 'Delete a task by task ID',
                    inputSchema: { id: z.string() }
                },
                async ({ id }) => {
                    try {
                        await this.tasksService.remove(userId, id);
                        return { content: [{ type: 'text', text: `Task ${id} deleted` }] };
                    } catch (e) {
                        return { content: [{ type: 'text', text: 'Task not found or delete failed' }], isError: true };
                    }
                }
            );

            server.registerTool(
                'get_task_stats',
                { description: 'Get task statistics (Total Tasks, Completed, Remaining, and Overdue) for the authenticated user' },
                async () => {
                    const stats = await this.tasksService.getStats(userId);
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
