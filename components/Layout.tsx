import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Header = () => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-10">
            <div className="flex justify-center items-center h-16 px-4">
                 <h1 className="text-xl font-bold text-gray-800">Gym Tracker</h1>
            </div>
        </header>
    );
};


const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'workout', label: 'Тренировка' },
        { id: 'exercises', label: 'Упражнения' },
        { id: 'history', label: 'Прошлые тренировки' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-grow p-4 pb-24 pt-20">
                {children}
            </main>
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md">
                <nav className="flex justify-around items-center h-16">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex-1 text-center py-2 text-sm font-medium transition-colors duration-200 ${
                                activeTab === item.id
                                    ? 'text-blue-600 border-t-2 border-blue-600'
                                    : 'text-gray-500 hover:text-blue-500'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </footer>
        </div>
    );
};

export default Layout;