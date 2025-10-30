import React, { useState, createContext, useMemo, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { Workout, Exercise } from './types';
import Layout from './components/Layout';
import WorkoutView from './views/WorkoutView';
import ExercisesView from './views/ExercisesView';
import HistoryView from './views/HistoryView';

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

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('workout');
    const [workouts, setWorkouts] = useLocalStorage<Workout[]>('workouts', []);
    const [exercises, setExercises] = useLocalStorage<Exercise[]>('exercises', []);
    const [workoutToEdit, setWorkoutToEdit] = useState<Workout | null>(null);

    // Seed default exercises if none exist in local storage
    useEffect(() => {
        if (exercises.length === 0) {
            const defaultExercises = [
                { id: crypto.randomUUID(), name: 'Bench Press' },
                { id: crypto.randomUUID(), name: 'Squat' },
                { id: crypto.randomUUID(), name: 'Deadlift' },
                { id: crypto.randomUUID(), name: 'Overhead Press' },
            ];
            setExercises(defaultExercises);
        }
    }, []);

    const editWorkout = (workout: Workout | null) => {
        setWorkoutToEdit(workout);
        setActiveTab('workout');
    };
    
    // --- Local Storage Functions ---
    
    const addWorkout = (workout: Omit<Workout, 'id'>) => {
        const newWorkout = { ...workout, id: crypto.randomUUID() };
        const sortedWorkouts = [...workouts, newWorkout].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setWorkouts(sortedWorkouts);
    }
    
    const updateWorkout = (workout: Workout) => {
        const updatedWorkouts = workouts.map(w => w.id === workout.id ? workout : w);
        const sortedWorkouts = updatedWorkouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setWorkouts(sortedWorkouts);
    }
    
    const deleteWorkout = (id: string) => {
        setWorkouts(workouts.filter(w => w.id !== id));
    }

    const addExercise = (exercise: Omit<Exercise, 'id'>) => {
        setExercises([...exercises, { ...exercise, id: crypto.randomUUID() }]);
    }
    
    const deleteExercise = (id: string) => {
         setExercises(exercises.filter(e => e.id !== id));
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
    }), [workouts, exercises]);

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

    return (
        <AppContext.Provider value={contextValue}>
            <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
                {renderContent()}
            </Layout>
        </AppContext.Provider>
    );
};

export default App;