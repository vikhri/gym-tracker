
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import { format, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

const KG_TO_LB = 2.20462;

interface StatsRow {
    date: string;
    maxWeight: number;
    reps: number;
    unit: string;
}

const StatisticsView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { workouts, exercises } = context;

    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showResults, setShowResults] = useState(false);

    const statisticsData = useMemo(() => {
        if (!showResults || !selectedExerciseId) return [];

        const filteredWorkouts = workouts.filter(w => 
            w.date >= startDate && w.date <= endDate
        ).sort((a, b) => b.date.localeCompare(a.date));

        const results: StatsRow[] = [];

        filteredWorkouts.forEach(workout => {
            const woExercise = workout.exercises.find(ex => ex.exerciseId === selectedExerciseId);
            if (woExercise && woExercise.sets.length > 0) {
                // Find max weight set
                let maxSet = woExercise.sets[0];
                let maxWeightInKg = (woExercise.weightUnit === 'lb') 
                    ? (maxSet.weight ?? 0) / KG_TO_LB 
                    : (maxSet.weight ?? 0);

                woExercise.sets.forEach(set => {
                    const weightInKg = (woExercise.weightUnit === 'lb') 
                        ? (set.weight ?? 0) / KG_TO_LB 
                        : (set.weight ?? 0);
                    
                    if (weightInKg > maxWeightInKg) {
                        maxWeightInKg = weightInKg;
                        maxSet = set;
                    } else if (weightInKg === maxWeightInKg && (set.reps ?? 0) > (maxSet.reps ?? 0)) {
                        // Tie breaker: more reps
                        maxSet = set;
                    }
                });

                results.push({
                    date: workout.date,
                    maxWeight: maxSet.weight ?? 0,
                    reps: maxSet.reps ?? 0,
                    unit: woExercise.weightUnit || 'kg'
                });
            }
        });

        return results;
    }, [workouts, selectedExerciseId, startDate, endDate, showResults]);

    const handleOk = () => {
        if (selectedExerciseId) {
            setShowResults(true);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Статистика</h1>

            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4 border border-gray-100">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Упражнение</label>
                    <select
                        value={selectedExerciseId}
                        onChange={(e) => {
                            setSelectedExerciseId(e.target.value);
                            setShowResults(false);
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 font-medium"
                    >
                        <option value="">Выберите упражнение...</option>
                        {exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">От</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setShowResults(false);
                            }}
                            className="w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">До</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setShowResults(false);
                            }}
                            className="w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 font-medium"
                        />
                    </div>
                </div>

                <Button onClick={handleOk} disabled={!selectedExerciseId}>
                    ОК
                </Button>
            </div>

            {showResults && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Дата</th>
                                <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Макс. вес</th>
                                <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Повт.</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {statisticsData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {format(new Date(row.date), 'dd.MM.yy')}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-bold text-blue-600">
                                        {row.maxWeight} <span className="text-[10px] text-gray-400 uppercase">{row.unit === 'lb' ? 'lb' : 'кг'}</span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                                        {row.reps}
                                    </td>
                                </tr>
                            ))}
                            {statisticsData.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                                        Нет записей за этот период
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StatisticsView;
