
import React from 'react';

interface ToastProps {
    message: string | null;
}

const Toast: React.FC<ToastProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <div className="bg-green-600 text-white px-6 py-2 rounded-full shadow-lg font-medium text-sm transition-all transform translate-y-0 opacity-100">
                {message}
            </div>
        </div>
    );
};

export default Toast;
