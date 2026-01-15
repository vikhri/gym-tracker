
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import { format, subMonths, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

const KG_TO_LB = 2.20462;

interface StatsRow {
    date: string;
    maxWeight: number;
    reps: number;
    unit: string;
}

const StatsChart: React.FC<{ data: StatsRow[] }> = ({ data }) => {
    const [activePoint, setActivePoint] = useState<{ x: number; y: number; value: number; unit: string; date: string } | null>(null);

    // Sort data chronologically for the chart
    const chronData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    if (chronData.length === 0) {
        return <div className="text-center text-gray-500 py-10 font-medium">Нет данных для графика.</div>;
    }

    const PADDING_X = 50;
    const PADDING_Y = 40;
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 280;

    const values = chronData.map(d => {
        // Normalize to KG for scale calculation if units vary, but here we'll just use raw values
        // for simplicity unless user explicitly asks for normalization.
        return d.maxWeight;
    });

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    let yMin = Math.floor(minValue - (valueRange * 0.2 || 5));
    if (yMin < 0) yMin = 0;
    let yMax = Math.ceil(maxValue + (valueRange * 0.2 || 5));
    
    if (yMin === yMax) {
        yMin -= 1;
        yMax += 1;
    }
    
    const yRange = yMax - yMin;
    const xStep = (SVG_WIDTH - PADDING_X * 2) / Math.max(1, chronData.length - 1);
    
    const points = chronData.map((point, i) => {
        const x = PADDING_X + i * xStep;
        const y = SVG_HEIGHT - PADDING_Y - ((point.maxWeight - yMin) / yRange) * (SVG_HEIGHT - PADDING_Y * 2);
        return { x, y, value: point.maxWeight, unit: point.unit, date: point.date };
    });

    const path = points.reduce((pathString, p, i) => {
        const command = i === 0 ? 'M' : 'L';
        return `${pathString} ${command} ${p.x} ${p.y}`;
    }, '');

    const yAxisLabels = [yMin, yMax].filter((v, i, a) => a.indexOf(v) === i && !isNaN(v)).sort((a,b) => a - b);

    return (
        <div className="relative">
            <svg 
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
                className="w-full h-auto" 
                onClick={() => setActivePoint(null)}
            >
                {/* Horizontal grid lines and Y labels */}
                {yAxisLabels.map(label => {
                    const y = SVG_HEIGHT - PADDING_Y - ((label - yMin) / yRange) * (SVG_HEIGHT - PADDING_Y * 2);
                    return (
                        <g key={label}>
                            <line x1={PADDING_X} y1={y} x2={SVG_WIDTH - PADDING_X} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                            <text x={PADDING_X - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#9ca3af" fontWeight="bold">{label}</text>
                        </g>
                    );
                })}
                
                {/* X labels */}
                {points.map((point, i) => {
                    // Only show first, last and middle labels if too many
                    if (i === 0 || i === points.length - 1 || (points.length > 5 && i === Math.floor(points.length / 2))) {
                        return (
                            <text key={i} x={point.x} y={SVG_HEIGHT - PADDING_Y + 20} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="bold">
                                {format(parseISO(point.date), 'dd.MM')}
                            </text>
                        );
                    }
                    return null;
                })}

                {/* Line Path */}
                <path d={path} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-in fade-in duration-700" />

                {/* Data Points */}
                {points.map((point, i) => (
                    <g 
                        key={i} 
                        className="cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActivePoint(point);
                        }}
                    >
                        <circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                        <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
                    </g>
                ))}

                {/* Tooltip */}
                {activePoint && (
                    <g transform={`translate(${activePoint.x}, ${activePoint.y})`} className="pointer-events-none">
                        <rect x="-40" y="-45" width="80" height="35" rx="6" fill="#1f2937" />
                        <text x="0" y="-32" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                            {format(parseISO(activePoint.date), 'dd.MM.yy')}
                        </text>
                        <text x="0" y="-20" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">
                            {activePoint.value} {activePoint.unit === 'lb' ? 'lb' : 'кг'}
                        </text>
                        <path d="M -5 -10 L 5 -10 L 0 -2 Z" fill="#1f2937" />
                    </g>
                )}
            </svg>
        </div>
    );
};

const StatisticsView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { workouts, exercises } = context;

    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showResults, setShowResults] = useState(false);
    const [viewType, setViewType] = useState<'table' | 'chart'>('table');

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
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            <button 
                                onClick={() => setViewType('table')} 
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewType === 'table' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Таблица
                            </button>
                            <button 
                                onClick={() => setViewType('chart')} 
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewType === 'chart' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                График
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {viewType === 'table' ? (
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
                        ) : (
                            <div className="p-4">
                                <StatsChart data={statisticsData} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatisticsView;
