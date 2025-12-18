
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

const KG_TO_LB = 2.20462;

const WorkoutView: React.FC<WorkoutViewProps> = ({ currentWorkout, setCurrentWorkout }) => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { workouts, addWorkout, updateWorkout, exercises, showToast } = context;

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
            weightUnit: 'kg',
            sets: [
                { id: crypto.randomUUID(), reps: 10, weight: 0 },
                { id: crypto.randomUUID(), reps: 10, weight: 0 },
                { id: crypto.randomUUID(), reps: 10, weight: 0 },
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

    const toggleUnit = (exerciseId: string) => {
        const updatedExercises = currentWorkout.exercises.map((ex) => {
            if (ex.id === exerciseId) {
                const isLb = ex.weightUnit === 'lb';
                // FIX: Explicitly type newUnit to match WorkoutExercise.weightUnit ('kg' | 'lb') to avoid 'string' widening error.
                const newUnit: 'kg' | 'lb' = isLb ? 'kg' : 'lb';
                const newSets = ex.sets.map(set => {
                    if (set.weight === null || set.weight === 0) return set;
                    const newWeight = isLb 
                        ? set.weight / KG_TO_LB // lb to kg
                        : set.weight * KG_TO_LB; // kg to lb
                    // Round to 1 decimal place
                    return { ...set, weight: Math.round(newWeight * 10) / 10 };
                });
                return { ...ex, weightUnit: newUnit, sets: newSets };
            }
            return ex;
        });
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    const updateSet = (exerciseId: string, setId: string, field: 'reps' | 'weight', value: number | null) => {
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
                const newSet: Set = { id: crypto.randomUUID(), reps: 10, weight: 0 };
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
        showToast("Тренировка сохранена");
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
        
        const lastUnit = lastExercise.weightUnit || 'kg';

        return (
            <div className="mt-2 text-xs text-gray-500">
                <p className="font-semibold">Прошлая тренировка ({format(new Date(lastWorkout.date), 'd MMM yyyy', { locale: ru })}):</p>
                <div className="flex flex-wrap gap-x-2">
                {lastExercise.sets.map((s, i) => {
                    const weight = s.weight ?? 0;
                    
                    let displayKg = 0;
                    let displayLb = 0;
                    
                    if (lastUnit === 'lb') {
                        displayLb = weight;
                        displayKg = weight / KG_TO_LB;
                    } else {
                        displayKg = weight;
                        displayLb = weight * KG_TO_LB;
                    }
                    
                    const kgStr = parseFloat(displayKg.toFixed(1));
                    const lbStr = Math.round(displayLb);
                    
                    return (
                        <span key={i}>{s.reps ?? 0} x {kgStr}кг ({lbStr} lbs){i < lastExercise.sets.length - 1 ? ',' : ''}</span>
                    );
                })}
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
                        <div className="flex items-center gap-3">
                             {expandedExerciseId === woExercise.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleUnit(woExercise.id); }}
                                    className="text-xs font-bold bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 border border-gray-300 transition-colors"
                                >
                                    {woExercise.weightUnit === 'lb' ? 'LBS' : 'KG'}
                                </button>
                            )}
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
                                <span>Вес ({woExercise.weightUnit === 'lb' ? 'lbs' : 'кг'})</span>
                            </div>
                            {woExercise.sets.map((set, setIndex) => (
                                <div key={set.id} className="grid grid-cols-3 gap-x-2 items-center">
                                    <span className="text-center font-medium text-gray-600">{setIndex + 1}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={set.reps ?? ''}
                                        onChange={(e) => {
                                            const sanitized = e.target.value.replace(/[^0-9]/g, '');
                                            updateSet(woExercise.id, set.id, 'reps', sanitized === '' ? null : Math.max(0, parseInt(sanitized, 10) || 0))
                                        }}
                                        className="w-full text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={set.weight ?? ''}
                                                onChange={(e) => {
                                                    const sanitized = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                                                    updateSet(woExercise.id, set.id, 'weight', sanitized === '' ? null : Math.max(0, parseFloat(sanitized) || 0))
                                                }}
                                                className={`w-full text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 ${woExercise.weightUnit === 'lb' ? 'pr-8' : ''}`}
                                            />
                                            {woExercise.weightUnit === 'lb' && (set.weight || 0) > 0 && (
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                                                    {((set.weight || 0) / KG_TO_LB).toFixed(1)}kg
                                                </span>
                                            )}
                                        </div>
                                        {woExercise.sets.length > 1 && (
                                            <button onClick={() => removeSet(woExercise.id, set.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
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
