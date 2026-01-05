import { FactoryProvider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const FirestoreDatabaseProvider = 'FIRESTORE_DB';

export const FirestoreProvider: FactoryProvider = {
    provide: FirestoreDatabaseProvider,
    useFactory: () => {
        if (!admin.apps.length) {
            admin.initializeApp({
                projectId: process.env.GCP_PROJECT_ID,
            });
        }
        const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
        const firestore = getFirestore(admin.app(), databaseId);
        firestore.settings({ ignoreUndefinedProperties: true });
        return firestore;
    },
};
