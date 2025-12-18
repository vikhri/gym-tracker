
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import { format, subDays, parseISO, isSameDay, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';
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
        return <div className="text-center text-gray-500 py-10">Нет данных для построения графика.</div>;
    }

    const PADDING = 40;
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 300;
    const VIEW_BOX_WIDTH = SVG_WIDTH;
    const VIEW_BOX_HEIGHT = SVG_HEIGHT;

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    // Add some buffer to min/max for better visualization
    let yMin = Math.floor(minValue - valueRange * 0.1);
    let yMax = Math.ceil(maxValue + valueRange * 0.1);
    
    // Ensure we have a valid range even for a single value or constant values
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
        if (p.y === null) {
            return pathString;
        }
        const prevPoint = i > 0 ? points[i - 1] : null;
        const command = prevPoint && prevPoint.y !== null ? 'L' : 'M';
        return `${pathString} ${command} ${p.x} ${p.y}`;
    }, '');

    const yAxisLabels = [yMin, minValue, maxValue, yMax].filter((v, i, a) => a.indexOf(v) === i && !isNaN(v)).sort((a,b) => a - b);


    return (
        <svg 
            viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`} 
            className="w-full h-auto" 
            aria-labelledby="chart-title" 
            role="img"
            onClick={() => setActivePoint(null)}
        >
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
                 if (i === 0 || i === points.length - 1 || (points.length > 5 && i % 2 === 0 && i < points.length -1)) {
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
                point.y !== null && point.value !== null && (
                    <g 
                        key={i} 
                        className="cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            const pointData = {
                                x: point.x,
                                y: point.y!,
                                value: point.value!,
                                label: point.label,
                                fullDate: point.fullDate
                            };
                            setActivePoint(activePoint && activePoint.fullDate === point.fullDate ? null : pointData);
                        }}
                    >
                        <circle cx={point.x} cy={point.y} r="3" fill="#3b82f6" />
                        <circle cx={point.x} cy={point.y} r="10" fill="transparent" />
                        <title>{`${point.fullDate}\n${point.value} кг`}</title>
                    </g>
                )
            ))}

            {/* Tooltip */}
            {activePoint && (
                <g 
                    transform={`translate(${activePoint.x}, ${activePoint.y})`}
                    className="pointer-events-none"
                >
                    {(() => {
                        const dateText = activePoint.fullDate;
                        const weightText = `${activePoint.value} кг`;
                        const textLength = Math.max(dateText.length, weightText.length);
                        const width = textLength * 7 + 24;
                        const height = 40;
                        const arrowHeight = 5;
                        const yOffset = -(height + arrowHeight + 8);

                        return (
                            <g transform={`translate(0, ${yOffset})`}>
                                <rect 
                                    x={-width / 2} 
                                    y="0"
                                    width={width} 
                                    height={height} 
                                    rx="4" 
                                    fill="rgba(17, 24, 39, 0.9)"
                                />
                                <text 
                                    x="0" 
                                    y={height / 2}
                                    textAnchor="middle" 
                                    alignmentBaseline="middle" 
                                    fill="white" 
                                    fontSize="12"
                                    fontWeight="500"
                                >
                                    <tspan x="0" dy="-0.6em">{dateText}</tspan>
                                    <tspan x="0" dy="1.2em">{weightText}</tspan>
                                </text>
                                <path 
                                    d={`M -5 ${height} L 5 ${height} L 0 ${height + arrowHeight} Z`}
                                    fill="rgba(17, 24, 39, 0.9)"
                                />
                            </g>
                        );
                    })()}
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
    // Use local date format for the default value to avoid UTC "yesterday" issues
    const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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
        if (!isNaN(weightValue) && weightValue > 0 && newDate) {
            addWeightEntry({ date: newDate, weight: weightValue });
            setNewWeight('');
        }
    };
    
    const chartData = useMemo<ChartDataPoint[]>(() => {
        const today = new Date();
        if (chartView === 'daily') {
            const dateArray = Array.from({ length: 10 }, (_, i) => subDays(today, 9 - i));
            return dateArray.map(date => {
                const entry = weightEntries.find(e => isSameDay(parseISO(e.date), date));
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
                    const entryDate = parseISO(e.date);
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
                    fullDate: `Неделя с ${format(weekStart, 'dd.MM.yy', { locale: ru })}`
                };
            });
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
                 <div className="space-y-2">
                    <div>
                        <label htmlFor="weight-date" className="sr-only">Дата</label>
                        <input
                            id="weight-date"
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="weight-value" className="sr-only">Вес</label>
                         <input
                            id="weight-value"
                            type="text"
                            inputMode="decimal"
                            value={newWeight}
                            onChange={(e) => {
                                const val = e.target.value.replace(',', '.');
                                if (/^\d*\.?\d*$/.test(val)) {
                                    setNewWeight(val);
                                }
                            }}
                            placeholder="Введите вес, кг"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        />
                        <Button onClick={handleSaveWeight} disabled={!newWeight.trim() || !newDate} className="flex-shrink-0 w-auto">
                            Сохранить
                        </Button>
                    </div>
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