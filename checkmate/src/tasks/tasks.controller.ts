import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/checkmate/tasks')
@UseGuards(AuthGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    create(@Req() req: any, @Body() createTaskDto: CreateTaskDto) {
        return this.tasksService.create(req.user.uid, createTaskDto);
    }

    @Get()
    findAll(@Req() req: any, @Query('listId') listId?: string, @Query('status') status?: string) {
        return this.tasksService.findAll(req.user.uid, listId, status);
    }

    @Get('stats')
    getStats(@Req() req: any) {
        return this.tasksService.getStats(req.user.uid);
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.tasksService.findOne(req.user.uid, id);
    }

    @Patch(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
        return this.tasksService.update(req.user.uid, id, updateTaskDto);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id') id: string) {
        return this.tasksService.remove(req.user.uid, id);
    }
}
