import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import { format } from 'date-fns';
// FIX: The 'ru' locale should be imported from its specific module path in date-fns.
import { ru } from 'date-fns/locale/ru';
import { Workout, WorkoutExercise } from '../types';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronUpIcon from '../components/icons/ChevronUpIcon';

const HistoryView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { workouts, deleteWorkout: deleteWorkoutFromDB, exercises, editWorkout } = context;
    const [visibleCount, setVisibleCount] = useState(10);
    const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

    // Workouts are sorted by date from the App context state
    const sortedWorkouts = workouts;

    const groupedWorkouts = useMemo(() => {
        return sortedWorkouts.reduce((acc, workout) => {
            const date = new Date(workout.date);
            const monthYear = format(date, 'LLLL yyyy', { locale: ru });
            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
            acc[monthYear].push(workout);
            return acc;
        }, {} as Record<string, Workout[]>);
    }, [sortedWorkouts]);

    const getExerciseName = (id: string) => exercises.find(e => e.id === id)?.name || 'Unknown Exercise';

    const handleDeleteWorkout = (id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить эту тренировку?')) {
            deleteWorkoutFromDB(id);
        }
    };
    
    const handleEdit = (workout: Workout) => {
        editWorkout(workout);
    };

    const toggleExpand = (id: string) => {
        setExpandedWorkoutId(expandedWorkoutId === id ? null : id);
    };

    const calculateExerciseVolume = (exercise: WorkoutExercise): number => {
        return exercise.sets.reduce((total, set) => total + (set.reps * set.weight), 0);
    };

    const calculateWorkoutVolume = (workout: Workout): number => {
        return workout.exercises.reduce((total, ex) => total + calculateExerciseVolume(ex), 0);
    };

    const visibleWorkouts = sortedWorkouts.slice(0, visibleCount);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">История тренировок</h1>
            
            {Object.entries(groupedWorkouts).map(([monthYear, monthWorkouts]) => {
                const visibleInGroup = (monthWorkouts as Workout[]).filter(w => visibleWorkouts.some(vw => vw.id === w.id));
                if (visibleInGroup.length === 0) return null;

                return (
                    <div key={monthYear}>
                        <h2 className="text-lg font-semibold text-gray-600 capitalize mb-2 sticky top-16 bg-gray-50 py-2">{monthYear}</h2>
                        <div className="space-y-4">
                            {visibleInGroup.map((workout) => (
                                <div key={workout.id} className="bg-white p-4 rounded-lg shadow-sm">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(workout.id)}>
                                        <div>
                                            <p className="font-semibold text-gray-800">{format(new Date(workout.date), 'd MMMM, EEEE', { locale: ru })}</p>
                                            <p className="text-sm text-gray-500">{workout.exercises.length} упр. • Общий тоннаж: {calculateWorkoutVolume(workout).toLocaleString('ru-RU')} кг</p>
                                        </div>
                                        {expandedWorkoutId === workout.id ? <ChevronUpIcon/> : <ChevronDownIcon/>}
                                    </div>
                                    {expandedWorkoutId === workout.id && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                                            {workout.exercises.map(ex => (
                                                <div key={ex.id}>
                                                    <div className="flex justify-between items-baseline">
                                                        <h4 className="font-semibold text-gray-700">{getExerciseName(ex.exerciseId)}</h4>
                                                        <span className="text-sm font-medium text-gray-500">
                                                            {calculateExerciseVolume(ex).toLocaleString('ru-RU')} кг
                                                        </span>
                                                    </div>
                                                    <ul className="text-sm text-gray-600 list-disc list-inside pl-2">
                                                        {ex.sets.map(set => (
                                                            <li key={set.id}>{set.weight} кг x {set.reps} повторений</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-2">
                                                <Button variant="secondary" onClick={() => handleEdit(workout)}>Редактировать</Button>
                                                <Button variant="secondary" onClick={() => handleDeleteWorkout(workout.id)} className="bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-300">Удалить</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
            
            {workouts.length === 0 && (
                <p className="text-gray-500 text-center">У вас еще нет сохраненных тренировок.</p>
            )}

            {visibleCount < workouts.length && (
                <Button variant="secondary" onClick={() => setVisibleCount(visibleCount + 10)}>
                    Показать больше
                </Button>
            )}
        </div>
    );
};

export default HistoryView;