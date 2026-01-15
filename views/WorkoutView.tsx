
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { Workout, WorkoutExercise, Set } from '../types';
import Button from '../components/Button';
import TrashIcon from '../components/icons/TrashIcon';
import PlusIcon from '../components/icons/PlusIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronUpIcon from '../components/icons/ChevronUpIcon';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

interface WorkoutViewProps {
    currentWorkout: Workout;
    setCurrentWorkout: (workout: Workout) => void;
}

const KG_TO_LB = 2.20462;

const WorkoutView: React.FC<WorkoutViewProps> = ({ currentWorkout, setCurrentWorkout }) => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { workouts, addWorkout, updateWorkout, exercises, showToast } = context;

    const createNewWorkout = (): Workout => ({
        id: crypto.randomUUID(),
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
        setSelectedExercise(''); 
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
                const newUnit: 'kg' | 'lb' = isLb ? 'kg' : 'lb';
                const newSets = ex.sets.map(set => {
                    if (set.weight === null || set.weight === 0) return set;
                    const newWeight = isLb 
                        ? set.weight / KG_TO_LB // lb to kg
                        : set.weight * KG_TO_LB; // kg to lb
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
        // Find if this workout already exists in the history (it has a server ID that isn't temporary)
        const isExisting = workouts.some(w => w.id === currentWorkout.id);
        
        if (isExisting) {
            updateWorkout(currentWorkout);
        } else {
            addWorkout(currentWorkout);
        }
        
        setCurrentWorkout(createNewWorkout());
        setExpandedExerciseId(null);
        showToast("Тренировка сохранена");
    };
    
    const getExerciseName = (id: string) => exercises.find(e => e.id === id)?.name || 'Удаленное упр.';
    
    const isEditing = workouts.some(w => w.id === currentWorkout.id);

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
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <p className="font-semibold mb-1">Ранее ({format(new Date(lastWorkout.date), 'd MMM', { locale: ru })}):</p>
                <div className="flex flex-wrap gap-x-2">
                {lastExercise.sets.map((s, i) => {
                    const weight = s.weight ?? 0;
                    let displayKg = lastUnit === 'lb' ? weight / KG_TO_LB : weight;
                    let displayLb = lastUnit === 'kg' ? weight * KG_TO_LB : weight;
                    
                    const kgStr = parseFloat(displayKg.toFixed(1));
                    const lbStr = Math.round(displayLb);
                    
                    return (
                        <span key={i} className="whitespace-nowrap">{s.reps ?? 0} x {kgStr}кг ({lbStr} lb){i < lastExercise.sets.length - 1 ? ',' : ''}</span>
                    );
                })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">{isEditing ? 'Редактировать тренировку' : 'Новая тренировка'}</h1>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <label htmlFor="workout-date" className="block text-sm font-medium text-gray-700">Дата тренировки</label>
                <input
                    type="date"
                    id="workout-date"
                    value={currentWorkout.date}
                    onChange={handleDateChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50"
                />
            </div>

            {currentWorkout.exercises.map((woExercise) => (
                <div key={woExercise.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(woExercise.id)}>
                        <h3 className="text-lg font-semibold text-gray-900 pr-2 truncate">{getExerciseName(woExercise.exerciseId)}</h3>
                        <div className="flex items-center gap-3">
                             {expandedExerciseId === woExercise.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleUnit(woExercise.id); }}
                                    className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 border border-blue-200 transition-colors uppercase"
                                >
                                    {woExercise.weightUnit === 'lb' ? 'LBS' : 'KG'}
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeWorkoutExercise(woExercise.id);
                                }}
                                className="text-red-400 hover:text-red-600 p-1"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                            <div className="text-gray-400">
                                {expandedExerciseId === woExercise.id ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                            </div>
                        </div>
                    </div>

                    {expandedExerciseId === woExercise.id && (
                         <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-in fade-in duration-200">
                            <div className="grid grid-cols-3 gap-x-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <span>Сет</span>
                                <span>Повт.</span>
                                <span>Вес ({woExercise.weightUnit === 'lb' ? 'lb' : 'кг'})</span>
                            </div>
                            {woExercise.sets.map((set, setIndex) => (
                                <div key={set.id} className="grid grid-cols-3 gap-x-2 items-center">
                                    <span className="text-center font-bold text-gray-400">{setIndex + 1}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={set.reps ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10));
                                            updateSet(woExercise.id, set.id, 'reps', val)
                                        }}
                                        className="w-full text-center rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 font-medium"
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={set.weight ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value.replace(',', '.')));
                                                    updateSet(woExercise.id, set.id, 'weight', val)
                                                }}
                                                className={`w-full text-center rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 font-medium ${woExercise.weightUnit === 'lb' ? 'pr-7' : ''}`}
                                            />
                                            {woExercise.weightUnit === 'lb' && (set.weight || 0) > 0 && (
                                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-gray-400 pointer-events-none font-bold">
                                                    KG
                                                </span>
                                            )}
                                        </div>
                                        {woExercise.sets.length > 1 && (
                                            <button onClick={() => removeSet(woExercise.id, set.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => addSet(woExercise.id)} className="w-full text-blue-600 font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 hover:bg-blue-50 rounded-lg transition-colors border border-dashed border-blue-200 mt-2">
                                <PlusIcon className="w-4 h-4"/>
                                ДОБАВИТЬ СЕТ
                            </button>
                            <PreviousWorkoutHint exerciseId={woExercise.exerciseId} />
                        </div>
                    )}
                </div>
            ))}
            
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Добавить упражнение</h3>
                <select
                    value={selectedExercise}
                    onChange={handleAddExercise}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 font-medium"
                >
                    <option value="">Выберите упражнение...</option>
                    {exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                </select>
            </div>

            <Button onClick={saveWorkout} disabled={currentWorkout.exercises.length === 0} className="shadow-lg py-4">
                {isEditing ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'ЗАВЕРШИТЬ ТРЕНИРОВКУ'}
            </Button>
        </div>
    );
};

export default WorkoutView;
