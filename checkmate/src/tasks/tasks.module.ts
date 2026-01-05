import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { FirestoreModule } from '../firestore/firestore.module';

@Module({
    imports: [FirestoreModule],
    controllers: [TasksController],
    providers: [TasksService],
})
export class TasksModule { }
