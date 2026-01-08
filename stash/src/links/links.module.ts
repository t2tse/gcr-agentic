import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { FirestoreModule } from '../firestore/firestore.module';
import { GeminiService } from '../gemini/gemini.service';

@Module({
    imports: [FirestoreModule],
    controllers: [LinksController],
    providers: [LinksService, GeminiService],
    exports: [LinksService],
})
export class LinksModule { }
