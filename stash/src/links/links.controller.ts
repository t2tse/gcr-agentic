import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/stash/links')
@UseGuards(AuthGuard)
export class LinksController {
    constructor(private readonly linksService: LinksService) { }

    @Post()
    create(@Req() req: any, @Body() createLinkDto: CreateLinkDto) {
        return this.linksService.create(req.user.uid, createLinkDto);
    }

    @Get()
    findAll(@Req() req: any, @Query('tag') tag?: string) {
        return this.linksService.findAll(req.user.uid, tag);
    }

    @Get('stats')
    getStats(@Req() req: any) {
        return this.linksService.getStats(req.user.uid);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id') id: string) {
        return this.linksService.remove(req.user.uid, id);
    }
}
