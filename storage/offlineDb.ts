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
    };
    syncQueue: {
        key: string;
        value: SyncItem;
    };
}

const DB_NAME = 'gym-tracker-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GymDB>> | null = null;

export async function getDb(): Promise<IDBPDatabase<GymDB>> {
    if (!dbPromise) {
        dbPromise = openDB<GymDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('exercises')) {
                    db.createObjectStore('exercises', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('workouts')) {
                    db.createObjectStore('workouts', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
}

export async function saveExerciseOffline(exercise: Exercise) {
    const db = await getDb();
    await db.put('exercises', { ...exercise, updatedAt: Date.now() });
}

export async function saveWorkoutOffline(workout: Workout) {
    const db = await getDb();
    await db.put('workouts', { ...workout, createdAt: workout.createdAt || Date.now() });
}

export async function getOfflineExercises() {
    const db = await getDb();
    return db.getAll('exercises');
}

export async function getOfflineWorkouts() {
    const db = await getDb();
    const workouts = await db.getAll('workouts');
    return workouts.sort((a, b) => b.date.localeCompare(a.date));
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