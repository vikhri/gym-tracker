
import React, { useState, useContext } from 'react';
import BurgerIcon from './icons/BurgerIcon';
import XIcon from './icons/XIcon';
import LogoutIcon from './icons/LogoutIcon';
import { auth } from '../firebase';
import DumbbellIcon from './icons/DumbbellIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import PlusIcon from './icons/PlusIcon';
import ScaleIcon from './icons/ScaleIcon';
import SyncIcon from './icons/SyncIcon';
import CheckIcon from './icons/CheckIcon';
import FloatingActionButton from './FloatingActionButton';
import { AppContext } from '../App';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const context = useContext(AppContext);
    
    return (
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-20">
            <div className="relative flex justify-between items-center h-16 px-4">
                 <button 
                    onClick={() => context?.syncData()} 
                    disabled={context?.isSyncing}
                    className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    aria-label="Синхронизировать"
                >
                    <SyncIcon className={`w-6 h-6 ${context?.isSyncing ? 'animate-spin' : ''}`} />
                    
                    {/* Status badges */}
                    {context?.syncSuccess ? (
                        <div className="absolute top-1.5 right-1.5 bg-white rounded-full">
                            <CheckIcon className="w-3.5 h-3.5 text-green-500 stroke-[4px]" />
                        </div>
                    ) : context?.hasPendingSync && !context?.isSyncing && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
                    )}
                 </button>
                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="font-bold text-gray-900">Gym Tracker</span>
                 </div>
                 <button onClick={onMenuClick} className="text-gray-600 hover:text-gray-800 p-2" aria-label="Открыть меню">
                    <BurgerIcon className="w-6 h-6" />
                 </button>
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
        { id: 'workout', label: 'Тренировка', icon: PlusIcon },
        { id: 'exercises', label: 'Упражнения', icon: DumbbellIcon },
        { id: 'history', label: 'История тренировок', icon: ClipboardListIcon },
        { id: 'weight', label: 'Мой вес', icon: ScaleIcon },
    ];

    const handleNavClick = (tabId: string) => {
        setActiveTab(tabId);
        onClose();
    };

    const handleLogout = () => {
        auth.signOut();
        onClose();
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>

            <div className={`fixed top-0 right-0 h-full bg-white w-64 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`} role="dialog" aria-modal="true">
                <div>
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
                                        className={`w-full text-left p-4 text-md font-medium transition-colors duration-200 flex items-center gap-4 ${
                                            activeTab === item.id
                                                ? 'text-blue-600 bg-blue-50'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-500'}`} />
                                        <span>{item.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
                <div className="mt-auto p-4 border-t border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-md font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-3 transition-colors duration-200"
                    >
                        <LogoutIcon className="w-5 h-5 text-gray-500" />
                        <span>Выйти</span>
                    </button>
                </div>
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
            <main className="flex-grow p-4 pt-20 pb-24">
                {children}
            </main>
            <FloatingActionButton setActiveTab={setActiveTab} />
        </div>
    );
};

export default Layout;
