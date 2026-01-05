import { Module } from '@nestjs/common';
import { FirestoreProvider, FirestoreDatabaseProvider } from './firestore.providers';

@Module({
    providers: [FirestoreProvider],
    exports: [FirestoreDatabaseProvider],
})
export class FirestoreModule { }
