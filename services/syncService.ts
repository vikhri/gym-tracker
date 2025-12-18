import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import { getSyncQueue, removeFromSyncQueue, saveExerciseOffline, saveWorkoutOffline } from '../storage/offlineDb';

export async function syncOfflineData(userId: string) {
    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
        try {
            if (item.type === 'CREATE_EXERCISE') {
                const { isSynced, ...data } = item.payload;
                await db.collection('global-exercises').doc(item.payload.id).set(data);
                await saveExerciseOffline({ ...item.payload, isSynced: true });
            } else if (item.type === 'CREATE_WORKOUT') {
                const { isSynced, ...data } = item.payload;
                await db.collection('users').doc(userId).collection('workouts').doc(item.payload.id).set(data);
                await saveWorkoutOffline({ ...item.payload, isSynced: true });
            }
            await removeFromSyncQueue(item.id);
        } catch (error) {
            console.error('Failed to sync item:', item, error);
            // If it fails, we keep it in the queue for next retry
        }
    }
}