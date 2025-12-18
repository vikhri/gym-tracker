import React, { useState, createContext, useMemo, useEffect } from 'react';
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
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { 
    getOfflineExercises, 
    getOfflineWorkouts, 
    saveExerciseOffline, 
    saveWorkoutOffline, 
    addToSyncQueue 
} from './storage/offlineDb';
import { syncOfflineData } from './services/syncService';

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
    sync: () => Promise<void>;
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
    const { user, loading: authLoading } = useAuth();
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

    const sync = async () => {
        if (user && isOnline) {
            await syncOfflineData(user.uid);
            showToast("Синхронизация завершена");
        }
    };

    useEffect(() => {
        if (isOnline && user) {
            sync();
        }
    }, [isOnline, user]);

    useEffect(() => {
        if (!user) {
            setWorkouts([]);
            setExercises([]);
            setWeightEntries([]);
            return;
        }

        const loadData = async () => {
            if (isOnline) {
                // Online: Load all exercises and last 3 workouts
                const exercisesSnapshot = await db.collection('global-exercises').get();
                const fetchedExercises = exercisesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isSynced: true } as Exercise));
                setExercises(fetchedExercises.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
                
                // Save all fetched exercises to IDB
                for (const ex of fetchedExercises) {
                    await saveExerciseOffline(ex);
                }

                const workoutsSnapshot = await db.collection('users').doc(user.uid).collection('workouts').orderBy('date', 'desc').limit(3).get();
                const fetchedWorkouts = workoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isSynced: true } as Workout));
                
                // Save all fetched workouts to IDB
                for (const w of fetchedWorkouts) {
                    await saveWorkoutOffline(w);
                }

                const allOfflineWorkouts = await getOfflineWorkouts();
                setWorkouts(allOfflineWorkouts);

            } else {
                // Offline: Load from IDB
                const offlineExercises = await getOfflineExercises();
                setExercises(offlineExercises.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
                
                const offlineWorkouts = await getOfflineWorkouts();
                setWorkouts(offlineWorkouts);
            }
        };

        loadData();

        // Keep real-time weight entries as they are lighter
        const weightCollection = db.collection('users').doc(user.uid).collection('weightEntries');
        const weightUnsub = weightCollection.orderBy('date', 'asc').onSnapshot(snapshot => {
            const fetchedWeights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightEntry));
            setWeightEntries(fetchedWeights);
        });

        return () => {
            weightUnsub();
        };
    }, [user, isOnline]);

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
    
    const addWorkout = async (workout: Omit<Workout, 'id'>) => {
        if (!user) return;
        const newId = crypto.randomUUID();
        const workoutWithId: Workout = { ...workout, id: newId, isSynced: isOnline, createdAt: Date.now() };
        
        await saveWorkoutOffline(workoutWithId);
        setWorkouts(prev => [workoutWithId, ...prev].sort((a, b) => b.date.localeCompare(a.date)));

        if (isOnline) {
            const { isSynced, ...data } = workoutWithId;
            await db.collection('users').doc(user.uid).collection('workouts').doc(newId).set(data);
        } else {
            await addToSyncQueue({ type: 'CREATE_WORKOUT', payload: workoutWithId });
        }
    }
    
    const updateWorkout = async (workout: Workout) => {
        if (!user) return;
        const updatedWorkout = { ...workout, isSynced: isOnline };
        await saveWorkoutOffline(updatedWorkout);
        setWorkouts(prev => prev.map(w => w.id === workout.id ? updatedWorkout : w));

        if (isOnline) {
            const { id, isSynced, ...workoutData } = updatedWorkout;
            await db.collection('users').doc(user.uid).collection('workouts').doc(id).set(workoutData);
        } else {
            // Ideally should check if it's already in sync queue to update payload, 
            // but user requested syncQueue for CREATE. We'll simplify and update offline only.
        }
    }
    
    const deleteWorkout = (id: string) => {
        if (!user) return;
        setWorkouts(prev => prev.filter(w => w.id !== id));
        if (isOnline) {
            db.collection('users').doc(user.uid).collection('workouts').doc(id).delete();
        }
        // In a full offline app we'd queue deletion too
    }

    const addExercise = async (exercise: Omit<Exercise, 'id'>) => {
        const newId = crypto.randomUUID();
        const exerciseWithId: Exercise = { ...exercise, id: newId, isSynced: isOnline, updatedAt: Date.now() };
        
        await saveExerciseOffline(exerciseWithId);
        setExercises(prev => [...prev, exerciseWithId].sort((a, b) => a.name.localeCompare(b.name, 'ru')));

        if (isOnline) {
            const { isSynced, ...data } = exerciseWithId;
            await db.collection('global-exercises').doc(newId).set(data);
        } else {
            await addToSyncQueue({ type: 'CREATE_EXERCISE', payload: exerciseWithId });
        }
    }

    const updateExercise = async (exercise: Exercise) => {
        const updatedExercise = { ...exercise, isSynced: isOnline, updatedAt: Date.now() };
        await saveExerciseOffline(updatedExercise);
        setExercises(prev => prev.map(ex => ex.id === exercise.id ? updatedExercise : ex));

        if (isOnline) {
            const { id, isSynced, ...exerciseData } = updatedExercise;
            await db.collection('global-exercises').doc(id).set(exerciseData, { merge: true });
        }
    }
    
    const deleteExercise = (id: string) => {
        setExercises(prev => prev.filter(ex => ex.id !== id));
        if (isOnline) {
            db.collection('global-exercises').doc(id).delete();
        }
    }
    
    const addWeightEntry = (weightEntry: Omit<WeightEntry, 'id'>) => {
        if (!user || !isOnline) return; // Weight entries remain online-mostly for now
        
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
        sync
    }), [workouts, exercises, user, weightEntries, isOnline]);

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
    
    if (authLoading) {
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