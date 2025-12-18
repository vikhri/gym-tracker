import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Workout, Exercise } from '../types';

export interface SyncItem {
    id: string;
    type: 'CREATE_EXERCISE' | 'CREATE_WORKOUT';
    payload: any;
    createdAt: number;
}

interface GymDB extends DBSchema {
    exercises: {
        key: string;
        value: Exercise;
    };
    workouts: {
        key: string;
        value: Workout;
    };
    syncQueue: {
        key: string;
        value: SyncItem;
    };
}

const DB_NAME = 'gym-tracker-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GymDB>>;

const getDb = () => {
    if (!dbPromise) {
        dbPromise = openDB<GymDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                db.createObjectStore('exercises', { keyPath: 'id' });
                db.createObjectStore('workouts', { keyPath: 'id' });
                db.createObjectStore('syncQueue', { keyPath: 'id' });
            },
        });
    }
    return dbPromise;
};

export const offlineStorage = {
    async saveExercises(exercises: Exercise[]) {
        const db = await getDb();
        const tx = db.transaction('exercises', 'readwrite');
        await Promise.all([
            ...exercises.map(ex => tx.store.put(ex)),
            tx.done
        ]);
    },

    async getExercises() {
        const db = await getDb();
        return db.getAll('exercises');
    },

    async saveWorkout(workout: Workout) {
        const db = await getDb();
        await db.put('workouts', { ...workout, createdAt: workout.createdAt || Date.now() });
    },

    async getRecentWorkouts(limit: number = 3) {
        const db = await getDb();
        const all = await db.getAll('workouts');
        return all
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, limit);
    },

    async addToSyncQueue(type: SyncItem['type'], payload: any) {
        const db = await getDb();
        const item: SyncItem = {
            id: crypto.randomUUID(),
            type,
            payload,
            createdAt: Date.now()
        };
        await db.put('syncQueue', item);
    },

    async getSyncQueue() {
        const db = await getDb();
        return db.getAll('syncQueue');
    },

    async removeFromSyncQueue(id: string) {
        const db = await getDb();
        await db.delete('syncQueue', id);
    }
};