import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/checkmate/lists')
@UseGuards(AuthGuard)
export class ListsController {
    constructor(private readonly listsService: ListsService) { }

    @Post()
    create(@Request() req: any, @Body() createListDto: CreateListDto) {
        return this.listsService.create(req.user.uid, createListDto);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.listsService.findAll(req.user.uid);
    }

    @Get(':id')
    async findOne(@Request() req: any, @Param('id') id: string) {
        const list = await this.listsService.findOne(req.user.uid, id);
        if (!list) throw new NotFoundException();
        return list;
    }

    @Patch(':id')
    async update(@Request() req: any, @Param('id') id: string, @Body() updateListDto: UpdateListDto) {
        const list = await this.listsService.update(req.user.uid, id, updateListDto);
        if (!list) throw new NotFoundException();
        return list;
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.listsService.remove(req.user.uid, id);
    }

    @Delete(':id/tasks')
    clearTasks(@Request() req: any, @Param('id') id: string) {
        return this.listsService.clearTasks(req.user.uid, id);
    }
}
