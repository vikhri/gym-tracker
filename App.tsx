
import React, { useState, createContext, useMemo, useEffect } from 'react';
import { auth, db } from './firebase';
// FIX: The User type is not a named export from 'firebase/compat/app'.
// It is available on the default-exported firebase namespace.
import firebase from 'firebase/compat/app';
import { Workout, Exercise, WeightEntry } from './types';
import Layout from './components/Layout';
import WorkoutView from './views/WorkoutView';
import ExercisesView from './views/ExercisesView';
import HistoryView from './views/HistoryView';
import LoginView from './views/LoginView';
import useLocalStorage from './hooks/useLocalStorage';
import WeightView from './views/WeightView';

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
    const [currentWorkout, setCurrentWorkout] = useLocalStorage<Workout | Omit<Workout, 'id'>>(
        'currentWorkout',
        createNewWorkout()
    );


    useEffect(() => {
        if (!user) {
            setWorkouts([]);
            setExercises([]);
            setWeightEntries([]);
            setCurrentWorkout(createNewWorkout());
            return;
        }

        const exercisesCollection = db.collection('global-exercises');
        const exercisesUnsub = exercisesCollection.onSnapshot(snapshot => {
            if (snapshot.empty) {
                const defaultExercises = [
                    { name: 'Bench Press', coefficient: 'x1' },
                    { name: 'Squat', coefficient: 'x1' },
                    { name: 'Deadlift', coefficient: 'x1' },
                    { name: 'Overhead Press', coefficient: 'x1' },
                ];
                const batch = db.batch();
                defaultExercises.forEach(ex => {
                    const docRef = exercisesCollection.doc();
                    batch.set(docRef, ex);
                });
                batch.commit();
            } else {
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
    }, [user, setCurrentWorkout]);

    const editWorkout = (workout: Workout | null) => {
        if (workout) {
            setCurrentWorkout(workout);
        }
        setActiveTab('workout');
    };
    
    // --- Firestore Functions ---
    
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
        db.collection('users').doc(user.uid).collection('weightEntries').add(weightEntry);
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
        addWeightEntry
    }), [workouts, exercises, user, weightEntries]);

    const startNewWorkout = () => {
        setCurrentWorkout(createNewWorkout());
        setActiveTab('workout');
    };

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
            <Layout activeTab={activeTab} setActiveTab={setActiveTab} startNewWorkout={startNewWorkout}>
                {renderContent()}
            </Layout>
        </AppContext.Provider>
    );
};

export default App;