
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
        value: Exercise & { updatedAt: number };
    };
    workouts: {
        key: string;
        value: Workout & { createdAt: number };
        indexes: { 'by-date': string };
    };
    syncQueue: {
        key: string;
        value: SyncItem;
    };
}

const DB_NAME = 'gym-tracker-db';
const DB_VERSION = 2; // Bumped version to add index

let dbPromise: Promise<IDBPDatabase<GymDB>> | null = null;

export async function getDb(): Promise<IDBPDatabase<GymDB>> {
    if (!dbPromise) {
        dbPromise = openDB<GymDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    db.createObjectStore('exercises', { keyPath: 'id' });
                    const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
                    workoutStore.createIndex('by-date', 'date');
                    db.createObjectStore('syncQueue', { keyPath: 'id' });
                }
                if (oldVersion === 1) {
                    // Migration from 1 to 2: Add index to workouts if it doesn't exist
                    const workoutStore = db.transaction('workouts', 'readwrite').objectStore('workouts');
                    if (!workoutStore.indexNames.contains('by-date')) {
                        workoutStore.createIndex('by-date', 'date');
                    }
                }
            },
        });
    }
    return dbPromise;
}

export async function saveExerciseOffline(exercise: Exercise) {
    const db = await getDb();
    await db.put('exercises', { ...exercise, updatedAt: exercise.updatedAt || Date.now() });
}

export async function saveWorkoutOffline(workout: Workout) {
    const db = await getDb();
    await db.put('workouts', { ...workout, createdAt: workout.createdAt || Date.now() });
}

export async function getOfflineExercises() {
    const db = await getDb();
    return db.getAll('exercises');
}

export async function getOfflineWorkouts(limit?: number) {
    const db = await getDb();
    if (limit) {
        // Use index to get most recent
        const workouts: (Workout & { createdAt: number })[] = [];
        let cursor = await db.transaction('workouts').store.index('by-date').openCursor(null, 'prev');
        while (cursor && workouts.length < limit) {
            workouts.push(cursor.value);
            cursor = await cursor.continue();
        }
        return workouts;
    }
    return db.getAllFromIndex('workouts', 'by-date');
}

export async function addToSyncQueue(item: Omit<SyncItem, 'id' | 'createdAt'>) {
    const db = await getDb();
    const syncItem: SyncItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: Date.now()
    };
    await db.put('syncQueue', syncItem);
    return syncItem;
}

export async function getSyncQueue() {
    const db = await getDb();
    return db.getAll('syncQueue');
}

export async function removeFromSyncQueue(id: string) {
    const db = await getDb();
    await db.delete('syncQueue', id);
}
