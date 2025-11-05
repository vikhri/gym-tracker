

import React, { useState, useEffect, useRef } from 'react';
import PlusIcon from './icons/PlusIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import XIcon from './icons/XIcon';
import BurgerIcon from './icons/BurgerIcon';
import DumbbellIcon from './icons/DumbbellIcon';

interface FabProps {
    setActiveTab: (tab: string) => void;
    startNewWorkout: () => void;
}

const FloatingActionButton: React.FC<FabProps> = ({ setActiveTab, startNewWorkout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const node = useRef<HTMLDivElement>(null);

    const handleNewWorkout = () => {
        startNewWorkout();
        setIsOpen(false);
    };

    const handleExercises = () => {
        setActiveTab('exercises');
        setIsOpen(false);
    };

    const handleHistory = () => {
        setActiveTab('history');
        setIsOpen(false);
    };


    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (node.current && node.current.contains(e.target as Node)) {
                return;
            }
            setIsOpen(false);
        };

        if (isOpen) {
            // A small timeout to prevent the same click that opened it from closing it
            setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const subButtonBaseStyle = "w-14 h-14 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out transform active:scale-95 absolute bottom-1 right-1";
    
    // Positions for buttons on a circular arc
    const distance = '6.5rem';
    // 6.5rem * cos(45deg) or sin(45deg)
    const diagonalDistance = '4.6rem'; 

    return (
        <div ref={node} className="fixed bottom-6 right-6 z-30">
            <div className="relative w-16 h-16">
                 {/* Exercises Button (Purple) - 90 degrees from top */}
                <button
                    onClick={handleExercises}
                    className={`${subButtonBaseStyle} bg-purple-500 hover:bg-purple-600`}
                     style={{ 
                        transitionDelay: isOpen ? '0.1s' : '0.2s',
                        transform: isOpen ? `translateX(-${distance})` : 'translate(0, 0)',
                        opacity: isOpen ? 1 : 0,
                        pointerEvents: isOpen ? 'auto' : 'none'
                    }}
                    aria-label="Упражнения"
                    tabIndex={isOpen ? 0 : -1}
                >
                    <DumbbellIcon className="w-7 h-7" />
                </button>
                
                {/* History Button (Blue) - 45 degrees from top */}
                <button
                    onClick={handleHistory}
                    className={`${subButtonBaseStyle} bg-blue-500 hover:bg-blue-600`}
                    style={{
                        transitionDelay: isOpen ? '0.2s' : '0.1s',
                        transform: isOpen ? `translate(-${diagonalDistance}, -${diagonalDistance})` : 'translate(0, 0)',
                        opacity: isOpen ? 1 : 0,
                        pointerEvents: isOpen ? 'auto' : 'none'
                    }}
                    aria-label="История тренировок"
                    tabIndex={isOpen ? 0 : -1}
                >
                    <ClipboardListIcon className="w-7 h-7" />
                </button>

                {/* New Workout Button (Green) - 0 degrees from top (straight up) */}
                <button
                    onClick={handleNewWorkout}
                    className={`${subButtonBaseStyle} bg-green-500 hover:bg-green-600`}
                    style={{ 
                        transitionDelay: isOpen ? '0.3s' : '0s',
                        transform: isOpen ? `translateY(-${distance})` : 'translate(0, 0)',
                        opacity: isOpen ? 1 : 0,
                        pointerEvents: isOpen ? 'auto' : 'none'
                    }}
                    aria-label="Новая тренировка"
                    tabIndex={isOpen ? 0 : -1}
                >
                    <PlusIcon className="w-7 h-7" />
                </button>
                
                {/* Main FAB */}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative w-16 h-16 bg-gray-800 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-transform transform active:scale-95 z-10"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    aria-label="Быстрое меню"
                >
                    <BurgerIcon className={`w-8 h-8 absolute transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 rotate-180 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
                    <XIcon className={`w-8 h-8 absolute transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-50'}`} />
                </button>
            </div>
        </div>
    );
};

export default FloatingActionButton;