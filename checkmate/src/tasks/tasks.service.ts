import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import * as admin from 'firebase-admin';
import { FirestoreDatabaseProvider } from '../firestore/firestore.providers';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
    private readonly logger: Logger = createLogger(TasksService.name);

    constructor(
        @Inject(FirestoreDatabaseProvider)
        private readonly firestore: admin.firestore.Firestore,
    ) { }

    private get collection() {
        return this.firestore.collection('checkmate_tasks');
    }

    async create(userId: string, createTaskDto: CreateTaskDto) {
        this.logger.info('create invoked');
        try {
            if (createTaskDto.listId) {
                const listDoc = await this.firestore.collection('checkmate_lists').doc(createTaskDto.listId).get();
                if (!listDoc.exists || listDoc.data()?.userId !== userId) {
                    throw new NotFoundException('List not found');
                }
            }

            const task = {
                ...createTaskDto,
                userId,
                status: 'todo',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            const docRef = await this.collection.add(task);
            const doc = await docRef.get();
            // Helper to serialize Timestamp
            const data = doc.data();
            return { id: doc.id, ...data };
        } catch (error) {
            this.logger.error('Error in create', error);
            throw error;
        }
    }

    async findAll(userId: string, listId?: string, status?: string) {
        this.logger.info('findAll invoked');
        try {
            let query = this.collection.where('userId', '==', userId);

            if (listId === 'inbox') {
                // Strict Inbox filtering: fetch all user tasks and filter in memory for missing listId
                // This avoids complex compound indexes for now
                const snapshot = await query.get();
                let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

                // Filter where listId is undefined, null, or empty string
                tasks = tasks.filter(t => !t.listId);

                if (status) {
                    tasks = tasks.filter(t => t.status === status);
                }
                return tasks;
            }

            if (listId) {
                query = query.where('listId', '==', listId);
            }
            if (status) {
                query = query.where('status', '==', status);
            }

            // Note: Complexity with ordering without indexes, so basic query first
            // In real app we would add .orderBy('createdAt') etc.

            const snapshot = await query.get();
            return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            this.logger.error('Error in findAll', error);
            throw error;
        }
    }

    async findOne(userId: string, id: string) {
        this.logger.info('findOne invoked');
        try {
            const doc = await this.collection.doc(id).get();
            if (!doc.exists) {
                throw new NotFoundException('Task not found');
            }
            const data = doc.data()!;
            if (data.userId !== userId) {
                throw new NotFoundException('Task not found'); // Hide existence
            }
            return { id: doc.id, ...data };
        } catch (error) {
            this.logger.error('Error in findOne', error);
            throw error;
        }
    }

    async update(userId: string, id: string, updateTaskDto: UpdateTaskDto) {
        this.logger.info('update invoked');
        try {
            const docRef = this.collection.doc(id);
            const doc = await docRef.get();
            if (!doc.exists) throw new NotFoundException('Task not found');
            if (doc.data()!.userId !== userId) throw new NotFoundException('Task not found');

            // Filter undefined values
            const updateData: Partial<UpdateTaskDto> = {};
            (Object.keys(updateTaskDto) as Array<keyof UpdateTaskDto>).forEach(key => {
                if (updateTaskDto[key] !== undefined) {
                    (updateData as any)[key] = updateTaskDto[key];
                }
            });

            await docRef.update(updateData);
            return { id, ...doc.data()!, ...updateData };
        } catch (error) {
            this.logger.error('Error in update', error);
            throw error;
        }
    }

    async remove(userId: string, id: string) {
        this.logger.info('remove invoked');
        try {
            const docRef = this.collection.doc(id);
            const doc = await docRef.get();
            if (!doc.exists) throw new NotFoundException('Task not found');
            if (doc.data()!.userId !== userId) throw new NotFoundException('Task not found');

            await docRef.delete();
            return { id };
        } catch (error) {
            this.logger.error('Error in remove', error);
            throw error;
        }
    }

    async getStats(userId: string) {
        this.logger.info('getStats invoked');
        try {
            const snapshot = await this.collection.where('userId', '==', userId).get();
            const tasks = snapshot.docs.map(d => d.data());
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'done').length;
            // Overdue logic requires date parsing which might be complex with simple strings
            // keeping it simple for now
            return { total, completed, remaining: total - completed };
        } catch (error) {
            this.logger.error('Error in getStats', error);
            throw error;
        }
    }
}
