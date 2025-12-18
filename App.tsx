
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
    syncData: () => Promise<void>;
    hasPendingSync: boolean;
    isSyncing: boolean;
    syncSuccess: boolean;
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
    const [activeTab, setActiveTab] = useState('workout');
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    
    // Offline Caches
    const [cachedWorkouts, setCachedWorkouts] = useLocalStorage<Workout[]>('cachedWorkouts', []);
    const [cachedExercises, setCachedExercises] = useLocalStorage<Exercise[]>('cachedExercises', []);
    
    // Pending Changes for manual sync
    const [pendingWorkouts, setPendingWorkouts] = useLocalStorage<Omit<Workout, 'id'>[]>('pendingWorkouts', []);
    const [pendingExercises, setPendingExercises] = useLocalStorage<Omit<Exercise, 'id'>[]>('pendingExercises', []);
    const [pendingWeights, setPendingWeights] = useLocalStorage<Omit<WeightEntry, 'id'>[]>('pendingWeights', []);

    const [currentWorkout, setCurrentWorkout] = useLocalStorage<Workout | Omit<Workout, 'id'>>(
        'currentWorkout',
        createNewWorkout()
    );

    // Initial load from Firestore OR local cache if offline
    useEffect(() => {
        if (!user) {
            setWorkouts([]);
            setExercises([]);
            setWeightEntries([]);
            return;
        }

        // Use cached data immediately for a fast offline-first feel
        setExercises(cachedExercises);
        setWorkouts(cachedWorkouts);

        // Subscriptions to live data
        const exercisesCollection = db.collection('global-exercises');
        const exercisesUnsub = exercisesCollection.onSnapshot(snapshot => {
            if (!snapshot.empty) {
                const fetchedExercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
                const sortedExercises = fetchedExercises.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
                setExercises(sortedExercises);
            }
        });

        const workoutsCollection = db.collection('users').doc(user.uid).collection('workouts');
        const workoutsUnsub = workoutsCollection.orderBy('date', 'desc').onSnapshot(snapshot => {
            const fetchedWorkouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
            setWorkouts(fetchedWorkouts);
        });
        
        const weightCollection = db.collection('users').doc(user.uid).collection('weightEntries');
        const weightUnsub = weightCollection.orderBy('date', 'asc').onSnapshot(snapshot => {
            const fetchedWeights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightEntry));
            setWeightEntries(fetchedWeights);
        });

        return () => {
            exercisesUnsub();
            workoutsUnsub();
            weightUnsub();
        };
    }, [user]);

    const syncData = useCallback(async () => {
        if (!user) return;
        setIsSyncing(true);
        setSyncSuccess(false);
        try {
            // 1. Push pending changes to Firestore
            if (pendingWorkouts.length > 0) {
                const batch = db.batch();
                pendingWorkouts.forEach(w => {
                    const docRef = db.collection('users').doc(user.uid).collection('workouts').doc();
                    batch.set(docRef, w);
                });
                await batch.commit();
                setPendingWorkouts([]);
            }

            if (pendingExercises.length > 0) {
                const batch = db.batch();
                pendingExercises.forEach(e => {
                    const docRef = db.collection('global-exercises').doc();
                    batch.set(docRef, e);
                });
                await batch.commit();
                setPendingExercises([]);
            }

            if (pendingWeights.length > 0) {
                const batch = db.batch();
                pendingWeights.forEach(w => {
                    // Use date as ID to avoid duplicates on sync
                    const docRef = db.collection('users').doc(user.uid).collection('weightEntries').doc(w.date);
                    batch.set(docRef, w);
                });
                await batch.commit();
                setPendingWeights([]);
            }

            // 2. Fetch and Update local cache
            const exSnap = await db.collection('global-exercises').get();
            const allEx = exSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
            setCachedExercises(allEx.sort((a, b) => a.name.localeCompare(b.name, 'ru')));

            const woSnap = await db.collection('users').doc(user.uid).collection('workouts').orderBy('date', 'desc').limit(3).get();
            const top3Wo = woSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
            setCachedWorkouts(top3Wo);

            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 3000);
        } catch (error) {
            console.error("Sync error:", error);
            showToast("Ошибка синхронизации");
        } finally {
            setIsSyncing(false);
        }
    }, [user, pendingWorkouts, pendingExercises, pendingWeights, setCachedExercises, setCachedWorkouts, setPendingWorkouts, setPendingExercises, setPendingWeights]);

    const editWorkout = (workout: Workout | null) => {
        if (workout) {
            setCurrentWorkout(workout);
        }
        setActiveTab('workout');
    };

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => {
            setToastMessage(null);
        }, 2000);
    };
    
    // --- Data Handlers (Enhanced for Offline) ---
    
    const addWorkout = (workout: Omit<Workout, 'id'>) => {
        // Optimistic UI update
        const tempWorkout = { ...workout, id: 'temp-' + Date.now() } as Workout;
        setWorkouts(prev => [tempWorkout, ...prev]);
        
        // Save to pending and try background sync if online
        setPendingWorkouts(prev => [...prev, workout]);
        
        if (navigator.onLine && user) {
            db.collection('users').doc(user.uid).collection('workouts').add(workout)
                .then(() => setPendingWorkouts(prev => prev.filter(w => w !== workout)));
        }
    }
    
    const updateWorkout = (workout: Workout) => {
        if (!user) return;
        const { id, ...workoutData } = workout;
        db.collection('users').doc(user.uid).collection('workouts').doc(id).set(workoutData);
    }
    
    const deleteWorkout = (id: string) => {
        if (!user) return;
        db.collection('users').doc(user.uid).collection('workouts').doc(id).delete();
    }

    const addExercise = (exercise: Omit<Exercise, 'id'>) => {
        setPendingExercises(prev => [...prev, exercise]);
        if (navigator.onLine) {
            db.collection('global-exercises').add(exercise)
                .then(() => setPendingExercises(prev => prev.filter(e => e !== exercise)));
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
        setPendingWeights(prev => [...prev, weightEntry]);
        if (navigator.onLine && user) {
            db.collection('users').doc(user.uid).collection('weightEntries').doc(weightEntry.date).set(weightEntry)
                .then(() => setPendingWeights(prev => prev.filter(w => w !== weightEntry)));
        }
    }

    const hasPendingSync = useMemo(() => {
        return pendingWorkouts.length > 0 || pendingExercises.length > 0 || pendingWeights.length > 0;
    }, [pendingWorkouts, pendingExercises, pendingWeights]);

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
        syncData,
        hasPendingSync,
        isSyncing,
        syncSuccess
    }), [workouts, exercises, user, weightEntries, hasPendingSync, isSyncing, syncSuccess, syncData]);

    const renderContent = () => {
        switch (activeTab) {
            case 'workout':
                return <WorkoutView currentWorkout={currentWorkout} setCurrentWorkout={setCurrentWorkout} />;
            case 'exercises':
                return <ExercisesView />;
            case 'history':
                return <HistoryView />;
            case 'weight':
                return <WeightView />;
            default:
                return <WorkoutView currentWorkout={currentWorkout} setCurrentWorkout={setCurrentWorkout} />;
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Загрузка...</p>
            </div>
        );
    }

    if (!user) {
        return <LoginView />;
    }

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
