
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'accent' | 'secondary';
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'accent', children, className, ...props }) => {
    const baseClasses = 'w-full text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        accent: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-blue-200 text-blue-800 hover:bg-blue-300 focus:ring-blue-400',
    };

    return (
        <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;
