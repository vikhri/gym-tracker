import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import TrashIcon from '../components/icons/TrashIcon';

const ExercisesView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { exercises, addExercise, deleteExercise } = context;
    const [newExerciseName, setNewExerciseName] = useState('');

    const handleAddExercise = () => {
        if (newExerciseName.trim() === '') return;
        addExercise({ name: newExerciseName.trim() });
        setNewExerciseName('');
    };

    const handleDeleteExercise = (id: string) => {
        deleteExercise(id);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Упражнения</h1>
            
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Добавить новое упражнение</h2>
                <input
                    type="text"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    placeholder="Название упражнения"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                />
                <Button onClick={handleAddExercise} disabled={!newExerciseName.trim()}>
                    Добавить упражнение
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                 <h2 className="text-lg font-semibold text-gray-900">Список упражнений</h2>
                <ul className="divide-y divide-gray-200">
                    {exercises.map((exercise) => (
                        <li key={exercise.id} className="py-3 flex justify-between items-center">
                            <span className="text-gray-800">{exercise.name}</span>
                            <button onClick={() => handleDeleteExercise(exercise.id)} className="text-red-500 hover:text-red-700">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ExercisesView;