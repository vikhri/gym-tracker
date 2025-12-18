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
    const [activeTab, setActiveTab] = useState('workout');
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [currentWorkout, setCurrentWorkout] = useLocalStorage<Workout | Omit<Workout, 'id'>>(
        'currentWorkout',
        createNewWorkout()
    );

    useEffect(() => {
        if (!user) {
            setWorkouts([]);
            setExercises([]);
            setWeightEntries([]);
            return;
        }

        // Real-time synchronization for exercises
        const exercisesUnsub = db.collection('global-exercises').onSnapshot(snapshot => {
            const fetchedExercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
            setExercises(fetchedExercises.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
        });

        // Real-time synchronization for workouts
        const workoutsUnsub = db.collection('users').doc(user.uid).collection('workouts')
            .orderBy('date', 'desc').onSnapshot(snapshot => {
                const fetchedWorkouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
                setWorkouts(fetchedWorkouts);
            });

        // Real-time synchronization for weight entries
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
    
    const addWorkout = (workout: Omit<Workout, 'id'>) => {
        if (!user) return;
        db.collection('users').doc(user.uid).collection('workouts').add(workout);
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
        db.collection('global-exercises').add(exercise);
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
        showToast
    }), [workouts, exercises, user, weightEntries]);

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