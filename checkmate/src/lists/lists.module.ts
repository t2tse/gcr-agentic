import { Module } from '@nestjs/common';
import { ListsService } from './lists.service';
import { ListsController } from './lists.controller';
import { FirestoreModule } from '../firestore/firestore.module';

@Module({
    imports: [FirestoreModule],
    controllers: [ListsController],
    providers: [ListsService],
    exports: [ListsService]
})
export class ListsModule { }
