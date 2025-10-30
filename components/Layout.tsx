import React, { useState } from 'react';
import BurgerIcon from './icons/BurgerIcon';
import XIcon from './icons/XIcon';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-20">
            <div className="relative flex justify-between items-center h-16 px-4">
                 <button onClick={onMenuClick} className="text-gray-600 hover:text-gray-800 p-2" aria-label="Открыть меню">
                    <BurgerIcon className="w-6 h-6" />
                 </button>
                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="font-bold text-gray-900">Gym Tracker</span>
                 </div>
                 <div className="w-10 h-10"></div>
            </div>
        </header>
    );
};

const SideMenu: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}> = ({ isOpen, onClose, activeTab, setActiveTab }) => {
     const navItems = [
        { id: 'workout', label: 'Тренировка' },
        { id: 'exercises', label: 'Упражнения' },
        { id: 'history', label: 'Прошлые тренировки' },
    ];

    const handleNavClick = (tabId: string) => {
        setActiveTab(tabId);
        onClose();
    };

    return (
        <>
            {/* Оверлей */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Меню */}
            <div className={`fixed top-0 left-0 h-full bg-white w-64 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} role="dialog" aria-modal="true">
                <div className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-lg font-bold text-gray-800">Меню</h2>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-800 p-2" aria-label="Закрыть меню">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="mt-4">
                    <ul>
                        {navItems.map((item) => (
                             <li key={item.id}>
                                <button
                                    onClick={() => handleNavClick(item.id)}
                                    className={`w-full text-left p-4 text-md font-medium transition-colors duration-200 ${
                                        activeTab === item.id
                                            ? 'text-blue-600 bg-blue-50'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </>
    );
}


const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header onMenuClick={() => setIsMenuOpen(true)} />
             <SideMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
            <main className="flex-grow p-4 pt-20">
                {children}
            </main>
        </div>
    );
};

export default Layout;