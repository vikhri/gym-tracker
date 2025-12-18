import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import XIcon from '../components/icons/XIcon';
import { Exercise } from '../types';


const getCoefficientLabel = (coefficient?: 'x1' | 'x2' | 'gravitron') => {
    switch (coefficient) {
        case 'x2': return 'x2';
        case 'gravitron': return 'Гравитрон';
        case 'x1':
        default:
            return 'x1';
    }
};

const EditExerciseModal: React.FC<{
    exercise: Exercise;
    onSave: (exercise: Exercise) => void;
    onClose: () => void;
}> = ({ exercise, onSave, onClose }) => {
    const [name, setName] = useState(exercise.name);
    const [coefficient, setCoefficient] = useState(exercise.coefficient || 'x1');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave({ ...exercise, name: name.trim(), coefficient });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" aria-label="Закрыть">
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Редактировать упражнение</h2>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="edit-exercise-name" className="block text-sm font-medium text-gray-700">Название</label>
                        <input
                            id="edit-exercise-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="edit-exercise-coeff" className="block text-sm font-medium text-gray-700">Коэффициент</label>
                        <select
                            id="edit-exercise-coeff"
                            value={coefficient}
                            onChange={(e) => setCoefficient(e.target.value as 'x1' | 'x2' | 'gravitron')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        >
                            <option value="x1">x1</option>
                            <option value="x2">x2</option>
                            <option value="gravitron">Гравитрон</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                         <Button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400">Отмена</Button>
                        <Button type="submit">Сохранить</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ExercisesView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { exercises, addExercise, updateExercise, deleteExercise } = context;
    const [newExerciseName, setNewExerciseName] = useState('');
    const [newExerciseCoeff, setNewExerciseCoeff] = useState<'x1' | 'x2' | 'gravitron'>('x1');
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

    const handleAddExercise = () => {
        if (newExerciseName.trim() === '') return;
        addExercise({ name: newExerciseName.trim(), coefficient: newExerciseCoeff });
        setNewExerciseName('');
        setNewExerciseCoeff('x1');
    };

    const handleDeleteExercise = (exercise: Exercise) => {
         if (window.confirm(`Вы уверены, что хотите удалить упражнение "${exercise.name}"?`)) {
            deleteExercise(exercise.id);
        }
    };
    
    const handleSaveExercise = (exercise: Exercise) => {
        updateExercise(exercise);
        setEditingExercise(null);
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Упражнения</h1>
            
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Добавить новое упражнение</h2>
                 <div className="space-y-2">
                    <input
                        type="text"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        placeholder="Название упражнения"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    />
                     <select
                        value={newExerciseCoeff}
                        onChange={(e) => setNewExerciseCoeff(e.target.value as 'x1' | 'x2' | 'gravitron')}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        aria-label="Коэффициент"
                    >
                        <option value="x1">Коэффициент: x1 (стандартный)</option>
                        <option value="x2">Коэффициент: x2 (удвоенный)</option>
                        <option value="gravitron">Коэффициент: Гравитрон</option>
                    </select>
                </div>
                <Button onClick={handleAddExercise} disabled={!newExerciseName.trim()}>
                    Добавить упражнение
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                 <h2 className="text-lg font-semibold text-gray-900">Список упражнений</h2>
                <ul className="divide-y divide-gray-200">
                    {exercises.map((exercise) => (
                        <li key={exercise.id} className="py-3 flex justify-between items-center">
                            <div className="flex flex-col">
                                <div className="flex items-center">
                                    <span className="text-gray-800">{exercise.name}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1 ml-2 font-medium">
                                        {getCoefficientLabel(exercise.coefficient)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setEditingExercise(exercise)} className="text-blue-500 hover:text-blue-700 p-1" aria-label={`Редактировать ${exercise.name}`}>
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleDeleteExercise(exercise)} className="text-red-500 hover:text-red-700 p-1" aria-label={`Удалить ${exercise.name}`}>
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            {editingExercise && (
                <EditExerciseModal 
                    exercise={editingExercise}
                    onSave={handleSaveExercise}
                    onClose={() => setEditingExercise(null)}
                />
            )}
        </div>
    );
};

export default ExercisesView;