
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import { Workout, WorkoutExercise, Set, Exercise } from '../types';
import Button from '../components/Button';
import TrashIcon from '../components/icons/TrashIcon';
import PlusIcon from '../components/icons/PlusIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronUpIcon from '../components/icons/ChevronUpIcon';
import { format } from 'date-fns';
// FIX: The 'ru' locale should be imported from its specific module path in date-fns.
import { ru } from 'date-fns/locale/ru';

interface WorkoutViewProps {
    currentWorkout: Workout | Omit<Workout, 'id'>;
    setCurrentWorkout: (workout: Workout | Omit<Workout, 'id'>) => void;
}

const WorkoutView: React.FC<WorkoutViewProps> = ({ currentWorkout, setCurrentWorkout }) => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { workouts, addWorkout, updateWorkout, exercises } = context;

    const createNewWorkout = (): Omit<Workout, 'id'> => ({
        date: new Date().toISOString().split('T')[0],
        exercises: [],
    });

    const [selectedExercise, setSelectedExercise] = useState('');
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentWorkout({ ...currentWorkout, date: e.target.value });
    };

    const handleAddExercise = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const exerciseId = e.target.value;
        if (!exerciseId) return;

        const newExercise: WorkoutExercise = {
            id: crypto.randomUUID(),
            exerciseId: exerciseId,
            sets: [
                { id: crypto.randomUUID(), reps: 0, weight: 0 },
                { id: crypto.randomUUID(), reps: 0, weight: 0 },
                { id: crypto.randomUUID(), reps: 0, weight: 0 },
            ],
        };
        setCurrentWorkout({ ...currentWorkout, exercises: [...currentWorkout.exercises, newExercise] });
        setSelectedExercise(''); // Reset select to placeholder
        setExpandedExerciseId(newExercise.id);
    };

    const removeWorkoutExercise = (id: string) => {
        setCurrentWorkout({ ...currentWorkout, exercises: currentWorkout.exercises.filter((ex) => ex.id !== id) });
    };
    
    const toggleExpand = (id: string) => {
        setExpandedExerciseId(expandedExerciseId === id ? null : id);
    };

    const updateSet = (exerciseId: string, setId: string, field: 'reps' | 'weight', value: number) => {
        const updatedExercises = currentWorkout.exercises.map((ex) => {
            if (ex.id === exerciseId) {
                const updatedSets = ex.sets.map((set) => {
                    if (set.id === setId) {
                        return { ...set, [field]: value };
                    }
                    return set;
                });
                return { ...ex, sets: updatedSets };
            }
            return ex;
        });
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };
    
    const addSet = (exerciseId: string) => {
        const updatedExercises = currentWorkout.exercises.map((ex) => {
            if (ex.id === exerciseId) {
                const newSet: Set = { id: crypto.randomUUID(), reps: 0, weight: 0 };
                return { ...ex, sets: [...ex.sets, newSet] };
            }
            return ex;
        });
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    const removeSet = (exerciseId: string, setId: string) => {
        const updatedExercises = currentWorkout.exercises.map((ex) => {
            if (ex.id === exerciseId) {
                return { ...ex, sets: ex.sets.filter((set) => set.id !== setId) };
            }
            return ex;
        });
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    const saveWorkout = () => {
        if ('id' in currentWorkout) { // Editing existing workout
            updateWorkout(currentWorkout);
        } else { // Adding new workout
            addWorkout(currentWorkout);
        }
        setCurrentWorkout(createNewWorkout());
        setExpandedExerciseId(null);
    };
    
    const getExerciseName = (id: string) => exercises.find(e => e.id === id)?.name || 'Unknown Exercise';
    
    const isEditing = 'id' in currentWorkout;

    const PreviousWorkoutHint: React.FC<{ exerciseId: string }> = ({ exerciseId }) => {
        const lastWorkout = useMemo(() => {
            return workouts
                .filter(w => w.date < currentWorkout.date)
                .find(w => w.exercises.some(e => e.exerciseId === exerciseId));
        }, [exerciseId, workouts, currentWorkout.date]);

        if (!lastWorkout) return null;

        const lastExercise = lastWorkout.exercises.find(e => e.exerciseId === exerciseId);
        if (!lastExercise) return null;

        return (
            <div className="mt-2 text-xs text-gray-500">
                <p className="font-semibold">Прошлая тренировка ({format(new Date(lastWorkout.date), 'd MMM yyyy', { locale: ru })}):</p>
                <div className="flex flex-wrap gap-x-2">
                {lastExercise.sets.map((s, i) => (
                    <span key={i}>{s.weight} кг x {s.reps}</span>
                ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">{isEditing ? 'Редактировать тренировку' : 'Новая тренировка'}</h1>
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label htmlFor="workout-date" className="block text-sm font-medium text-gray-700">Дата</label>
                <input
                    type="date"
                    id="workout-date"
                    value={currentWorkout.date}
                    onChange={handleDateChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                />
            </div>

            {currentWorkout.exercises.map((woExercise) => (
                <div key={woExercise.id} className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(woExercise.id)}>
                        <h3 className="text-lg font-semibold text-gray-900">{getExerciseName(woExercise.exerciseId)}</h3>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeWorkoutExercise(woExercise.id);
                                }}
                                className="text-red-500 hover:text-red-700"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                            {expandedExerciseId === woExercise.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </div>
                    </div>

                    {expandedExerciseId === woExercise.id && (
                         <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                            <div className="grid grid-cols-3 gap-x-2 text-center text-sm font-medium text-gray-500">
                                <span>Сет</span>
                                <span>Повторения</span>
                                <span>Вес (кг)</span>
                            </div>
                            {woExercise.sets.map((set, setIndex) => (
                                <div key={set.id} className="grid grid-cols-3 gap-x-2 items-center">
                                    <span className="text-center font-medium text-gray-600">{setIndex + 1}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={set.reps || ''}
                                        onChange={(e) => updateSet(woExercise.id, set.id, 'reps', Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-full text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={set.weight || ''}
                                            onChange={(e) => updateSet(woExercise.id, set.id, 'weight', Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-full text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                                        />
                                        {woExercise.sets.length > 1 && (
                                            <button onClick={() => removeSet(woExercise.id, set.id)} className="text-gray-400 hover:text-gray-600">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => addSet(woExercise.id)} className="w-full text-blue-600 font-medium text-sm py-2 flex items-center justify-center gap-1 hover:bg-blue-50 rounded-lg">
                                <PlusIcon className="w-4 h-4"/>
                                Добавить сет
                            </button>
                            <PreviousWorkoutHint exerciseId={woExercise.exerciseId} />
                        </div>
                    )}
                </div>
            ))}
            
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Добавить упражнение</h3>
                <select
                    value={selectedExercise}
                    onChange={handleAddExercise}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                >
                    <option value="">Выберите упражнение</option>
                    {exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                </select>
            </div>

            <Button onClick={saveWorkout} disabled={currentWorkout.exercises.length === 0}>
                {isEditing ? 'Сохранить изменения' : 'Завершить тренировку'}
            </Button>
        </div>
    );
};

export default WorkoutView;
