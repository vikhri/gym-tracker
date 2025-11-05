
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import { format, subDays, parseISO, isSameDay, startOfWeek, getISOWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { WeightEntry } from '../types';

interface ChartDataPoint {
    label: string;
    value: number;
}

const WeightChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    if (data.length < 2) {
        return <div className="text-center text-gray-500 py-10">Недостаточно данных для построения графика.</div>;
    }

    const PADDING = 40;
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 300;
    const VIEW_BOX_WIDTH = SVG_WIDTH;
    const VIEW_BOX_HEIGHT = SVG_HEIGHT;

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    // Add some buffer to min/max for better visualization
    const yMin = Math.floor(minValue - valueRange * 0.1);
    const yMax = Math.ceil(maxValue + valueRange * 0.1);
    const yRange = yMax - yMin;

    const xStep = (VIEW_BOX_WIDTH - PADDING * 2) / (data.length - 1);
    
    const points = data.map((point, i) => {
        const x = PADDING + i * xStep;
        const y = VIEW_BOX_HEIGHT - PADDING - ((point.value - yMin) / yRange) * (VIEW_BOX_HEIGHT - PADDING * 2);
        return { x, y, value: point.value, label: point.label };
    });

    const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');

    const yAxisLabels = [yMin, minValue, maxValue, yMax].filter((v, i, a) => a.indexOf(v) === i).sort((a,b) => a - b);


    return (
        <svg viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`} className="w-full h-auto" aria-labelledby="chart-title" role="img">
            <title id="chart-title">График изменения веса</title>
            
            {/* Y-axis grid lines and labels */}
            {yAxisLabels.map(label => {
                const y = VIEW_BOX_HEIGHT - PADDING - ((label - yMin) / yRange) * (VIEW_BOX_HEIGHT - PADDING * 2);
                return (
                    <g key={label}>
                        <line x1={PADDING} y1={y} x2={VIEW_BOX_WIDTH - PADDING} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                        <text x={PADDING - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#6b7280">{label}</text>
                    </g>
                );
            })}
            
             {/* X-axis labels */}
            {points.map((point, i) => {
                // Show label for first, last and some in between to avoid clutter
                 if (i === 0 || i === points.length - 1 || (points.length > 10 && i % Math.floor(points.length / 5) === 0)) {
                    return (
                        <text key={i} x={point.x} y={VIEW_BOX_HEIGHT - PADDING + 15} textAnchor="middle" fontSize="10" fill="#6b7280">
                            {point.label}
                        </text>
                    );
                 }
                 return null;
            })}

            {/* Line */}
            <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" />

            {/* Points */}
            {points.map((point, i) => (
                <g key={i}>
                    <circle cx={point.x} cy={point.y} r="3" fill="#3b82f6" />
                    <title>{`${point.label}: ${point.value} кг`}</title>
                </g>
            ))}
        </svg>
    );
};


const WeightView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { weightEntries, addWeightEntry } = context;
    const [newWeight, setNewWeight] = useState('');
    const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');

    const todaysWeight = useMemo(() => {
        const today = new Date();
        const entry = weightEntries.find(e => isSameDay(parseISO(e.date), today));
        return entry ? entry.weight : null;
    }, [weightEntries]);

    const weeklyAverage = useMemo(() => {
        const today = new Date();
        const sevenDaysAgo = subDays(today, 6);
        const recentEntries = weightEntries.filter(e => {
            const entryDate = parseISO(e.date);
            return entryDate >= sevenDaysAgo && entryDate <= today;
        });
        if (recentEntries.length === 0) return null;
        const sum = recentEntries.reduce((acc, curr) => acc + curr.weight, 0);
        return (sum / recentEntries.length).toFixed(1);
    }, [weightEntries]);

    const handleSaveWeight = () => {
        const weightValue = parseFloat(newWeight);
        if (!isNaN(weightValue) && weightValue > 0) {
            const today = new Date().toISOString().split('T')[0];
            const existingEntry = weightEntries.find(e => e.date === today);
            
            // For simplicity, we are adding a new entry.
            // A more robust solution might update an existing entry for the same day.
            addWeightEntry({ date: today, weight: weightValue });
            setNewWeight('');
        }
    };
    
    const chartData = useMemo<ChartDataPoint[]>(() => {
        if (chartView === 'daily') {
            return weightEntries.map(entry => ({
                label: format(parseISO(entry.date), 'd MMM', { locale: ru }),
                value: entry.weight
            }));
        } else {
            const weeklyData: { [week: number]: { sum: number, count: number, date: Date } } = {};
            weightEntries.forEach(entry => {
                const date = parseISO(entry.date);
                const week = getISOWeek(date);
                if (!weeklyData[week]) {
                    weeklyData[week] = { sum: 0, count: 0, date: startOfWeek(date, { weekStartsOn: 1 }) };
                }
                weeklyData[week].sum += entry.weight;
                weeklyData[week].count++;
            });

            return Object.values(weeklyData).map(week => ({
                label: format(week.date, 'd MMM', { locale: ru }),
                value: parseFloat((week.sum / week.count).toFixed(1))
            })).sort((a,b) => parseISO(a.label) - parseISO(b.label));
        }
    }, [weightEntries, chartView]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Мой вес</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <h2 className="text-sm font-medium text-gray-500">Текущий вес</h2>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                        {todaysWeight ? `${todaysWeight} кг` : '–'}
                    </p>
                </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <h2 className="text-sm font-medium text-gray-500">Средний за неделю</h2>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                        {weeklyAverage ? `${weeklyAverage} кг` : '–'}
                    </p>
                </div>
            </div>

             <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Добавить измерение</h2>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder="Введите вес, кг"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        step="0.1"
                        min="0"
                    />
                    <Button onClick={handleSaveWeight} disabled={!newWeight.trim()} className="flex-shrink-0 w-auto">
                        Сохранить
                    </Button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">График веса</h2>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setChartView('daily')} className={`px-3 py-1 text-sm rounded-md ${chartView === 'daily' ? 'bg-white shadow' : ''}`}>По дням</button>
                        <button onClick={() => setChartView('weekly')} className={`px-3 py-1 text-sm rounded-md ${chartView === 'weekly' ? 'bg-white shadow' : ''}`}>По неделям</button>
                    </div>
                </div>
                 <WeightChart data={chartData} />
            </div>

        </div>
    );
};

export default WeightView;
