import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import { Firestore } from 'firebase-admin/firestore';
import { FirestoreDatabaseProvider } from '../firestore/firestore.providers';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

export interface CheckmateList {
    id: string;
    userId: string;
    title: string;
    icon?: string;
    createdAt: string;
    taskCount?: number; // Populated aggregation
}

@Injectable()
export class ListsService {
    private readonly logger: Logger = createLogger(ListsService.name);
    private collectionName = 'checkmate_lists';

    constructor(
        @Inject(FirestoreDatabaseProvider)
        private readonly firestore: Firestore,
    ) { }

    async create(userId: string, createListDto: CreateListDto): Promise<CheckmateList> {
        this.logger.info('create invoked');
        try {
            const listData = {
                ...createListDto,
                userId,
                createdAt: new Date().toISOString(),
                taskCount: 0
            };

            const docRef = await this.firestore.collection(this.collectionName).add(listData);
            return { id: docRef.id, ...listData };
        } catch (error) {
            this.logger.error('Error in create', error);
            throw error;
        }
    }

    async findAll(userId: string): Promise<{ lists: CheckmateList[], inboxCount: number }> {
        this.logger.info('findAll invoked');
        try {
            const snapshot = await this.firestore
                .collection(this.collectionName)
                .where('userId', '==', userId)
                .get();

            const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CheckmateList))
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

            // Calculate task counts for each list
            // optimization: In a real app with many users/lists/tasks, we might want to store count on the list doc or specific stats doc.
            // For now, let's query counts. 
            // Actually, getting all tasks to count them is expensive. Let's do a simple count query per list or fetch all tasks (if small scale)
            // Given scalable constraints, let's just return 0 for now and let client fetch tasks? 
            // Or fetch all incomplete tasks for user and aggregate in memory (since user tasks < 1000 usually)

            const tasksSnapshot = await this.firestore.collection('checkmate_tasks')
                .where('userId', '==', userId)
                //.where('status', '!=', 'done') // Requires index
                .get();

            const countMap = new Map<string, number>();
            tasksSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.status === 'done') return;
                const listId = data.listId || 'inbox';
                countMap.set(listId, (countMap.get(listId) || 0) + 1);
            });

            const listsWithCounts = lists.map(list => ({
                ...list,
                taskCount: countMap.get(list.id) || 0
            }));

            return {
                lists: listsWithCounts,
                inboxCount: countMap.get('inbox') || 0
            };
        } catch (error) {
            this.logger.error('Error in findAll', error);
            throw error;
        }
    }

    async findOne(userId: string, id: string): Promise<CheckmateList | null> {
        this.logger.info('findOne invoked');
        try {
            const doc = await this.firestore.collection(this.collectionName).doc(id).get();
            if (!doc.exists) return null;
            const data = doc.data() as CheckmateList;
            if (data.userId !== userId) return null;
            return { ...data, id: doc.id };
        } catch (error) {
            this.logger.error('Error in findOne', error);
            throw error;
        }
    }

    async update(userId: string, id: string, updateListDto: UpdateListDto): Promise<CheckmateList | null> {
        this.logger.info('update invoked');
        try {
            const docRef = this.firestore.collection(this.collectionName).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.userId !== userId) {
                return null; // Or throw NotFoundException locally and let controller handle
            }

            await docRef.update({ ...updateListDto });
            const updated = await docRef.get();
            return { id: updated.id, ...updated.data() } as CheckmateList;
        } catch (error) {
            this.logger.error('Error in update', error);
            throw error;
        }
    }

    async remove(userId: string, id: string): Promise<void> {
        this.logger.info('remove invoked');
        try {
            const docRef = this.firestore.collection(this.collectionName).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.userId !== userId) {
                return;
            }

            // Ideally we should check if tasks exist and block delete or cascade delete.
            // implementing cascade delete for now (simple)
            const tasksSnapshot = await this.firestore.collection('checkmate_tasks').where('listId', '==', id).get();
            const batch = this.firestore.batch();
            batch.delete(docRef);
            tasksSnapshot.docs.forEach(t => batch.delete(t.ref));
            await batch.commit();
        } catch (error) {
            this.logger.error('Error in remove', error);
            throw error;
        }
    }

    async clearTasks(userId: string, listId: string): Promise<void> {
        this.logger.info('clearTasks invoked');
        try {
            // Verify owner
            const listDoc = await this.firestore.collection(this.collectionName).doc(listId).get();
            if (!listDoc.exists || listDoc.data()?.userId !== userId) {
                throw new Error('List not found'); // Should map to NotFound or Forbidden
            }

            const tasksSnapshot = await this.firestore.collection('checkmate_tasks').where('listId', '==', listId).get();
            const batch = this.firestore.batch();
            tasksSnapshot.docs.forEach(t => batch.delete(t.ref));
            await batch.commit();
        } catch (error) {
            this.logger.error('Error in clearTasks', error);
            throw error;
        }
    }
}
