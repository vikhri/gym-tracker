import React, { useState, createContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import firebase from 'firebase/compat/app';
import { Workout, Exercise, WeightEntry } from './types';
import Layout from './components/Layout';
import WorkoutView from './views/WorkoutView';
import ExercisesView from './views/ExercisesView';
import HistoryView from './views/HistoryView';
import LoginView from './views/LoginView';
import useLocalStorage from './hooks/useLocalStorage';
import WeightView from './views/WeightView';
import Toast from './components/Toast';
import { offlineStorage } from './storage/offlineDb';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { syncService } from './services/syncService';

export const AppContext = createContext<{
    workouts: Workout[];
    addWorkout: (workout: Omit<Workout, 'id'>) => void;
    updateWorkout: (workout: Workout) => void;
    deleteWorkout: (id: string) => void;
    exercises: Exercise[];
    addExercise: (exercise: Omit<Exercise, 'id'>) => void;
    updateExercise: (exercise: Exercise) => void;
    deleteExercise: (id: string) => void;
    editWorkout: (workout: Workout | null) => void;
    weightEntries: WeightEntry[];
    addWeightEntry: (weightEntry: Omit<WeightEntry, 'id'>) => void;
    showToast: (message: string) => void;
    isOnline: boolean;
    syncData: () => Promise<void>;
} | null>(null);

function useAuth() {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return { user, loading };
}

const createNewWorkout = (): Omit<Workout, 'id'> => ({
    date: new Date().toISOString().split('T')[0],
    exercises: [],
});

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const isOnline = useNetworkStatus();
    const [activeTab, setActiveTab] = useState('workout');
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [currentWorkout, setCurrentWorkout] = useLocalStorage<Workout | Omit<Workout, 'id'>>(
        'currentWorkout',
        createNewWorkout()
    );

    const syncData = useCallback(async () => {
        if (!user || !isOnline) return;
        await syncService.processQueue(user.uid);
        showToast("Данные синхронизированы");
    }, [user, isOnline]);

    // Initial load from Offline Storage
    useEffect(() => {
        const loadOffline = async () => {
            const [offEx, offWorkouts] = await Promise.all([
                offlineStorage.getExercises(),
                offlineStorage.getRecentWorkouts(10) // Cache more than 3 for smoother history
            ]);
            if (offEx.length > 0) setExercises(offEx);
            if (offWorkouts.length > 0) setWorkouts(offWorkouts);
        };
        loadOffline();
    }, []);

    // Sync when online
    useEffect(() => {
        if (isOnline && user) {
            syncData();
        }
    }, [isOnline, user, syncData]);

    useEffect(() => {
        if (!user) {
            setWorkouts([]);
            setExercises([]);
            setWeightEntries([]);
            return;
        }

        const exercisesUnsub = db.collection('global-exercises').onSnapshot(async snapshot => {
            const fetchedExercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isSynced: true } as Exercise));
            const sorted = fetchedExercises.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
            setExercises(sorted);
            await offlineStorage.saveExercises(sorted);
        });

        const workoutsUnsub = db.collection('users').doc(user.uid).collection('workouts')
            .orderBy('date', 'desc').limit(15).onSnapshot(async snapshot => {
                const fetchedWorkouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isSynced: true } as Workout));
                setWorkouts(fetchedWorkouts);
                for (const w of fetchedWorkouts) {
                    await offlineStorage.saveWorkout(w);
                }
            });

        const weightUnsub = db.collection('users').doc(user.uid).collection('weightEntries')
            .orderBy('date', 'asc').onSnapshot(snapshot => {
                const fetchedWeights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightEntry));
                setWeightEntries(fetchedWeights);
            });

        return () => {
            exercisesUnsub();
            workoutsUnsub();
            weightUnsub();
        };
    }, [user]);

    const editWorkout = (workout: Workout | null) => {
        if (workout) setCurrentWorkout(workout);
        setActiveTab('workout');
    };

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 2000);
    };
    
    const addWorkout = async (workout: Omit<Workout, 'id'>) => {
        if (!user) return;
        const newId = crypto.randomUUID();
        const workoutWithId: Workout = { 
            ...workout, 
            id: newId, 
            isSynced: isOnline,
            createdAt: Date.now()
        };

        // Save local first
        await offlineStorage.saveWorkout(workoutWithId);
        setWorkouts(prev => [workoutWithId, ...prev]);

        if (isOnline) {
            try {
                const { isSynced, ...data } = workoutWithId;
                await db.collection('users').doc(user.uid).collection('workouts').doc(newId).set(data);
            } catch (e) {
                await offlineStorage.addToSyncQueue('CREATE_WORKOUT', workoutWithId);
            }
        } else {
            await offlineStorage.addToSyncQueue('CREATE_WORKOUT', workoutWithId);
        }
    }
    
    const updateWorkout = async (workout: Workout) => {
        if (!user) return;
        const updated = { ...workout, isSynced: isOnline };
        await offlineStorage.saveWorkout(updated);
        setWorkouts(prev => prev.map(w => w.id === workout.id ? updated : w));

        if (isOnline) {
            const { id, isSynced, ...workoutData } = updated;
            await db.collection('users').doc(user.uid).collection('workouts').doc(id).set(workoutData);
        }
    }
    
    const deleteWorkout = (id: string) => {
        if (!user) return;
        db.collection('users').doc(user.uid).collection('workouts').doc(id).delete();
        setWorkouts(prev => prev.filter(w => w.id !== id));
        // Note: Real offline deletion would need a separate queue
    }

    const addExercise = async (exercise: Omit<Exercise, 'id'>) => {
        const newId = crypto.randomUUID();
        const exerciseWithId: Exercise = { ...exercise, id: newId, isSynced: isOnline };
        
        setExercises(prev => [...prev, exerciseWithId].sort((a,b) => a.name.localeCompare(b.name, 'ru')));
        await offlineStorage.saveExercises([exerciseWithId]);

        if (isOnline) {
            try {
                await db.collection('global-exercises').add(exercise);
            } catch (e) {
                await offlineStorage.addToSyncQueue('CREATE_EXERCISE', exerciseWithId);
            }
        } else {
            await offlineStorage.addToSyncQueue('CREATE_EXERCISE', exerciseWithId);
        }
    }

    const updateExercise = (exercise: Exercise) => {
        const { id, ...exerciseData } = exercise;
        db.collection('global-exercises').doc(id).set(exerciseData, { merge: true });
    }
    
    const deleteExercise = (id: string) => {
        db.collection('global-exercises').doc(id).delete();
    }
    
    const addWeightEntry = (weightEntry: Omit<WeightEntry, 'id'>) => {
        if (!user) return;
        const existingEntry = weightEntries.find(entry => entry.date === weightEntry.date);
        if (existingEntry) {
            db.collection('users').doc(user.uid).collection('weightEntries').doc(existingEntry.id).set(weightEntry);
        } else {
            db.collection('users').doc(user.uid).collection('weightEntries').doc(weightEntry.date).set(weightEntry);
        }
    }

    const contextValue = useMemo(() => ({
        workouts,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        exercises,
        addExercise,
        updateExercise,
        deleteExercise,
        editWorkout,
        weightEntries,
        addWeightEntry,
        showToast,
        isOnline,
        syncData
    }), [workouts, exercises, user, weightEntries, isOnline, syncData]);

    const renderContent = () => {
        switch (activeTab) {
            case 'workout': return <WorkoutView currentWorkout={currentWorkout} setCurrentWorkout={setCurrentWorkout} />;
            case 'exercises': return <ExercisesView />;
            case 'history': return <HistoryView />;
            case 'weight': return <WeightView />;
            default: return <WorkoutView currentWorkout={currentWorkout} setCurrentWorkout={setCurrentWorkout} />;
        }
    };
    
    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Загрузка...</p></div>;
    }

    if (!user) return <LoginView />;

    return (
        <AppContext.Provider value={contextValue}>
            <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
                {renderContent()}
            </Layout>
            <Toast message={toastMessage} />
        </AppContext.Provider>
    );
};

export default App;