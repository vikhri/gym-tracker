import { db } from '../firebase';
import { offlineStorage } from '../storage/offlineDb';

export const syncService = {
    async processQueue(userId: string) {
        const queue = await offlineStorage.getSyncQueue();
        if (queue.length === 0) return;

        for (const item of queue) {
            try {
                if (item.type === 'CREATE_WORKOUT') {
                    const { isSynced, ...data } = item.payload;
                    await db.collection('users').doc(userId).collection('workouts').doc(item.payload.id).set(data);
                } else if (item.type === 'CREATE_EXERCISE') {
                    const { isSynced, ...data } = item.payload;
                    await db.collection('global-exercises').add(data);
                }
                
                // Mark as synced in local DB
                const syncedPayload = { ...item.payload, isSynced: true };
                if (item.type === 'CREATE_WORKOUT') {
                    await offlineStorage.saveWorkout(syncedPayload);
                }
                
                await offlineStorage.removeFromSyncQueue(item.id);
            } catch (error) {
                console.error("Sync failed for item:", item.id, error);
            }
        }
    }
};