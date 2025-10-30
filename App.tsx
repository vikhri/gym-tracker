import React, { useState, createContext, useMemo, useEffect } from 'react';
import { auth, db } from './firebase';
import type { User } from 'firebase/compat/app';
import { Workout, Exercise } from './types';
import Layout from './components/Layout';
import WorkoutView from './views/WorkoutView';
import ExercisesView from './views/ExercisesView';
import HistoryView from './views/HistoryView';
import LoginView from './views/LoginView';

export const AppContext = createContext<{
    workouts: Workout[];
    addWorkout: (workout: Omit<Workout, 'id'>) => void;
    updateWorkout: (workout: Workout) => void;
    deleteWorkout: (id: string) => void;
    exercises: Exercise[];
    addExercise: (exercise: Omit<Exercise, 'id'>) => void;
    deleteExercise: (id: string) => void;
    editWorkout: (workout: Workout | null) => void;
} | null>(null);


function useAuth() {
    const [user, setUser] = useState<User | null>(null);
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


const App: React.FC = () => {
    const { user, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('workout');
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [workoutToEdit, setWorkoutToEdit] = useState<Workout | null>(null);

    useEffect(() => {
        if (!user) {
            setWorkouts([]);
            setExercises([]);
            return;
        }

        const exercisesCollection = db.collection('global-exercises');
        const exercisesUnsub = exercisesCollection.onSnapshot(snapshot => {
            if (snapshot.empty) {
                const defaultExercises = [
                    { name: 'Bench Press' },
                    { name: 'Squat' },
                    { name: 'Deadlift' },
                    { name: 'Overhead Press' },
                ];
                const batch = db.batch();
                defaultExercises.forEach(ex => {
                    const docRef = exercisesCollection.doc();
                    batch.set(docRef, ex);
                });
                batch.commit();
            } else {
                const fetchedExercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
                setExercises(fetchedExercises);
            }
        });

        const workoutsCollection = db.collection('users').doc(user.uid).collection('workouts');
        const workoutsUnsub = workoutsCollection.orderBy('date', 'desc').onSnapshot(snapshot => {
            const fetchedWorkouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
            setWorkouts(fetchedWorkouts);
        });

        return () => {
            exercisesUnsub();
            workoutsUnsub();
        };
    }, [user]);

    const editWorkout = (workout: Workout | null) => {
        setWorkoutToEdit(workout);
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
    
    const deleteExercise = (id: string) => {
         db.collection('global-exercises').doc(id).delete();
    }


    const contextValue = useMemo(() => ({
        workouts,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        exercises,
        addExercise,
        deleteExercise,
        editWorkout,
    }), [workouts, exercises, user]);

    const renderContent = () => {
        switch (activeTab) {
            case 'workout':
                return <WorkoutView workoutToEdit={workoutToEdit} setWorkoutToEdit={setWorkoutToEdit} />;
            case 'exercises':
                return <ExercisesView />;
            case 'history':
                return <HistoryView />;
            default:
                return <WorkoutView workoutToEdit={workoutToEdit} setWorkoutToEdit={setWorkoutToEdit} />;
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
        </AppContext.Provider>
    );
};

export default App;