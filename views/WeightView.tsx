
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import { format, subDays, isSameDay, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { WeightEntry } from '../types';

interface ChartDataPoint {
    label: string;
    value: number | null;
    fullDate: string;
}

const WeightChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    const [activePoint, setActivePoint] = useState<{ x: number; y: number; value: number; label: string; fullDate: string } | null>(null);

    const values = data.map(d => d.value).filter(v => v !== null) as number[];

    if (values.length === 0) {
        return <div className="text-center text-gray-500 py-10 font-medium">Нет данных для графика.</div>;
    }

    const PADDING = 40;
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 280;
    const VIEW_BOX_WIDTH = SVG_WIDTH;
    const VIEW_BOX_HEIGHT = SVG_HEIGHT;

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    let yMin = Math.floor(minValue - valueRange * 0.2);
    let yMax = Math.ceil(maxValue + valueRange * 0.2);
    
    if (yMin === yMax) {
        yMin -= 1;
        yMax += 1;
    }
    
    const yRange = yMax - yMin;
    const xStep = (VIEW_BOX_WIDTH - PADDING * 2) / (data.length - 1);
    
    const points = data.map((point, i) => {
        const x = PADDING + i * xStep;
        if (point.value === null) {
            return { x, y: null, value: null, label: point.label, fullDate: point.fullDate };
        }
        const y = VIEW_BOX_HEIGHT - PADDING - ((point.value - yMin) / yRange) * (VIEW_BOX_HEIGHT - PADDING * 2);
        return { x, y, value: point.value, label: point.label, fullDate: point.fullDate };
    });

    const path = points.reduce((pathString, p, i) => {
        if (p.y === null) return pathString;
        const prevPoint = i > 0 ? points[i - 1] : null;
        const command = prevPoint && prevPoint.y !== null ? 'L' : 'M';
        return `${pathString} ${command} ${p.x} ${p.y}`;
    }, '');

    const yAxisLabels = [yMin, yMax].filter((v, i, a) => a.indexOf(v) === i && !isNaN(v)).sort((a,b) => a - b);

    return (
        <svg 
            viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`} 
            className="w-full h-auto" 
            aria-labelledby="chart-title" 
            role="img"
            onClick={() => setActivePoint(null)}
        >
            <title id="chart-title">График изменения веса</title>
            {yAxisLabels.map(label => {
                const y = VIEW_BOX_HEIGHT - PADDING - ((label - yMin) / yRange) * (VIEW_BOX_HEIGHT - PADDING * 2);
                return (
                    <g key={label}>
                        <line x1={PADDING} y1={y} x2={VIEW_BOX_WIDTH - PADDING} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                        <text x={PADDING - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#9ca3af" fontWeight="bold">{label}</text>
                    </g>
                );
            })}
            
            {points.map((point, i) => {
                 if (i === 0 || i === points.length - 1 || (points.length > 5 && i % 3 === 0)) {
                    return (
                        <text key={i} x={point.x} y={VIEW_BOX_HEIGHT - PADDING + 20} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="bold">
                            {point.label}
                        </text>
                    );
                 }
                 return null;
            })}

            <path d={path} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {points.map((point, i) => (
                point.y !== null && point.value !== null && (
                    <g 
                        key={i} 
                        className="cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActivePoint({
                                x: point.x,
                                y: point.y!,
                                value: point.value!,
                                label: point.label,
                                fullDate: point.fullDate
                            });
                        }}
                    >
                        <circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                        <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
                    </g>
                )
            ))}

            {activePoint && (
                <g transform={`translate(${activePoint.x}, ${activePoint.y})`} className="pointer-events-none">
                    <rect x="-35" y="-45" width="70" height="35" rx="6" fill="#1f2937" />
                    <text x="0" y="-32" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{activePoint.fullDate}</text>
                    <text x="0" y="-20" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">{activePoint.value} кг</text>
                    <path d="M -5 -10 L 5 -10 L 0 -2 Z" fill="#1f2937" />
                </g>
            )}
        </svg>
    );
};


const WeightView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { weightEntries, addWeightEntry } = context;
    const [newWeight, setNewWeight] = useState('');
    const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');

    const todaysWeight = useMemo(() => {
        const today = new Date();
        const entry = weightEntries.find(e => isSameDay(new Date(e.date), today));
        return entry ? entry.weight : null;
    }, [weightEntries]);

    const weeklyAverage = useMemo(() => {
        const today = new Date();
        const sevenDaysAgo = subDays(today, 6);
        const recentEntries = weightEntries.filter(e => {
            const entryDate = new Date(e.date);
            return entryDate >= sevenDaysAgo && entryDate <= today;
        });
        if (recentEntries.length === 0) return null;
        const sum = recentEntries.reduce((acc, curr) => acc + curr.weight, 0);
        return (sum / recentEntries.length).toFixed(1);
    }, [weightEntries]);

    const handleSaveWeight = () => {
        const weightValue = parseFloat(newWeight);
        if (!isNaN(weightValue) && weightValue > 0 && newDate) {
            // Using the date as part of the ID prevents multiple entries for the same day
            addWeightEntry({ id: newDate, date: newDate, weight: weightValue });
            setNewWeight('');
        }
    };
    
    const chartData = useMemo<ChartDataPoint[]>(() => {
        const today = new Date();
        if (chartView === 'daily') {
            const dateArray = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));
            return dateArray.map(date => {
                const entry = weightEntries.find(e => isSameDay(new Date(e.date), date));
                return {
                    label: format(date, 'd MMM', { locale: ru }),
                    value: entry ? entry.weight : null,
                    fullDate: format(date, 'dd.MM.yy', { locale: ru }),
                };
            });
        } else { // weekly
            const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekStarts = Array.from({ length: 10 }, (_, i) => subWeeks(thisWeekStart, 9 - i));

            return weekStarts.map(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const entriesInWeek = weightEntries.filter(e => {
                    const entryDate = new Date(e.date);
                    return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
                });

                let average: number | null = null;
                if (entriesInWeek.length > 0) {
                    const sum = entriesInWeek.reduce((acc, curr) => acc + curr.weight, 0);
                    average = parseFloat((sum / entriesInWeek.length).toFixed(1));
                }
                
                return {
                    label: format(weekStart, 'd MMM', { locale: ru }),
                    value: average,
                    fullDate: `Неделя ${format(weekStart, 'dd.MM', { locale: ru })}`
                };
            });
        }
    }, [weightEntries, chartView]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Мой вес</h1>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-gray-100">
                    <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Сегодня</h2>
                    <p className="text-2xl font-black text-gray-800 mt-1">
                        {todaysWeight ? `${todaysWeight}` : '–'}<span className="text-sm ml-1 text-gray-400 font-bold">КГ</span>
                    </p>
                </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-gray-100">
                    <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Средний (7д)</h2>
                    <p className="text-2xl font-black text-gray-800 mt-1">
                        {weeklyAverage ? `${weeklyAverage}` : '–'}<span className="text-sm ml-1 text-gray-400 font-bold">КГ</span>
                    </p>
                </div>
            </div>

             <div className="bg-white p-4 rounded-lg shadow-sm space-y-3 border border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 uppercase">Новая запись</h2>
                 <div className="space-y-2">
                    <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 font-medium"
                    />
                    <div className="flex items-center gap-2">
                         <input
                            type="text"
                            inputMode="decimal"
                            value={newWeight}
                            onChange={(e) => {
                                const val = e.target.value.replace(',', '.');
                                if (/^\d*\.?\d*$/.test(val)) {
                                    setNewWeight(val);
                                }
                            }}
                            placeholder="Вес в кг"
                            className="w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 font-bold text-center"
                        />
                        <Button onClick={handleSaveWeight} disabled={!newWeight.trim() || !newDate} className="flex-shrink-0 w-auto px-6">
                            ОК
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4 border border-gray-100">
                <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold text-gray-900 uppercase">Динамика</h2>
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <button onClick={() => setChartView('daily')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${chartView === 'daily' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Дни</button>
                        <button onClick={() => setChartView('weekly')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${chartView === 'weekly' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Недели</button>
                    </div>
                </div>
                 <WeightChart data={chartData} />
            </div>

        </div>
    );
};

export default WeightView;
